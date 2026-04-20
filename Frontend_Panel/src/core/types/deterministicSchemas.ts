/**
 * SİSTEM TAKİP PANELİ - DEMİR KAFES (Iron Cage) ŞEMALARI
 * Kütüphane bağımlılığı olmadan, SİSTEM sistemine özel,
 * %100 Deterministik ve katı tip koruması sağlar. (Zod / Yup yerine Custom AST)
 */

export interface ExecutionOutputPayload {
    executionTimeMs: number;
    violationCount: number;
    exceededScope: boolean;
    collateralDamageRisk: "NONE" | "LOW" | "HIGH" | "CATASTROPHIC";
    unauthorizedTableAccess: boolean;
}

export class DeterministicParser {
    /**
     * Ajanların Çıktısını Acımasızca Doğrular (Iron Cage). Any nesnesini Saf Matematiksel Tipe dönüştürür.
     * En ufak bir isimlendirme veya tip hatasında işlemi "Deterministik İhlal" olarak çöpe atar.
     */
    public static parseExecutionOutput(data: unknown): { success: boolean, data?: ExecutionOutputPayload, error?: string } {
        if (typeof data !== 'object' || data === null) {
            return { success: false, error: "[IRON-CAGE REDDİ] Girdi bir JSON nesnesi değil." };
        }

        const obj = data as Record<string, any>;

        if (typeof obj.executionTimeMs !== 'number') return { success: false, error: "executionTimeMs (Sayı) formatında olmak zorundadır." };
        if (typeof obj.violationCount !== 'number') return { success: false, error: "violationCount (Sayı) formatında olmak zorundadır." };
        if (typeof obj.exceededScope !== 'boolean') return { success: false, error: "exceededScope (Boolean) zorunludur." };
        if (typeof obj.unauthorizedTableAccess !== 'boolean') return { success: false, error: "unauthorizedTableAccess (Boolean) zorunludur." };

        const validRisks = ["NONE", "LOW", "HIGH", "CATASTROPHIC"];
        if (!validRisks.includes(obj.collateralDamageRisk)) {
            return { success: false, error: `collateralDamageRisk belirlenen kalıplar (Enum) dışına çıkamaz. Verilen: ${obj.collateralDamageRisk}` };
        }

        // Deterministik kontrol başarıyla geçildi (Type-Safe).
        return { success: true, data: obj as ExecutionOutputPayload };
    }
}
