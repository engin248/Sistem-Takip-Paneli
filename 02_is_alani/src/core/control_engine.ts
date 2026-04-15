// ============================================================
// STP — L0 GATEKEEPER + CONTROL ALTYAPISI
// Konum: src/core/control_engine.ts
// ============================================================
// Export listesi:
//   L0_GATEKEEPER()  → Async, 9 adım, DB arşivli tam gatekeeper
//   CONTROL()        → Sync, lightweight null/empty/NaN kontrolü (shim)
//   STRICT_CONTROL() → Sync, Zod tabanlı tip doğrulama (shim)
// ============================================================

import { createHash } from 'crypto';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

// ─── TİP TANIMLARI ──────────────────────────────────────────

export interface CommandContext {
  userId: string;
  channel: 'telegram' | 'panel' | 'voice' | 'api';
  isAuthorized: boolean;
  role: 'admin' | 'operator' | 'viewer';
  scope: string[];
  nonce: string;           // Replay koruması
  isVoice: boolean;        // Ses mesajı mı?
  voiceConfirmed?: boolean; // Ses → kullanıcı onayladı mı? (voiceHandler.ts callback)
  transcript?: string;     // Ses transcript'i
}

export interface L0Result {
  status: 'PROCEED' | 'VOICE_PENDING_CONFIRM' | 'REJECTED';
  commandId: string;
  hash: string;
  timestamp: number;
  channel: string;
}

// ─── L0 GATEKEEPER (ANA FONKSİYON) ─────────────────────────

/**
 * V-FINAL DOKTRİNİ — L0 GATEKEEPER (K1.2)
 * Aksiyom: A3 (çelişki), A4 (veri doğrulama), A6 (izlenebilirlik)
 * Kurallar: G8, G11, G13, G14
 * Hata kodları: ERR-STP001 ~ ERR-STP010
 *
 * ⚠️ Bu katmanda 92 kriter ÇALIŞMAZ.
 *    92 kriter = K2.3 (HermAI analiz SONRASI)
 *    L0 sadece: null, yetki, replay, format, injection
 */
export async function L0_GATEKEEPER(
  rawInput: string,
  context: CommandContext
): Promise<L0Result> {

  const timestamp = Date.now();

  // ──────────────────────────────────────────
  // ADIM 1: Null / boş / kısa (A4)
  // ──────────────────────────────────────────
  if (!rawInput || rawInput.trim().length < 3) {
    throw new Error('ERR-STP001: Girdi geçersiz veya çok kısa (<3 karakter)');
  }

  // ──────────────────────────────────────────
  // ADIM 2: Input sanitization (injection koruması)
  // ──────────────────────────────────────────
  const sanitized = rawInput
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // XSS
    .replace(/['";\\]/g, '')                      // SQL injection
    .trim();

  if (sanitized.length < 3) {
    throw new Error('ERR-STP003: Girdi sanitization sonrası geçersiz');
  }

  // ──────────────────────────────────────────
  // ADIM 3: Yetki kontrolü (A3 — G11)
  // ──────────────────────────────────────────
  if (!context.isAuthorized) {
    throw new Error('ERR-STP002: Yetkisiz erişim — işlem reddedildi');
  }

  // ──────────────────────────────────────────
  // ADIM 4: Yetki KAPSAMI kontrolü (G12)
  // ──────────────────────────────────────────
  if (!context.scope || context.scope.length === 0) {
    throw new Error('ERR-STP004: Yetki kapsamı tanımsız');
  }

  // ──────────────────────────────────────────
  // ADIM 5: Replay koruması — nonce (G14)
  // ──────────────────────────────────────────
  if (!context.nonce) {
    throw new Error('ERR-STP005: Nonce eksik — replay riski');
  }

  const { data: existing } = await supabase
    .from('commands')
    .select('id')
    .eq('nonce', context.nonce)
    .maybeSingle();

  if (existing) {
    throw new Error('ERR-STP006: Replay tespit — aynı nonce kullanılmış');
  }

  // ──────────────────────────────────────────
  // ADIM 6: Hash üret (G13 — izlenebilirlik)
  // ──────────────────────────────────────────
  const hash = createHash('sha256')
    .update(sanitized + context.nonce + timestamp)
    .digest('hex');

  // ──────────────────────────────────────────
  // ADIM 7: Ham arşiv — HERMAI_INPUT_ARCHIVE (K1.5, A6)
  // ──────────────────────────────────────────
  // Ses ayrımı:
  //   isVoice=false            → text  → confirmed: true,  status: received
  //   isVoice=true + !confirmed → ham   → confirmed: false, status: voice_pending
  //   isVoice=true + confirmed  → onaylı ses → confirmed: true,  status: received
  const isConfirmed = !context.isVoice || (context.voiceConfirmed === true);
  const cmdStatus   = (!context.isVoice || context.voiceConfirmed) ? 'received' : 'voice_pending';

  const { data: command } = await supabase
    .from('commands')
    .insert({
      raw_text:  rawInput,
      channel:   context.channel,
      user_id:   context.userId,
      nonce:     context.nonce,
      hash:      hash,
      confirmed: isConfirmed,
      status:    cmdStatus,
    })
    .select('id')
    .single();

  if (!command) {
    throw new Error('ERR-STP007: Command DB kaydı başarısız');
  }

  // Ham girdi audit log — proof zinciri
  // prev_hash: DB'deki son kaydın hash'i alınarak zincir bütünlüğü sağlanır
  const { data: lastLog } = await supabase
    .from('immutable_logs')
    .select('hash')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from('immutable_logs').insert({
    module:     'K1',
    event_type: 'HERMAI_INPUT_ARCHIVE',
    severity:   'info',
    payload:    { rawInput, channel: context.channel, hash, nonce: context.nonce },
    hash:       hash,
    prev_hash:  lastLog?.hash ?? '', // zincir bağlantısı — ilk kayıtta boş
  });

  // ──────────────────────────────────────────
  // ADIM 8: Ses → teyit bekle (K1.3)
  // ──────────────────────────────────────────
  if (context.isVoice) {
    return {
      status: 'VOICE_PENDING_CONFIRM',
      commandId: command.id,
      hash: hash,
      timestamp: timestamp,
      channel: context.channel,
    };
    // DUR — /onayla callback'i gelene kadar pipeline ilerlemez
  }

  // ──────────────────────────────────────────
  // ADIM 9: Yazı → devam (K2'ye aktar)
  // ──────────────────────────────────────────
  return {
    status: 'PROCEED',
    commandId: command.id,
    hash: hash,
    timestamp: timestamp,
    channel: context.channel,
  };
}

// ============================================================
// BACKWARD COMPAT SHIMS
// api/telegram/route.ts ve api/notify/route.ts'deki
// CONTROL() çağrıları için — lightweight sync validator
// ============================================================

export interface ControlResult {
  pass: boolean;
  reason?: string;
  stage: string;
  proof: string;
}

/**
 * Generic sync kontrol — null, undefined, NaN, boş string/array/obje engeller.
 * 0 ve false geçerli veri sayılır.
 * Kullanım: payload doğrulama, ön filtre.
 */
export function CONTROL<T>(stage: string, data: T): ControlResult {
  if (data === null || data === undefined || (typeof data === 'number' && isNaN(data))) {
    return { pass: false, reason: 'no_data', stage, proof: `[${stage}] REJECTED: no_data` };
  }
  if (typeof data === 'string' && data.trim() === '') {
    return { pass: false, reason: 'empty_string', stage, proof: `[${stage}] REJECTED: empty_string` };
  }
  if (Array.isArray(data) && data.length === 0) {
    return { pass: false, reason: 'empty_array', stage, proof: `[${stage}] REJECTED: empty_array` };
  }
  if (
    typeof data === 'object' &&
    !Array.isArray(data) &&
    !(data instanceof Date) &&
    !(data instanceof RegExp) &&
    !(data instanceof Map) &&
    !(data instanceof Set) &&
    Object.keys(data as Record<string, unknown>).length === 0
  ) {
    return { pass: false, reason: 'empty_object', stage, proof: `[${stage}] REJECTED: empty_object` };
  }
  return { pass: true, stage, proof: `[${stage}] PASS: Valid data` };
}

/**
 * Zod tabanlı strict kontrol — tip güvenliği tam sağlanmadan ilerlenmez.
 */
export function STRICT_CONTROL<T>(
  stage: string,
  schema: z.ZodType<T>,
  data: unknown
): { pass: boolean; data?: T; reason?: string; stage: string; proof: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const reason = result.error.issues
      .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
      .join(' | ');
    return { pass: false, reason, stage, proof: `[${stage}] REJECTED (ZOD): ${reason}` };
  }
  return { pass: true, data: result.data, stage, proof: `[${stage}] PASS (ZOD): Schema validated` };
}
