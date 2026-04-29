// ============================================================
// LOCAL AUDIT WRITER — Kural #44 + #45
// Konum: src/lib/localAuditWriter.ts
// ============================================================
// Tüm kritik işlemler C:\agent_audit\ dizinine JSONL olarak yazılır.
// Supabase'e ek olarak — disk kaydı zorunlu (Kural #44).
// Dosya formatı: STP_AUDIT_YYYY-MM-DD.jsonl (Kural #45)
// Append-only — silinemez, değiştirilemez (Kural #46, #53).
// ============================================================

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const AUDIT_DIR = process.env.STP_AUDIT_DIR ?? join(process.cwd(), '.agent_audit');
const IS_PROD   = process.env.NODE_ENV === 'production';

export interface LocalAuditEntry {
  eventType:  string;
  module:     string;
  severity:   'info' | 'warning' | 'error' | 'critical';
  commandId?: string;
  userId?:    string;
  hash?:      string;
  payload:    Record<string, unknown>;
}

/**
 * Kural #44-45: C:\agent_audit\ dizinine JSONL yazar.
 * Disk hatası sistemi DURDURMAz — loglama ek katmandır.
 * Üretim ortamında (Vercel) disk erişimi yoktur — sessizce atlanır.
 */
export function writeLocalAudit(entry: LocalAuditEntry): void {
  if (IS_PROD) return; // Vercel/serverless — disk yok

  try {
    // Klasörü oluştur (yoksa)
    if (!existsSync(AUDIT_DIR)) {
      mkdirSync(AUDIT_DIR, { recursive: true });
    }

    const now      = new Date();
    const dateStr  = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `STP_AUDIT_${dateStr}.jsonl`;
    const filepath = join(AUDIT_DIR, filename);

    const record = {
      ...entry,
      timestamp: now.toISOString(),
      seq:       Date.now(),         // Benzersiz sıra no (Kural #46)
      pid:       process.pid,        // İzlenebilirlik (Kural #15)
    };

    // APPEND-ONLY — flag:'a' ile eski kayıtlar korunur (Kural #53)
    writeFileSync(filepath, JSON.stringify(record) + '\n', { flag: 'a', encoding: 'utf-8' });
  } catch {
    // Disk hataları sistemi durdurmaz — sadece Supabase'e devam edilir
  }
}

/**
 * Günlük rapor dosyası yolu.
 * Kural #47: Otomatik raporlama için kullanılır.
 */
export function getAuditFilePath(date?: Date): string {
  const d       = date ?? new Date();
  const dateStr = d.toISOString().split('T')[0];
  return join(AUDIT_DIR, `STP_AUDIT_${dateStr}.jsonl`);
}
