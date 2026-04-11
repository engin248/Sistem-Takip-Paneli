-- ============================================================
-- STP MİGRASYON: Eski şemayı yeni şemaya dönüştür
-- Tarih: 10 Nisan 2026
-- DİKKAT: Supabase SQL Editor'da çalıştırılacak
-- ============================================================

-- ┌────────────────────────────────────────────────────────┐
-- │ ADIM 1: ESKi audit_logs TABLOSUNU YEDEKLE              │
-- └────────────────────────────────────────────────────────┘
ALTER TABLE IF EXISTS audit_logs RENAME TO audit_logs_backup_20260410;

-- ┌────────────────────────────────────────────────────────┐
-- │ ADIM 2: YENİ audit_logs TABLOSUNU OLUŞTUR (24 alan)    │
-- └────────────────────────────────────────────────────────┘
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_code VARCHAR(50) NOT NULL,
    operation_type VARCHAR(30) NOT NULL
        CHECK (operation_type IN (
            'CREATE', 'UPDATE', 'DELETE', 'READ',
            'EXECUTE', 'VALIDATE', 'REJECT', 'ERROR', 'SYSTEM'
        )),
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    table_name VARCHAR(100),
    record_id UUID,
    action_description TEXT NOT NULL,
    action_location TEXT,
    action_output TEXT,
    action_evidence TEXT,
    error_code VARCHAR(30),
    error_type VARCHAR(50),
    error_severity VARCHAR(20) DEFAULT 'INFO'
        CHECK (error_severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL', 'FATAL')),
    performed_by VARCHAR(100) NOT NULL DEFAULT 'SISTEM',
    authorized_by VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'basarili'
        CHECK (status IN ('basarili', 'basarisiz', 'beklemede', 'iptal')),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by VARCHAR(100),
    verified_at TIMESTAMPTZ,
    execution_duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_sealed BOOLEAN NOT NULL DEFAULT TRUE,
    old_data JSONB,
    new_data JSONB,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- İndeksler
CREATE INDEX idx_audit_logs_task_id ON audit_logs(task_id);
CREATE INDEX idx_audit_logs_operation_type ON audit_logs(operation_type);
CREATE INDEX idx_audit_logs_error_code ON audit_logs(error_code) WHERE error_code IS NOT NULL;
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);

-- Değişmezlik (Immutability) — UPDATE ve DELETE engelle
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Denetim kayıtları değiştirilemez veya silinemez.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_audit_update
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

CREATE TRIGGER trigger_prevent_audit_delete
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_modification();

-- ┌────────────────────────────────────────────────────────┐
-- │ ADIM 3: ESKİ VERİYİ MİGRE ET (1 kayıt)               │
-- └────────────────────────────────────────────────────────┘
INSERT INTO audit_logs (log_code, operation_type, task_id, action_description, metadata)
SELECT
    'LOG-MIGRATION-' || log_id::text,
    'CREATE',
    task_id,
    'Migrasyon: ' || COALESCE(action_code, 'BILINMIYOR'),
    COALESCE(details, '{}'::jsonb)
FROM audit_logs_backup_20260410;

-- ┌────────────────────────────────────────────────────────┐
-- │ ADIM 4: RLS Politikaları                               │
-- └────────────────────────────────────────────────────────┘
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select" ON audit_logs
    FOR SELECT USING (TRUE);

CREATE POLICY "audit_logs_insert" ON audit_logs
    FOR INSERT WITH CHECK (TRUE);

-- ┌────────────────────────────────────────────────────────┐
-- │ ADIM 5: tasks tablosu priority düzeltme                │
-- └────────────────────────────────────────────────────────┘
-- Eski invalid değerleri düzelt
UPDATE tasks SET priority = 'yuksek' WHERE priority NOT IN ('kritik', 'yuksek', 'normal', 'dusuk');

-- CHECK constraint ekle (eğer yoksa)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'tasks_priority_check'
    ) THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check
            CHECK (priority IN ('kritik', 'yuksek', 'normal', 'dusuk'));
    END IF;
END $$;

-- status constraint ekle (eğer yoksa)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'tasks_status_check'
    ) THEN
        ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
            CHECK (status IN ('beklemede', 'devam_ediyor', 'dogrulama', 'tamamlandi', 'reddedildi', 'iptal'));
    END IF;
END $$;

-- ┌────────────────────────────────────────────────────────┐
-- │ ADIM 6: Otomatik denetim trigger'ı                     │
-- └────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (log_code, operation_type, task_id, table_name, record_id, action_description, new_data, performed_by)
        VALUES (
            'LOG-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || LEFT(NEW.id::text, 8),
            'CREATE', NEW.id, 'tasks', NEW.id,
            'Yeni görev oluşturuldu: ' || NEW.task_code || ' - ' || NEW.title,
            TO_JSONB(NEW), NEW.assigned_by
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (log_code, operation_type, task_id, table_name, record_id, action_description, old_data, new_data, performed_by)
        VALUES (
            'LOG-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || LEFT(NEW.id::text, 8),
            'UPDATE', NEW.id, 'tasks', NEW.id,
            'Görev güncellendi: ' || NEW.task_code || ' | Durum: ' || OLD.status || ' → ' || NEW.status,
            TO_JSONB(OLD), TO_JSONB(NEW), NEW.assigned_by
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı yeniden oluştur (eski varsa düşür)
DROP TRIGGER IF EXISTS trigger_log_task_changes ON tasks;
CREATE TRIGGER trigger_log_task_changes
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_task_changes();

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_tasks_updated_at();

-- ┌────────────────────────────────────────────────────────┐
-- │ DOĞRULAMA                                              │
-- └────────────────────────────────────────────────────────┘
SELECT 'TABLO_KONTROL' as tip,
       table_name,
       (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as alan_sayisi
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_name IN ('tasks', 'audit_logs', 'audit_logs_backup_20260410')
ORDER BY table_name;
