import { z } from 'zod';
/**
 * FAZ 1 — CONTROL ENGINE (ÇEKİRDEK)
 * Zırhlandırılmış God-Tier Sürüm
 * Amaç: Sıfır varsayım, sıfır inisiyatif, maksimum doğruluk.
 */
export interface ControlResult {
  pass: boolean;
  reason?: string;
}
/**
 * Generic Control. Verinin null/undefined olup olmadığını tam kesinlikle ölçer ve tip zehirlenmesine izin vermez.
 */
export function CONTROL<T>(stage: string, data: T): ControlResult {

  // 1. ZIRH: Sadece Gerekçekten Yoksa (null/undefined) veya Hatalı Sayıysa (NaN) durdur. 0 veya false serbest.
  if (data === null || data === undefined || (typeof data === "number" && isNaN(data))) {
    return { pass: false, reason: "no_data" };
  }

  // 2. KURAL: Boş array engeli.
  if (Array.isArray(data) && data.length === 0) {
    return { pass: false, reason: "empty_array" };
  }

  // 3. ZIRH: Eğer obje ise (fakat Array, Date, Map veya RegExp DEĞİLSE) ve boşsa durdur. (Date objesini yutmaz).
  if (
    typeof data === "object" &&
    !Array.isArray(data) &&
    !(data instanceof Date) &&
    !(data instanceof RegExp) &&
    !(data instanceof Map) &&
    !(data instanceof Set) &&
    Object.keys(data as Record<string, unknown>).length === 0
  ) {
    return { pass: false, reason: "empty_object" };
  }

  return { pass: true };
}
/**
 * Zod tabanlı Strict Control. (Mevcudu mükemmeldi, format korundu).
 */
export function STRICT_CONTROL<T>(schema: z.ZodType<T>, data: unknown): { pass: boolean; data?: T; reason?: string } {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      pass: false,
      reason: result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(' | ')
    };
  }

  return {
    pass: true,
    data: result.data
  };
}
