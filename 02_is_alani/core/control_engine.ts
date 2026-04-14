import { z } from 'zod';

/**
 * SİSTEM TAKİP PANELİ - HIGH-ASSURANCE GLOBAL CONTROL ARCHITECTURE
 * FAZ 1 — CONTROL ENGINE (ÇEKİRDEK)
 * Zırhlandırılmış God-Tier Sürüm
 *
 * Amaç: Sıfır varsayım, sıfır inisiyatif, maksimum doğruluk.
 * HER ADIM: INPUT → CONTROL → PROCESS → CONTROL → VERIFY → PROOF
 */

export interface ControlResult {
  pass: boolean;
  reason?: string;
  stage: string;
  proof: string;
}

/**
 * Generic Control. Verinin null/undefined olup olmadığını tam kesinlikle ölçer
 * ve tip zehirlenmesine izin vermez. 0 veya false geçerli veri sayılır.
 */
export function CONTROL<T>(stage: string, data: T): ControlResult {

  // 1. ZIRH: null/undefined veya NaN sayı — durdur. 0 ve false serbesttir.
  if (data === null || data === undefined || (typeof data === "number" && isNaN(data))) {
    return { pass: false, reason: "no_data", stage, proof: `[${stage}] REJECTED: no_data` };
  }

  // 2. ZIRH: Boş veya sadece boşluk içeren metinleri durdur.
  if (typeof data === "string" && data.trim() === "") {
    return { pass: false, reason: "empty_string", stage, proof: `[${stage}] REJECTED: empty_string` };
  }

  // 3. KURAL: Boş array engeli.
  if (Array.isArray(data) && data.length === 0) {
    return { pass: false, reason: "empty_array", stage, proof: `[${stage}] REJECTED: empty_array` };
  }

  // 4. ZIRH: Obje ise (Array, Date, RegExp, Map, Set DEĞİLSE) ve boşsa durdur.
  if (
    typeof data === "object" &&
    !Array.isArray(data) &&
    !(data instanceof Date) &&
    !(data instanceof RegExp) &&
    !(data instanceof Map) &&
    !(data instanceof Set) &&
    Object.keys(data as Record<string, unknown>).length === 0
  ) {
    return { pass: false, reason: "empty_object", stage, proof: `[${stage}] REJECTED: empty_object` };
  }

  return { pass: true, stage, proof: `[${stage}] PASS: Valid data` };
}

/**
 * Zod tabanlı Strict Control.
 * Tip güvenliği tam sağlanmadan ilerlenmez.
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
    return {
      pass: false,
      reason,
      stage,
      proof: `[${stage}] REJECTED (ZOD): ${reason}`
    };
  }

  return {
    pass: true,
    data: result.data,
    stage,
    proof: `[${stage}] PASS (ZOD): Schema validated`
  };
}
