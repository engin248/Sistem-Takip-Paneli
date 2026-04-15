// ============================================================
// K1.2 — L0 GATEKEEPER
// Konum: src/core/control_engine.ts
// ============================================================
// Aksiyom: A3 (çelişki), A4 (veri doğrulama), A6 (izlenebilirlik)
// Hata kodları: ERR-STP001 ~ ERR-STP007
//
// ⚠️ SUPABASE_SERVICE_ROLE_KEY .env.local'da tanımsız.
//    Tüm DB işlemleri @/lib/supabase üzerinden yürür.
// ============================================================

import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase';
import { CommandContextSchema } from './types';
import type { CommandContext, L0Result } from './types';
import { z } from 'zod';

export type { CommandContext, L0Result };

export async function L0_GATEKEEPER(
  rawInput: string,
  context: CommandContext
): Promise<L0Result> {
  const timestamp = Date.now();

  // ── Zod context doğrulama ───────────────────────────────
  const parsed = CommandContextSchema.safeParse(context);
  if (!parsed.success) {
    throw new Error(`ERR-STP004: Context geçersiz — ${parsed.error.issues[0]?.message ?? 'bilinmeyen'}`);
  }

  // ── ADIM 1: Null / boş / kısa (A4) ─────────────────────
  if (!rawInput || rawInput.trim().length < 3) {
    throw new Error('ERR-STP001: Girdi geçersiz veya çok kısa (<3 karakter)');
  }

  // ── ADIM 2: Sanitization (injection koruması) ───────────
  const sanitized = rawInput
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/['";\\]/g, '')
    .trim();

  if (sanitized.length < 3) {
    throw new Error('ERR-STP003: Girdi sanitization sonrası geçersiz');
  }

  // ── ADIM 3: Yetki (A3) ──────────────────────────────────
  if (!context.isAuthorized) {
    throw new Error('ERR-STP002: Yetkisiz erişim');
  }

  // ── ADIM 4: Replay koruması ─────────────────────────────
  const { data: existing } = await supabase
    .from('commands')
    .select('id')
    .eq('nonce', context.nonce)
    .maybeSingle();

  if (existing) {
    throw new Error('ERR-STP006: Replay tespit — aynı nonce');
  }

  // ── ADIM 5: Hash (A6) ───────────────────────────────────
  const hash = createHash('sha256')
    .update(sanitized + context.nonce + timestamp)
    .digest('hex');

  // ── ADIM 6: DB kayıt (T1 — commands) ────────────────────
  const { data: command, error } = await supabase
    .from('commands')
    .insert({
      raw_text:  rawInput,
      channel:   context.channel,
      user_id:   context.userId,
      nonce:     context.nonce,
      hash,
      confirmed: !context.isVoice,
      status:    context.isVoice ? 'voice_pending' : 'received',
    })
    .select('id')
    .single();

  if (error || !command) {
    throw new Error('ERR-STP007: DB kayıt başarısız');
  }

  // ── ADIM 7: Immutable log (T10 — proof zinciri) ─────────
  // prev_hash: son kaydın hash'i alınarak zincir bütünlüğü sağlanır
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
    hash,
    prev_hash:  lastLog?.hash ?? '',
  });

  // ── ADIM 8: Ses → teyit bekle ───────────────────────────
  if (context.isVoice) {
    return {
      status:    'VOICE_PENDING_CONFIRM',
      commandId: command.id,
      hash,
      timestamp,
      channel:   context.channel,
    };
  }

  return {
    status:    'PROCEED',
    commandId: command.id,
    hash,
    timestamp,
    channel:   context.channel,
  };
}

// ============================================================
// BACKWARD COMPAT SHIMS
// Aşağıdaki fonksiyonlar 8 dosya tarafından import ediliyor:
//   api/telegram, api/notify, api/ollama, api/browser,
//   lib/validation, services/taskService, boardService, aiManager
// L0_GATEKEEPER async pipeline'a entegre edilene kadar korunur.
// ============================================================

export interface ControlResult {
  pass:   boolean;
  reason?: string;
  stage:  string;
  proof:  string;
}

/**
 * Sync null/empty/NaN filtresi — lightweight ön doğrulama.
 * 0 ve false geçerli veri sayılır.
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
    typeof data === 'object' && !Array.isArray(data) &&
    !(data instanceof Date) && !(data instanceof RegExp) &&
    !(data instanceof Map) && !(data instanceof Set) &&
    Object.keys(data as Record<string, unknown>).length === 0
  ) {
    return { pass: false, reason: 'empty_object', stage, proof: `[${stage}] REJECTED: empty_object` };
  }
  return { pass: true, stage, proof: `[${stage}] PASS` };
}

/**
 * Zod tabanlı strict kontrol — şema doğrulaması.
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
  return { pass: true, data: result.data, stage, proof: `[${stage}] PASS (ZOD)` };
}
