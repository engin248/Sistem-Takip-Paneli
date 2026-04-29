// ============================================================
// CONTROL ENGINE — G-0 KATMANI (L0 + L1 GATEKEEPER)
// HATA #14: Önceden her girdiyi geçiriyordu (Passthrough).
// HATA #24: Zod import eksikti, STRICT_CONTROL çöküyordu.
// ============================================================

import { z } from 'zod';

// KARA LİSTE: Bu desenleri içeren girdiler reddedilir
const KARA_LISTE: RegExp[] = [
  /ignore.*previous|forget.*instructions|system.*prompt/i, // Prompt injection
  /(union\s+select|drop\s+table|delete\s+from|insert\s+into|or\s+1\s*=\s*1)/i, // SQL injection
  /<script|onerror|javascript:/i, // XSS
  /rm\s+-rf|del\s+\/|format\s+c:/i, // Tehlikeli komut
];

// YASAKİ KELİMELER (F-003)
const NEGATIF_KISIT = ['minimum', 'yeterli', 'yeterince', 'kabul edilebilir', 'makul', 'ortalama', 'idare eder'];

// MIN girdi üzunluğu (F-016)
const MIN_UZUNLUK = 5;

/**
 * CONTROL — L0 Generic Gatekeeper
 * HATA #14 DÜZELTİLDİ: Artık gerçek kara liste / F-003 / F-016 kontrolleri çalışıyor.
 */
export const CONTROL = (islem: string, input: unknown) => {
  const metin = typeof input === 'string' ? input : JSON.stringify(input ?? '');
  const lower = metin.toLowerCase();

  // F-016: Min uzunluk kontrolü
  if (metin.trim().length < MIN_UZUNLUK) {
    return { pass: false, proof: 'L0_GIGO_REJECT', reason: `Girdi çok kısa (min ${MIN_UZUNLUK} karakter) — F-016` };
  }

  // Kara liste tarama
  for (const pattern of KARA_LISTE) {
    if (pattern.test(metin)) {
      return { pass: false, proof: 'L0_BLACKLIST_REJECT', reason: `Güvenlik ihlali tespit edildi: ${pattern}` };
    }
  }

  // F-003: Negatif kısıt kelimeleri (AI çıktıları için)
  for (const kelime of NEGATIF_KISIT) {
    if (lower.includes(kelime)) {
      return { pass: false, proof: 'L0_F003_REJECT', reason: `Reddedilen kavram: "${kelime}" — F-003` };
    }
  }

  return { pass: true, proof: 'L0_CLEARED', reason: '' };
};

/**
 * STRICT_CONTROL — L1 Zod Schema Validation
 * HATA #24 DÜZELTİLDİ: Zod import eklendi.
 */
export const STRICT_CONTROL = (islem: string, schema: z.ZodTypeAny, input: unknown) => {
    try {
        const data = schema.parse(input);
        return {
            pass: true,
            proof: 'L1_SCHEMA_VALIDATED',
            data
        };
    } catch (error: any) {
        return {
            pass: false,
            proof: 'L1_SCHEMA_REJECTED',
            reason: (error.errors?.map((e: any) => e.message) || [error.message]).join(' | ')
        };
    }
};

export const runControlEngine = () => ({ success: true });
