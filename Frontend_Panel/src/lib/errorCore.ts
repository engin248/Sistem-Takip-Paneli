// ============================================================
// ERROR CORE — SİSTEM HATA VE GÜVENLİK KAYIT KATMANI
// ============================================================

export const ERR = {
    SYSTEM_GENERAL: 'ERR-Sistem Takip Paneli001-001',
    TASK_CREATE: 'ERR-Sistem Takip Paneli001-002',
    AI_ANALYSIS: 'ERR-Sistem Takip Paneli001-003',
    DB_HATA: 'ERR-Sistem Takip Paneli001-004',
    AUTH_HATA: 'ERR-Sistem Takip Paneli001-005',
    PERMISSION_DENIED: 'ERR-Sistem Takip Paneli001-023',
};

/**
 * Hata İşleme: Tüm sistem hataları buradan geçer.
 */
export const processError = (type: string, error: any, context: any = {}, severity: string = 'ERROR') => {
    // console.error çağrılmalıdır (Test gereksinimi)
    console.error(`[${severity}] ${type}:`, error?.message || error, context);
    return {
        id: generateUID(),
        type,
        processed: true
    };
};

export const generateUID = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toISOString().slice(11, 19).replace(/:/g, '');
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `UID-${date}-${time}-${random}`;
};
export const ErrorCode = {};
