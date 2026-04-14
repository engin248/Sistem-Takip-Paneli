import { z } from 'zod';

/**
 * SİSTEM TAKİP PANELİ - HIGH-ASSURANCE GLOBAL CONTROL ARCHITECTURE
 * FAZ 1 — CONTROL ENGINE (ÇEKİRDEK)
 * 
 * Amaç: Sıfır varsayım, sıfır inisiyatif, maksimum doğruluk.
 * HER ADIM: INPUT → CONTROL → PROCESS → CONTROL → VERIFY → PROOF
 */

export interface ControlResult {
  pass: boolean;
  reason?: string;
  proof?: string;
}

/**
 * Algoritma: Gatekeeper / Giriş Bekçisi
 * Hatalı "falsy" değer yutması önlenmiş, Object ve Date sınırları güçlendirilmiştir.
 */
export function CONTROL<T>(stage: string, data: T): ControlResult {
  if (data === null || data === undefined) {
    return { pass: false, reason: "no_data", proof: `[${stage}] ONAY REDDEDILDI: Veri Null veya Undefined` };
  }
  
  if (Array.isArray(data) && data.length === 0) {
    return { pass: false, reason: "empty_array", proof: `[${stage}] ONAY REDDEDILDI: Boş Dizi (Array)` };
  }
  
  if (data instanceof Date) {
      if (isNaN(data.getTime())) return { pass: false, reason: "invalid_date", proof: `[${stage}] ONAY REDDEDILDI: Gecersiz Tarih Formati` };
      return { pass: true, proof: `[${stage}] ONAYLANDI: Gecerli Tarih Objesi` };
  }
  
  if (typeof data === "object" && !(data instanceof Date) && Object.keys(data as Record<string, unknown>).length === 0) {
    return { pass: false, reason: "empty_object", proof: `[${stage}] ONAY REDDEDILDI: Bos Obje` };
  }
  
  if (typeof data === "string" && data.trim() === "") {
    return { pass: false, reason: "empty_string", proof: `[${stage}] ONAY REDDEDILDI: Sadece Bosluk Iceren Metin` };
  }
  
  return { pass: true, proof: `[${stage}] ONAY BASARILI: Veri Gecerli (Gatekeeper Onayi)` };
}

/**
 * Zod Base STRICT Control Engine
 * Veri tip güvenliği tam sağlanmadan ilerlenmez.
 */
export function STRICT_CONTROL<T>(stage: string, schema: z.ZodType<T>, data: unknown): { pass: boolean, data?: T, error?: string, proof: string } {
    const result = schema.safeParse(data);
    if (!result.success) {
        return {
            pass: false,
            error: result.error.issues.map((e: { message: string }) => e.message).join(', '),
            proof: `[${stage}] STRICT_RED: Tip uyuşmazlığı tespit edildi.`
        };
    }
    return {
        pass: true,
        data: result.data,
        proof: `[${stage}] STRICT_ONAY: Istenilen Tip (${typeof result.data}) doğrulandi ve mühürlendi.`
    };
}
