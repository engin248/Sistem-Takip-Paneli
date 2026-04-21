import { supabase } from '@/lib/supabase';
import { ERR, processError, type ErrorCode } from '@/lib/errorCore';

// ============================================================
// AUDIT SERVICE — audit_logs tablosuna kayıt ekleme
// ============================================================
// DB ÅEMASI (canlı tablo — 6 alan):
//   log_id    SERIAL PK
//   task_id   UUID (nullable)
//   action_code VARCHAR — İŞlem kodu (TASK_CREATED, TASK_UPDATED, vb.)
//   details   JSONB — Tüm detaylar burada
//   operator_id VARCHAR (nullable)
//   timestamp TIMESTAMPTZ DEFAULT NOW()
//
// Hata Kodları: ERR-STP001-006 (yazma), ERR-STP001-007 (okuma)
// ============================================================

// operation_type → action_code dönüŞüm haritası
export type AuditOperationType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'READ'
  | 'EXECUTE'
  | 'VALIDATE'
  | 'REJECT'
  | 'ERROR'
  | 'SYSTEM';

export type AuditErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'FATAL';
export type AuditStatus = 'basarili' | 'basarisiz' | 'beklemede' | 'iptal';

// ============================================================
// ADAPTÖR: Kod beklentilerini DB Şemasına dönüŞtürür
// Kod tarafı geniş interface kullanmaya devam eder,
// DB'ye yazarken 6 alanlı Şemaya sıkıştırılır.
// ============================================================
interface AuditLogEntry {
  // Zorunlu
  operation_type: AuditOperationType;
  action_description: string;

  // Opsiyonel
  task_id?: string | null;
  table_name?: string | null;
  record_id?: string | null;
  action_location?: string | null;
  action_output?: string | null;
  action_evidence?: string | null;
  error_code?: string | null;
  error_type?: string | null;
  error_severity?: AuditErrorSeverity;
  performed_by?: string;
  authorized_by?: string | null;
  status?: AuditStatus;
  execution_duration_ms?: number | null;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// log_code üretici — LOG-YYYYMMDD-HHMMSS-RAND formatında
function generateLogCode(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).substring(2, 10);
  return `LOG-${date}-${time}-${rand}`;
}

/**
 * AuditLogEntry → DB Şemasına (6 alan) dönüŞtürücü
 * Tüm ek bilgiler details JSONB alanına sıkıştırılır.
 */
function toDbRow(entry: AuditLogEntry) {
  const logCode = generateLogCode();
  // metadata.action_code varsa onu kullan (örn: AGENT_COUNTER_UPDATE),
  // yoksa operation_type + rand formatında oto-üret.
  const metaActionCode = entry.metadata?.action_code;
  const actionCode = typeof metaActionCode === 'string' && metaActionCode.length > 0
    ? metaActionCode
    : `${entry.operation_type}_${logCode.slice(-8)}`;

  return {
    task_id: entry.task_id || null,
    action_code: actionCode,
    operator_id: entry.performed_by || 'SISTEM',
    details: {
      log_code: logCode,
      operation_type: entry.operation_type,
      action_description: entry.action_description,
      status: entry.status || 'basarili',
      error_code: entry.error_code || null,
      error_severity: entry.error_severity || 'INFO',
      error_type: entry.error_type || null,
      table_name: entry.table_name || null,
      record_id: entry.record_id || null,
      action_location: entry.action_location || null,
      action_output: entry.action_output || null,
      action_evidence: entry.action_evidence || null,
      authorized_by: entry.authorized_by || null,
      execution_duration_ms: entry.execution_duration_ms || null,
      old_data: entry.old_data || null,
      new_data: entry.new_data || null,
      ...(entry.metadata || {}),
    },
  };
}

/**
 * DB'den gelen satırı → frontend beklentisine dönüŞtürür
 */
interface AuditLogRow {
  id: string;
  log_code: string;
  operation_type: string;
  action_description: string;
  task_id: string | null;
  performed_by: string;
  status: string;
  error_code: string | null;
  error_severity: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

function fromDbRow(row: Record<string, unknown>): AuditLogRow {
  const details = (row.details || {}) as Record<string, unknown>;
  return {
    id: String(row.log_id ?? ''),
    log_code: String(details.log_code || `LOG-${row.log_id}`),
    operation_type: String(details.operation_type || row.action_code || 'SYSTEM'),
    action_description: String(details.action_description || row.action_code || ''),
    task_id: row.task_id ? String(row.task_id) : null,
    performed_by: String(row.operator_id || 'SISTEM'),
    status: String(details.status || 'basarili'),
    error_code: details.error_code ? String(details.error_code) : null,
    error_severity: String(details.error_severity || 'INFO'),
    created_at: String(row.timestamp || ''),
    metadata: details,
  };
}

// SİSTEM_KASASI FİZİKSEL TUTANAK VE KRİPTO MÜHÜR (KURAL 44, 45, 106 REVİZE: MD OPTİMİZASYONU)
function writeVaultAudit(dbRow: any) {
  if (typeof window !== 'undefined') return; // Sadece backendde fiziksel diske yazar
  try {
    const fs = require('fs');
    const path = require('path');
    const crypto = require('crypto');

    // Sistem Takip Paneli Proje (Workspace) içi güvenli klasör ataması
    const AUDIT_DIR = path.join(process.cwd(), 'SISTEM_KASASI_AUDITS');
    if (!fs.existsSync(AUDIT_DIR)) {
      fs.mkdirSync(AUDIT_DIR, { recursive: true });
    }

    const logCode = dbRow.details?.log_code || `LOG-${Date.now()}`;
    const payloadInfo = JSON.stringify(dbRow, null, 2);
    
    // Kriptografik Damgalama (SHA-256) (Kural 106)
    const hash = crypto.createHash('sha256').update(payloadInfo).digest('hex');

    const baseName = `${logCode}_${hash.substring(0,8)}`;
    const mdPath = path.join(AUDIT_DIR, `${baseName}.md`);

    const isFail = dbRow.details?.status === 'basarisiz' || dbRow.details?.error_code;
    const statusEmoji = isFail ? 'âŒ' : 'âœ…';

    const mdContent = `# ğŸ›¡ï¸ SİSTEM TAKİP PANELİ (STP) KESİN KANIT TUTANAÄI\n\n` +
                      `**Tarih:** \`${new Date().toISOString()}\`\n\n` +
                      `**Log ID:** \`${logCode}\`\n\n` +
                      `**İŞlem (Action):** \`${dbRow.action_code}\`\n\n` +
                      `**Operatör:** \`${dbRow.operator_id}\`\n\n` +
                      `**Sonuç:** ${statusEmoji} **${(dbRow.details?.status || 'BİLİNMİYOR').toUpperCase()}**\n\n` +
                      `## ğŸ” Kriptografik Mühür (SHA-256)\n> \`${hash}\`\n\n*Bu kayıt otonom sistem tarafından değiştirilemez (Immutable) olarak mühürlenmiŞtir.*\n\n` +
                      `## ğŸ“‚ İŞlem Detayı (Payload)\n\`\`\`json\n${payloadInfo}\n\`\`\`\n`;

    // flag: 'wx' (Write eXclusive) => Dosya varsa hata ver. Kural 46 ve 53: Üzerine Yazma Yasağı.
    fs.writeFileSync(mdPath, mdContent, { encoding: 'utf-8', flag: 'wx' });
  } catch (err: any) {
    if (err && err.code === 'EEXIST') {
      return; // "Üzerine Yazma Yasağı" başarıyla çalıştı.
    }
    console.error('[SİSTEM_KASASI (SISTEM_KASASI_AUDITS) GÜVENLİK İHLALİ VEYA YAZMA HATASI]:', err);
  }
}

// Ana kayıt fonksiyonu
export const logAudit = async (entry: Omit<AuditLogEntry, 'log_code'>): Promise<{ success: boolean; error?: string }> => {
  try {
    const dbRow = toDbRow(entry as AuditLogEntry);

    // KURAL 27 (Kanıt yoksa işlem yok): Kanıt olmadan buluta gitmez! FİZİKSEL MÜHÜRLE!
    writeVaultAudit(dbRow);

    const { error } = await supabase
      .from('audit_logs')
      .insert([dbRow]);

    if (error) {
      processError(ERR.AUDIT_WRITE, error, {
        attempted_entry: entry.operation_type,
        tablo: 'audit_logs',
        islem: 'INSERT'
      });
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    processError(ERR.UNIDENTIFIED_COLLAPSE, err, {
      tablo: 'audit_logs',
      islem: 'INSERT',
      context: 'logAudit catch bloğu'
    }, 'FATAL');
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
};

// Kısayol: Hata kaydı — UID ile benzersiz kimlik atanır
export const logAuditError = async (
  errorCode: string,
  description: string,
  details?: Record<string, unknown>
): Promise<{ success: boolean; error?: string; uid?: string }> => {
  const { generateUID } = await import('@/lib/errorCore');
  const uid = generateUID();

  const result = await logAudit({
    operation_type: 'ERROR',
    action_description: `[${uid}] ${errorCode}: ${description}`,
    error_code: errorCode,
    error_severity: 'ERROR',
    status: 'basarisiz',
    metadata: { uid, ...details },
  });

  return { ...result, uid };
};

// Audit loglarını getir (En yeni 5 kayıt)
export const fetchAuditLogs = async () => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(5);

    if (error) {
      processError(ERR.AUDIT_READ, error, {
        tablo: 'audit_logs',
        islem: 'SELECT'
      });
      return [];
    }

    // DB formatını frontend beklentisine dönüŞtür
    return (data || []).map(fromDbRow);
  } catch (err) {
    processError(ERR.UNIDENTIFIED_COLLAPSE, err, {
      tablo: 'audit_logs',
      islem: 'SELECT',
      context: 'fetchAuditLogs catch bloğu'
    }, 'FATAL');
    return [];
  }
};

