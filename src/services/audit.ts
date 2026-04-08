/**
 * AUDIT LOG SERVİSİ
 * ═══════════════════════════════════════════════════
 * Tüm sistem işlemlerini Supabase audit_logs tablosuna kaydeder.
 * Hata kodları: ERR-STP001-XXX formatında.
 * Append-only — kayıtlar silinemez, değiştirilemez.
 */

import { supabase } from '@/lib/supabase';

// ─── HATA KODLARI ────────────────────────────────────────────
export const AUDIT_ERRORS = {
    GENERAL: 'ERR-STP001-001',
    DB_CONNECTION: 'ERR-STP001-002',
    DB_WRITE: 'ERR-STP001-003',
    VALIDATION: 'ERR-STP001-004',
    UNAUTHORIZED: 'ERR-STP001-005',
    TIMEOUT: 'ERR-STP001-006',
} as const;

// ─── TİP TANIMLARI ────────────────────────────────────────────
export interface AuditLogEntry {
    id?: string;
    action: string;
    module: string;
    description: string;
    user_id?: string | null;
    user_name: string;
    status: 'success' | 'failure' | 'warning';
    error_code?: string | null;
    error_message?: string | null;
    metadata?: Record<string, unknown>;
    created_at?: string;
}

interface AuditResult {
    basarili: boolean;
    log?: AuditLogEntry;
    hata?: string;
    hataKodu?: string;
}

// ─── AUDIT LOG KAYDET ────────────────────────────────────────
/**
 * Audit log kaydı oluşturur.
 * Tüm parametreler doğrulanır, eksik veri varsa işlem reddedilir.
 */
export async function auditLogKaydet({
    action,
    module,
    description,
    user_id = null,
    user_name,
    status,
    error_code = null,
    error_message = null,
    metadata = {},
}: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<AuditResult> {
    // Doğrulama
    if (!action || !module || !description || !user_name) {
        return {
            basarili: false,
            hata: 'Zorunlu alanlar eksik: action, module, description, user_name',
            hataKodu: AUDIT_ERRORS.VALIDATION,
        };
    }

    try {
        const { data, error } = await supabase
            .from('audit_logs')
            .insert({
                action,
                module,
                description,
                user_id,
                user_name,
                status,
                error_code,
                error_message,
                metadata: {
                    ...metadata,
                    timestamp: new Date().toISOString(),
                    agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
                },
            })
            .select()
            .single();

        if (error) throw error;

        return { basarili: true, log: data as AuditLogEntry };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[AUDIT] ${AUDIT_ERRORS.DB_WRITE}: ${message}`);
        return {
            basarili: false,
            hata: message,
            hataKodu: AUDIT_ERRORS.DB_WRITE,
        };
    }
}

// ─── AUDIT LOG SORGULAMA ────────────────────────────────────
interface AuditSorguParams {
    module?: string | null;
    status?: string | null;
    limit?: number;
}

export async function auditLogGetir({
    module = null,
    status = null,
    limit = 50,
}: AuditSorguParams = {}): Promise<{ basarili: boolean; loglar?: AuditLogEntry[]; hata?: string }> {
    try {
        let sorgu = supabase
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (module) sorgu = sorgu.eq('module', module);
        if (status) sorgu = sorgu.eq('status', status);

        const { data, error } = await sorgu;
        if (error) throw error;

        return { basarili: true, loglar: (data || []) as AuditLogEntry[] };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { basarili: false, hata: message };
    }
}
