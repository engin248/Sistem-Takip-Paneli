import { z } from 'zod';

/**
 * NİZAM (THE ORDER) - HIGH-ASSURANCE GLOBAL CONTROL ARCHITECTURE
 * FAZ 1 — CONTROL ENGINE (ÇEKİRDEK)
 *
 * Amaç: Sıfır varsayım, sıfır inisiyatif, maksimum doğruluk.
 * HER ADIM: INPUT → CONTROL → PROCESS → CONTROL → VERIFY → PROOF
 */

export interface ControlResult {
  pass: boolean;
  reason?: string;
}

/**
 * Generic Control function that validates if data is present and not empty.
 * Acts as the absolute gatekeeper before any processing happens.
 */
export function CONTROL<T>(stage: string, data: T): ControlResult {
  if (!data) {
    return { pass: false, reason: "no_data" };
  }

  if (Array.isArray(data) && data.length === 0) {
    return { pass: false, reason: "empty_array" };
  }

  if (typeof data === "object" && Object.keys(data as Record<string, unknown>).length === 0) {
    return { pass: false, reason: "empty_object" };
  }

  return { pass: true };
}

/**
 * Zod based strict control engine for type-safe payload validation.
 * If validation fails, it acts as a Fail-Safe and stops execution immediately.
 */
export function STRICT_CONTROL<T>(schema: z.ZodType<T>, data: unknown): { pass: boolean; data?: T; reason?: string } {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      pass: false,
      reason: result.error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ')
    };
  }

  return {
    pass: true,
    data: result.data
  };
}
