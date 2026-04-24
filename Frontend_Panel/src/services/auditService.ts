// ============================================================
// AUDIT SERVICE — DENETİM KAYIT SİSTEMİ
// ============================================================

export const logAudit = async (data: any) => {
    // Yerel log (Stub)
    return { success: true };
};

export const getAuditService = () => ({ logAudit });
