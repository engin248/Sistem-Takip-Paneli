import { supabase } from '@/lib/supabase';

// ============================================================
// AUDIT SERVICE — audit_logs tablosuna kayıt ekleme
// Kaynak: 01_komutlar/supabase_schema.sql — Satır 86-146
// Doktrin: Sütun isimleri SQL şemasıyla HARFİYEN eşleşir
// ============================================================

// operation_type — SQL CHECK (satır 91-102) ile birebir eşleşir
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

// error_severity — SQL CHECK (satır 118-119) ile birebir eşleşir
export type AuditErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'FATAL';

// audit_logs status — SQL CHECK (satır 126-127) ile birebir eşleşir
export type AuditStatus = 'basarili' | 'basarisiz' | 'beklemede' | 'iptal';

// ============================================================
// LOG KAYDI OLUŞTURMA
// Zorunlu alanlar (NOT NULL): log_code, operation_type, action_description, performed_by
// Opsiyonel alanlar: task_id, table_name, error_code, error_type, metadata, vb.
// ============================================================
interface AuditLogEntry {
  // Zorunlu (SQL NOT NULL)
  log_code: string;                        // VARCHAR(50) NOT NULL
  operation_type: AuditOperationType;      // VARCHAR(30) NOT NULL CHECK
  action_description: string;              // TEXT NOT NULL

  // Zorunlu ama DEFAULT var
  performed_by?: string;                   // VARCHAR(100) NOT NULL DEFAULT 'SISTEM'
  status?: AuditStatus;                    // VARCHAR(20) NOT NULL DEFAULT 'basarili'

  // Opsiyonel
  task_id?: string | null;                 // UUID REFERENCES tasks(id)
  table_name?: string | null;              // VARCHAR(100)
  record_id?: string | null;              // UUID
  action_location?: string | null;        // TEXT
  action_output?: string | null;          // TEXT
  action_evidence?: string | null;        // TEXT
  error_code?: string | null;             // VARCHAR(30) — ERR-STP001-XXX formatında
  error_type?: string | null;             // VARCHAR(50)
  error_severity?: AuditErrorSeverity;    // VARCHAR(20) DEFAULT 'INFO'
  authorized_by?: string | null;          // VARCHAR(100)
  execution_duration_ms?: number | null;  // INTEGER
  old_data?: Record<string, unknown>;     // JSONB
  new_data?: Record<string, unknown>;     // JSONB
  metadata?: Record<string, unknown>;     // JSONB DEFAULT '{}'
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

// Ana kayıt fonksiyonu
export const logAudit = async (entry: Omit<AuditLogEntry, 'log_code'>): Promise<{ success: boolean; error?: string }> => {
  const logEntry: AuditLogEntry = {
    log_code: generateLogCode(),
    ...entry,
  };

  const { error } = await supabase
    .from('audit_logs')
    .insert([logEntry]);

  if (error) {
    console.error('ERR-STP001-006', error);
    return { success: false, error: error.message };
  }

  return { success: true };
};

// Kısayol: Hata kaydı
export const logAuditError = async (
  errorCode: string,
  description: string,
  details?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> => {
  return logAudit({
    operation_type: 'ERROR',
    action_description: description,
    error_code: errorCode,
    error_severity: 'ERROR',
    status: 'basarisiz',
    metadata: details,
  });
};
// Audit loglarını getir (En yeni 5 kayıt)
export const fetchAuditLogs = async () => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('ERR-STP001-007', error);
    return [];
  }
  return data;
};
