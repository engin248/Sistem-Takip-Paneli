-- supabase_migration_007_audit_logs.sql
-- audit_logs tablosu — auditService.ts tarafından kullanılıyor
-- proofChain.ts → logAudit() → auditService.ts → audit_logs
-- Schema: 6 alan (log_id, task_id, action_code, details, operator_id, timestamp)

CREATE TABLE IF NOT EXISTS audit_logs (
    log_id      BIGSERIAL PRIMARY KEY,
    task_id     UUID,
    action_code VARCHAR(100) NOT NULL,
    details     JSONB        NOT NULL DEFAULT '{}',
    operator_id VARCHAR(100),
    timestamp   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- İndeksler — performans
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_code
    ON audit_logs(action_code);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
    ON audit_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_task_id
    ON audit_logs(task_id)
    WHERE task_id IS NOT NULL;

-- JSONB indeksi — proofChain.ts action_code filtresi için
CREATE INDEX IF NOT EXISTS idx_audit_logs_details_action_code
    ON audit_logs((details->>'action_code'));

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_service_read"
    ON audit_logs FOR SELECT
    USING (true);

CREATE POLICY "audit_logs_service_insert"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

-- NOT: audit_logs IMMUTABLE — DELETE ve UPDATE politikası yok (A6)
