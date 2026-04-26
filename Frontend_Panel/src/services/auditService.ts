// ============================================================
// AUDIT SERVICE — Gerçek Denetim Kaydı
// KÖK NEDEN: logAudit tamamen boştu, success:true döndürüyordu.
//            localAudit.ts ile hiç konuşmuyordu.
// ÇÖZÜM: localAudit üzerinden gerçek dosya yazma + Supabase.
// ============================================================

import { auditLog } from '@/core/localAudit';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export interface AuditPayload {
  operation_type: 'EXECUTE' | 'VALIDATE' | 'REJECT' | 'APPROVE' | 'ERROR' | 'READ' | 'CREATE' | 'UPDATE';
  action_description: string;
  katman?: string;
  kullanici?: string;
  metadata?: Record<string, unknown>;
}

/**
 * logAudit — Çift kanallı denetim kaydı.
 * KÖK NEDEN DÜZELTİLDİ: Artık gerçekten yazıyor.
 *
 * Kanal 1: Yerel dosya (localAudit.ts) — her zaman çalışır
 * Kanal 2: Supabase audit_logs tablosu — bağlantı varsa
 */
export async function logAudit(payload: AuditPayload): Promise<{ success: boolean; error?: string }> {
  // KANAL 1: Yerel dosya (güvenilir, her zaman çalışır)
  auditLog({
    islem:     payload.operation_type,
    katman:    payload.katman    || 'FRONTEND',
    kullanici: payload.kullanici || 'OTONOM',
    sonuc:     payload.operation_type === 'REJECT' || payload.operation_type === 'ERROR' ? 'FAIL' : 'PASS',
    aciklama:  payload.action_description,
    veri:      payload.metadata,
  });

  // KANAL 2: Supabase (bağlantı yoksa sessizce atla)
  if (supabaseUrl && supabaseUrl.length > 10) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('audit_logs').insert({
        operation_type:     payload.operation_type,
        action_description: payload.action_description,
        katman:             payload.katman    || 'FRONTEND',
        kullanici:          payload.kullanici || 'OTONOM',
        metadata:           payload.metadata  || {},
        created_at:         new Date().toISOString(),
      });
    } catch (e: unknown) {
      // Supabase hatası yerel logu etkilemez — sadece konsola yaz
      console.warn(`[AUDIT SERVICE] Supabase yazım uyarısı: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { success: true };
}

export const getAuditService = () => ({ logAudit });
