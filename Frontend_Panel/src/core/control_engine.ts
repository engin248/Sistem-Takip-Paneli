// ============================================================
// K1.2 — L0 GATEKEEPER
// Konum: src/core/control_engine.ts
// ============================================================
// Aksiyom: A3 (çelişki), A4 (veri doğrulama), A6 (izlenebilirlik)
// Hata kodları: ERR-Sistem Takip Paneli001 ~ ERR-Sistem Takip Paneli009
//
// Kural #20  — Rate limit: 10 komut/dk/userId
// Kural #88  — Concurrent lock: aynı userId için paralel işlem yasak
// Kural #90  — Retry limiti SIFIR: aynı nonce tekrar reject
// Kural #44  — Local disk audit zorunlu
// ============================================================

import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase';
import { CommandContextSchema } from './types';
import type { CommandContext, L0Result } from './types';
import { z } from 'zod';
import { writeLocalAudit } from '@/lib/localAuditWriter';
import { enforceSanityAST } from './algorithms/semanticEngine';

export type { CommandContext, L0Result };

// ── Kural #20: Rate Limiter ─────────────────────────────────
const RATE_WINDOW_MS = 60_000; // 1 dakika
const RATE_LIMIT     = 10;     // max 10 komut/dk/userId
const _rateMap = new Map<string, number[]>();

function checkRateLimit(userId: string): void {
  const now   = Date.now();
  const times = (_rateMap.get(userId) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  if (times.length >= RATE_LIMIT) {
    throw new Error(`ERR-Sistem Takip Paneli008: Rate limit aşıldı — ${RATE_LIMIT} komut/dk (Kural #20)`);
  }
  times.push(now);
  _rateMap.set(userId, times);
}

// ── Kural #49: 3 Ardışık Hata → Otomatik Blok ─────────────────
const ERROR_BLOCK_MS  = 5 * 60_000; // 5 dk blok süresi
const MAX_ERRORS      = 3;           // 3 hata → blok
const _errorCountMap  = new Map<string, { count: number; since: number }>();

function checkErrorBlock(userId: string): void {
  const now    = Date.now();
  const record = _errorCountMap.get(userId);
  if (!record) return;

  // Süre aştı → sayacı sıfırla
  if (now - record.since > ERROR_BLOCK_MS) {
    _errorCountMap.delete(userId);
    return;
  }

  if (record.count >= MAX_ERRORS) {
    throw new Error(
      `ERR-Sistem Takip Paneli010: ${MAX_ERRORS} ardışık hata — userId ${userId} ${ERROR_BLOCK_MS / 60000} dk boyunca bloklandı (Kural #49)`
    );
  }
}

export function recordError(userId: string): void {
  const now    = Date.now();
  const record = _errorCountMap.get(userId);
  if (!record || now - record.since > ERROR_BLOCK_MS) {
    _errorCountMap.set(userId, { count: 1, since: now });
  } else {
    _errorCountMap.set(userId, { count: record.count + 1, since: record.since });
  }
}

export function clearErrorRecord(userId: string): void {
  _errorCountMap.delete(userId);
}

export async function L0_GATEKEEPER(
  rawInput: string,
  context: CommandContext
): Promise<L0Result> {
  const timestamp = Date.now();

  // ── Zod context doğrulama ───────────────────────────────
  const parsed = CommandContextSchema.safeParse(context);
  if (!parsed.success) {
    throw new Error(`ERR-Sistem Takip Paneli004: Context geçersiz — ${parsed.error.issues[0]?.message ?? 'bilinmeyen'}`);
  }

  // ── ADIM 0: Rate limit + Hata blok kontrolü (Kural #20 + #49) ─
  checkRateLimit(context.userId);
  checkErrorBlock(context.userId);

  // ── ADIM 1: Null / boş / kısa (A4) ─────────────────────
  if (!rawInput || rawInput.trim().length < 3) {
    throw new Error('ERR-Sistem Takip Paneli001: Girdi geçersiz veya çok kısa (<3 karakter)');
  }

  // ── ADIM 2: Sanitization (injection koruması) ───────────
  const sanitized = rawInput
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/['";\\]/g, '')
    .trim();

  if (sanitized.length < 3) {
    throw new Error('ERR-Sistem Takip Paneli003: Girdi sanitization sonrası geçersiz');
  }

  // ── ADIM 2.5: HERMAI MİMARİLİ ALGORİTMA ZIRHI (SEBEP-SONUÇ AÇIKLAMALI) ────────
  // Yapay Zekaların inisiyatif almasına engel olarak, harf ve bağlamı en baştan kilitler.
  const regexZirh = enforceSanityAST(sanitized);
  if (!regexZirh.isClean) {
       throw new Error(
         `ERR-Sistem Takip Paneli011: L0 Komut Kontrol Kapısından RET. 
Sebep: ${regexZirh.reason}. 
Açıklama: Sistemin kelime/harf düzenine ve bağlam bütünlüğüne müdahale veya yasaklı inisiyatif (silme/anlamsız döngü) tespit edildi. Sistem Takip Paneli Algoritma Devresi iptal etti.`
       );
  }

  // ── ADIM 3: Yetki (A3) ──────────────────────────────────
  if (!context.isAuthorized) {
    throw new Error('ERR-Sistem Takip Paneli002: Yetkisiz erişim');
  }

  // ── ADIM 4: Replay koruması (Kural #90) ─────────────────
  // H-03 FIX: commands tablosu yoksa graceful degradation — replay kontrolü atlanır
  try {
    const { data: existing } = await supabase
      .from('commands')
      .select('id')
      .eq('nonce', context.nonce)
      .maybeSingle();

    if (existing) {
      throw new Error('ERR-Sistem Takip Paneli006: Replay tespit — aynı nonce (Kural #90 retry=0)');
    }

    // ── ADIM 4b: Concurrent lock (Kural #88) ─────────────────
    const { data: activeCmd } = await supabase
      .from('commands')
      .select('id')
      .eq('user_id', context.userId)
      .in('status', ['received', 'analyzing', 'detecting', 'proving', 'gate_check', 'executing'])
      .maybeSingle();

    if (activeCmd) {
      throw new Error('ERR-Sistem Takip Paneli009: Aktif işlem var — concurrent lock (Kural #88)');
    }
  } catch (err) {
    // Replay/concurrent hataları tekrar fırlat
    if (err instanceof Error && (err.message.includes('ERR-Sistem Takip Paneli006') || err.message.includes('ERR-Sistem Takip Paneli009'))) {
      throw err;
    }
    // Tablo yoksa veya DB erişim hatası → replay kontrolü atlanır, devam
    console.warn('[L0_GATEKEEPER] commands tablosu erişim hatası — replay/concurrent kontrolü atlandı:', err instanceof Error ? err.message : String(err));
  }

  // ── ADIM 5: Hash (A6) ───────────────────────────────────
  const hash = createHash('sha256')
    .update(sanitized + context.nonce + timestamp)
    .digest('hex');

  // ── ADIM 6: DB kayıt (T1 — commands) ────────────────────
  let commandId: string = `LOCAL-${Date.now()}`;
  try {
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
      console.warn('[L0_GATEKEEPER] commands INSERT hatası — yerel ID kullanılacak:', error?.message);
    } else {
      commandId = command.id;
    }
  } catch {
    console.warn('[L0_GATEKEEPER] commands tablosu INSERT erişim hatası — yerel ID kullanılacak');
  }

  // ── ADIM 7: Immutable log (T10 — proof zinciri) ─────────
  // H-04 FIX: immutable_logs tablosu yoksa sessiz fail — audit zinciri kırılmaz, yerel log devam eder
  try {
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
  } catch {
    // Tablo yoksa → yerel disk audit (ADIM 9) devam eder
    console.warn('[L0_GATEKEEPER] immutable_logs tablosu erişim hatası — yerel audit\'e düşülüyor');
  }

  // ── ADIM 8: Ses → teyit bekle ───────────────────────────
  if (context.isVoice) {
    return {
      status:    'VOICE_PENDING_CONFIRM',
      commandId,
      hash,
      timestamp,
      channel:   context.channel,
    };
  }

  // ── ADIM 9: Local disk audit (Kural #44) ─────────────────
  writeLocalAudit({
    eventType: 'L0_GATEKEEPER_PASS',
    module:    'K1',
    severity:  'info',
    commandId,
    userId:    context.userId,
    hash,
    payload:   { channel: context.channel, nonce: context.nonce, timestamp },
  });

  return {
    status:    'PROCEED',
    commandId,
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
