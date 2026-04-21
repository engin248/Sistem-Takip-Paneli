-- Master_Schema.sql
-- Generated: 2026-04-19T17:07:40.8577879+03:00
-- Scope: 01_komutlar/*.sql + 02_is_alani/*.sql
-- Note: node_modules and nested vendor SQL files are intentionally excluded.

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\01_komutlar\board_decisions_migration.sql
-- ============================================================
-- BOARD_DECISIONS â€” YÃ¶netim Kurulu Karar Tablosu
-- ============================================================
-- 3 AI ajan konsensÃ¼s mekanizmasÄ± iÃ§in karar depolama.
-- Her karar stratejik, teknik ve gÃ¼venlik perspektifinden
-- baÄŸÄ±msÄ±z olarak oylanÄ±r. 3/3 ONAY â†’ MÃœHÃœRLÃœ.
-- ============================================================

CREATE TABLE IF NOT EXISTS board_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Karar temel bilgileri
  decision_code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (
    category IN ('DEPLOYMENT', 'SCHEMA_CHANGE', 'SECURITY', 'ROLLBACK', 'CONFIG_CHANGE')
  ),
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'sealed')
  ),
  requested_by VARCHAR(100) NOT NULL DEFAULT 'OPERATÃ–R',

  -- Stratejik Ajan Oyu
  agent_strategic_vote VARCHAR(20) CHECK (agent_strategic_vote IN ('ONAY', 'RED')),
  agent_strategic_reason TEXT,
  agent_strategic_confidence DECIMAL(3,2),
  agent_strategic_at TIMESTAMPTZ,

  -- Teknik Ajan Oyu
  agent_technical_vote VARCHAR(20) CHECK (agent_technical_vote IN ('ONAY', 'RED')),
  agent_technical_reason TEXT,
  agent_technical_confidence DECIMAL(3,2),
  agent_technical_at TIMESTAMPTZ,

  -- GÃ¼venlik AjanÄ± Oyu
  agent_security_vote VARCHAR(20) CHECK (agent_security_vote IN ('ONAY', 'RED')),
  agent_security_reason TEXT,
  agent_security_confidence DECIMAL(3,2),
  agent_security_at TIMESTAMPTZ,

  -- KonsensÃ¼s Sonucu
  consensus_result VARCHAR(20) CHECK (consensus_result IN ('MÃœHÃœRLÃœ', 'REDDEDÄ°LDÄ°', 'BEKLEMEDE')),
  seal_hash VARCHAR(128),
  sealed_at TIMESTAMPTZ,
  vote_source VARCHAR(10) CHECK (vote_source IN ('ai', 'local')),

  -- Meta
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Ä°NDEKSLER
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_board_decisions_status ON board_decisions(status);
CREATE INDEX IF NOT EXISTS idx_board_decisions_category ON board_decisions(category);
CREATE INDEX IF NOT EXISTS idx_board_decisions_created ON board_decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_board_decisions_consensus ON board_decisions(consensus_result);

-- ============================================================
-- RLS POLÄ°TÄ°KALARI
-- ============================================================
ALTER TABLE board_decisions ENABLE ROW LEVEL SECURITY;

-- Okuma: Herkes okuyabilir (anon)
CREATE POLICY "board_decisions_select_policy"
  ON board_decisions
  FOR SELECT
  USING (true);

-- Yazma: Herkes yazabilir (anon) â€” production'da kÄ±sÄ±tlanmalÄ±
CREATE POLICY "board_decisions_insert_policy"
  ON board_decisions
  FOR INSERT
  WITH CHECK (true);

-- GÃ¼ncelleme: Herkes gÃ¼ncelleyebilir (anon)
CREATE POLICY "board_decisions_update_policy"
  ON board_decisions
  FOR UPDATE
  USING (true);

-- ============================================================
-- updated_at TRÄ°GGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_board_decisions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_board_decisions_updated_at
  BEFORE UPDATE ON board_decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_board_decisions_updated_at();

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\01_komutlar\file_level_locking_rls.sql
-- ============================================================
-- STP-002 FILE-LEVEL LOCKING â€” RLS Ä°LE YAZMA KISITLAMASI
-- Tarih: 2026-04-08
-- Doktrin: Ekip Ã¼yesi sadece assigned_to = kendi adÄ± olan
--          gÃ¶revleri gÃ¼ncelleyebilir. YÃ¶netici/Admin hariÃ§.
-- ============================================================
-- Ã–NEMLÄ°: Bu migration mevcut rls_politikalari.sql Ã¼zerine
-- Ã§alÄ±ÅŸÄ±r. Ã–nce mevcut tasks_update politikasÄ± kaldÄ±rÄ±lÄ±r,
-- yerine sahiplik bazlÄ± politika oluÅŸturulur.
-- ============================================================

-- â”€â”€â”€ MEVCUT GÃœNCELLEME POLÄ°TÄ°KASINI KALDIR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_update_owner" ON tasks;
DROP POLICY IF EXISTS "tasks_update_elevated" ON tasks;

-- â”€â”€â”€ SAHÄ°PLÄ°K BAZLI GÃœNCELLEME (File-Level Lock) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Normal kullanÄ±cÄ±lar: Sadece assigned_to = kendi adÄ± olan
-- gÃ¶revleri gÃ¼ncelleyebilir.
-- NOT: Supabase anon key ile Ã§alÄ±ÅŸÄ±lÄ±yorsa request header'dan
-- operatÃ¶r adÄ± alÄ±nÄ±r. custom_claims kullanÄ±lÄ±yorsa JWT'den.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- YÃ¶ntem 1: custom request header Ã¼zerinden doÄŸrulama
-- Frontend'den: supabase.from('tasks').update(...) Ã§aÄŸrÄ±sÄ±
-- Ã¶ncesi headers ayarlanarak operatÃ¶r kimliÄŸi gÃ¶nderilir.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE POLICY "tasks_update_owner" ON tasks
    FOR UPDATE USING (
        -- KoÅŸul 1: assigned_to, request header'daki operatÃ¶r ile eÅŸleÅŸsin
        UPPER(assigned_to) = UPPER(
            COALESCE(
                current_setting('request.headers', true)::json->>'x-operator-name',
                'SISTEM'
            )
        )
    ) WITH CHECK (TRUE);

-- YÃ¶ntem 2: YÃ¼kseltilmiÅŸ yetki (YÃ–NETÄ°CÄ° / ADMIN)
-- x-operator-role header'Ä± 'ADMIN' veya 'YÃ–NETÄ°CÄ°' ise tÃ¼m gÃ¶revlere eriÅŸim
CREATE POLICY "tasks_update_elevated" ON tasks
    FOR UPDATE USING (
        UPPER(
            COALESCE(
                current_setting('request.headers', true)::json->>'x-operator-role',
                ''
            )
        ) IN ('ADMIN', 'YÃ–NETÄ°CÄ°')
    ) WITH CHECK (TRUE);

-- ============================================================
-- DOÄRULAMA
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE 'âœ… File-level locking RLS politikalarÄ± oluÅŸturuldu';
    RAISE NOTICE '  tasks_update_owner:    assigned_to = x-operator-name';
    RAISE NOTICE '  tasks_update_elevated: x-operator-role IN (ADMIN, YÃ–NETÄ°CÄ°)';
    RAISE NOTICE '  Frontend guard: permissionGuard.ts (istemci tarafÄ± ek kontrol)';
END;
$$;

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\01_komutlar\migration_fix_20260410.sql
-- ============================================================
-- STP MÄ°GRASYON: Eski ÅŸemayÄ± yeni ÅŸemaya dÃ¶nÃ¼ÅŸtÃ¼r
-- Tarih: 10 Nisan 2026
-- DÄ°KKAT: Supabase SQL Editor'da Ã§alÄ±ÅŸtÄ±rÄ±lacak
-- ============================================================

-- â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
-- â”‚ ADIM 1: ESKi audit_logs TABLOSUNU YEDEKLE              â”‚
-- â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
ALTER TABLE IF EXISTS audit_logs RENAME TO audit_logs_backup_20260410;

-- â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
-- â”‚ ADIM 2: YENÄ° audit_logs TABLOSUNU OLUÅTUR (24 alan)    â”‚
-- â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
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

-- Ä°ndeksler
CREATE INDEX idx_audit_logs_task_id ON audit_logs(task_id);
CREATE INDEX idx_audit_logs_operation_type ON audit_logs(operation_type);
CREATE INDEX idx_audit_logs_error_code ON audit_logs(error_code) WHERE error_code IS NOT NULL;
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);

-- DeÄŸiÅŸmezlik (Immutability) â€” UPDATE ve DELETE engelle
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Denetim kayÄ±tlarÄ± deÄŸiÅŸtirilemez veya silinemez.';
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

-- â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
-- â”‚ ADIM 3: ESKÄ° VERÄ°YÄ° MÄ°GRE ET (1 kayÄ±t)               â”‚
-- â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
INSERT INTO audit_logs (log_code, operation_type, task_id, action_description, metadata)
SELECT
    'LOG-MIGRATION-' || log_id::text,
    'CREATE',
    task_id,
    'Migrasyon: ' || COALESCE(action_code, 'BILINMIYOR'),
    COALESCE(details, '{}'::jsonb)
FROM audit_logs_backup_20260410;

-- â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
-- â”‚ ADIM 4: RLS PolitikalarÄ±                               â”‚
-- â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select" ON audit_logs
    FOR SELECT USING (TRUE);

CREATE POLICY "audit_logs_insert" ON audit_logs
    FOR INSERT WITH CHECK (TRUE);

-- â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
-- â”‚ ADIM 5: tasks tablosu priority dÃ¼zeltme                â”‚
-- â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
-- Eski invalid deÄŸerleri dÃ¼zelt
UPDATE tasks SET priority = 'yuksek' WHERE priority NOT IN ('kritik', 'yuksek', 'normal', 'dusuk');

-- CHECK constraint ekle (eÄŸer yoksa)
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

-- status constraint ekle (eÄŸer yoksa)
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

-- â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
-- â”‚ ADIM 6: Otomatik denetim trigger'Ä±                     â”‚
-- â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (log_code, operation_type, task_id, table_name, record_id, action_description, new_data, performed_by)
        VALUES (
            'LOG-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || LEFT(NEW.id::text, 8),
            'CREATE', NEW.id, 'tasks', NEW.id,
            'Yeni gÃ¶rev oluÅŸturuldu: ' || NEW.task_code || ' - ' || NEW.title,
            TO_JSONB(NEW), NEW.assigned_by
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (log_code, operation_type, task_id, table_name, record_id, action_description, old_data, new_data, performed_by)
        VALUES (
            'LOG-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || LEFT(NEW.id::text, 8),
            'UPDATE', NEW.id, 'tasks', NEW.id,
            'GÃ¶rev gÃ¼ncellendi: ' || NEW.task_code || ' | Durum: ' || OLD.status || ' â†’ ' || NEW.status,
            TO_JSONB(OLD), TO_JSONB(NEW), NEW.assigned_by
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger'Ä± yeniden oluÅŸtur (eski varsa dÃ¼ÅŸÃ¼r)
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

-- â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
-- â”‚ DOÄRULAMA                                              â”‚
-- â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
SELECT 'TABLO_KONTROL' as tip,
       table_name,
       (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as alan_sayisi
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_name IN ('tasks', 'audit_logs', 'audit_logs_backup_20260410')
ORDER BY table_name;

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\01_komutlar\rls_auth_fix.sql
-- ============================================================
-- MIGRATION: RLS PolitikalarÄ± â€” Authenticated KÄ±sÄ±tlamasÄ±
-- ============================================================
-- Mevcut USING(true) politikalarÄ± anonymous eriÅŸime izin verir.
-- Bu migration tÃ¼m tablolarÄ± "sadece giriÅŸ yapmÄ±ÅŸ kullanÄ±cÄ±"
-- politikasÄ±na gÃ¼ncelliyor.
--
-- Ã‡alÄ±ÅŸtÄ±r: Supabase SQL Editor'da bir kez
-- ============================================================

-- â”€â”€â”€ tasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Eski politikalarÄ± sil
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;
DROP POLICY IF EXISTS "Allow read access" ON tasks;
DROP POLICY IF EXISTS "Allow all" ON tasks;

-- Yeni politikalar: Sadece authenticated
CREATE POLICY "tasks_select_auth"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tasks_insert_auth"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "tasks_update_auth"
  ON tasks FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "tasks_delete_auth"
  ON tasks FOR DELETE
  TO authenticated
  USING (true);

-- Service role tam eriÅŸim
CREATE POLICY "tasks_service_role"
  ON tasks
  USING (auth.role() = 'service_role');

-- â”€â”€â”€ audit_logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

DROP POLICY IF EXISTS "audit_logs_select_policy" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON audit_logs;
DROP POLICY IF EXISTS "Allow read access" ON audit_logs;
DROP POLICY IF EXISTS "Allow insert" ON audit_logs;

CREATE POLICY "audit_logs_select_auth"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "audit_logs_insert_auth"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "audit_logs_service_role"
  ON audit_logs
  USING (auth.role() = 'service_role');

-- â”€â”€â”€ board_decisions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

DROP POLICY IF EXISTS "board_decisions_select_policy" ON board_decisions;
DROP POLICY IF EXISTS "board_decisions_insert_policy" ON board_decisions;
DROP POLICY IF EXISTS "board_decisions_update_policy" ON board_decisions;
DROP POLICY IF EXISTS "Allow all" ON board_decisions;

CREATE POLICY "board_decisions_select_auth"
  ON board_decisions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "board_decisions_insert_auth"
  ON board_decisions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "board_decisions_update_auth"
  ON board_decisions FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "board_decisions_service_role"
  ON board_decisions
  USING (auth.role() = 'service_role');

-- â”€â”€â”€ command_archive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

DROP POLICY IF EXISTS "command_archive_select_policy" ON command_archive;
DROP POLICY IF EXISTS "command_archive_insert_policy" ON command_archive;
DROP POLICY IF EXISTS "command_archive_update_policy" ON command_archive;
DROP POLICY IF EXISTS "Allow all" ON command_archive;

CREATE POLICY "command_archive_select_auth"
  ON command_archive FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "command_archive_insert_auth"
  ON command_archive FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "command_archive_update_auth"
  ON command_archive FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "command_archive_service_role"
  ON command_archive
  USING (auth.role() = 'service_role');

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\01_komutlar\rls_policies.sql
-- ============================================================
-- STP-ARKA â€” SUPABASE RLS POLÄ°TÄ°KALARI MÃœHÃœRLEMESÄ°
-- Tarih: 2026-04-08
-- Doktrin: SIFIR Ä°NÄ°SÄ°YATÄ°F / KESÄ°N KANIT Ä°LKESÄ°
-- ============================================================
-- Bu dosya Supabase Dashboard â†’ SQL Editor'de Ã§alÄ±ÅŸtÄ±rÄ±lmalÄ±dÄ±r.
-- TÃ¼m tablolarda RLS aktif edilir ve politikalar mÃ¼hÃ¼rlenir.
-- ============================================================

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 1. RLS AKTÄ°VASYONU â€” TÃ¼m tablolarda zorunlu
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 2. TASKS TABLOSU â€” RLS POLÄ°TÄ°KALARI
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Mevcut politikalarÄ± temizle (gÃ¼venli yeniden uygulama)
DROP POLICY IF EXISTS "tasks_select_anon" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_anon" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_anon" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_anon" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_authenticated" ON public.tasks;

-- SELECT: Anon ve authenticated kullanÄ±cÄ±lar tÃ¼m gÃ¶revleri okuyabilir
CREATE POLICY "tasks_select_anon"
  ON public.tasks
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "tasks_select_authenticated"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Sadece authenticated kullanÄ±cÄ±lar ve anon (panel frontend)
CREATE POLICY "tasks_insert_anon"
  ON public.tasks
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "tasks_insert_authenticated"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Sadece authenticated kullanÄ±cÄ±lar ve anon (durum gÃ¼ncellemesi)
CREATE POLICY "tasks_update_anon"
  ON public.tasks
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "tasks_update_authenticated"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Sadece authenticated kullanÄ±cÄ±lar ve anon (gÃ¶rev silme)
CREATE POLICY "tasks_delete_anon"
  ON public.tasks
  FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "tasks_delete_authenticated"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (true);

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 3. AUDIT_LOGS TABLOSU â€” RLS POLÄ°TÄ°KALARI
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- Mevcut politikalarÄ± temizle
DROP POLICY IF EXISTS "audit_select_anon" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_insert_anon" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_select_authenticated" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_insert_authenticated" ON public.audit_logs;

-- SELECT: TÃ¼m kullanÄ±cÄ±lar audit log'larÄ± okuyabilir
CREATE POLICY "audit_select_anon"
  ON public.audit_logs
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "audit_select_authenticated"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: TÃ¼m kullanÄ±cÄ±lar audit log yazabilir (sistem gerekliliÄŸi)
CREATE POLICY "audit_insert_anon"
  ON public.audit_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "audit_insert_authenticated"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE/DELETE: audit_logs tablosunda gÃ¼ncelleme/silme YASAKTIR
-- Audit kayÄ±tlarÄ± deÄŸiÅŸtirilemez â€” MÃœHÃœRLEME Ä°LKESÄ°
-- (Politika oluÅŸturulmaz â†’ varsayÄ±lan olarak reddedilir)

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 4. REALTIME â€” Tablo yayÄ±nlama (Publication)
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- Supabase Realtime'Ä±n Ã§alÄ±ÅŸmasÄ± iÃ§in tablolarÄ±n publication'a 
-- eklenmesi gerekir. Zaten eklenmiÅŸ olabilir, IF NOT EXISTS ile korunur.

DO $$
BEGIN
  -- supabase_realtime publication'Ä±na tablolarÄ± ekle
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  END IF;
END $$;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- 5. DOÄRULAMA SORGUSU â€” RLS durumunu kontrol et
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('tasks', 'audit_logs')
ORDER BY tablename;

-- PolitikalarÄ± listele
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('tasks', 'audit_logs')
ORDER BY tablename, policyname;

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- MÃœHÃœR: RLS POLÄ°TÄ°KALARI TAMAMLANDI
-- tasks: SELECT/INSERT/UPDATE/DELETE â†’ anon + authenticated
-- audit_logs: SELECT/INSERT â†’ anon + authenticated (UPDATE/DELETE YASAK)
-- Realtime: Her iki tablo supabase_realtime publication'Ä±na eklendi
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\01_komutlar\rls_politikalari.sql
-- ============================================================
-- STP-001 ROW LEVEL SECURITY (RLS) GÃœNCELLEMESÄ°
-- Tarih: 2026-04-08
-- Doktrin: service_role harici yetkisiz silme yasak
-- ============================================================

-- â”€â”€â”€ TASKS TABLOSU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Mevcut politikalarÄ± temizle (varsa)
DROP POLICY IF EXISTS "tasks_full_access" ON tasks;
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

-- SELECT: Herkes okuyabilir
CREATE POLICY "tasks_select" ON tasks
    FOR SELECT USING (TRUE);

-- INSERT: Herkes ekleyebilir
CREATE POLICY "tasks_insert" ON tasks
    FOR INSERT WITH CHECK (TRUE);

-- UPDATE: Herkes gÃ¼ncelleyebilir
CREATE POLICY "tasks_update" ON tasks
    FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

-- DELETE: SADECE service_role silebilir (anon ve authenticated engellenmiÅŸ)
-- Bu politika anon/authenticated kullanÄ±cÄ±larÄ±n silmesini engeller
-- Supabase Dashboard ve service_role eriÅŸimi hala Ã§alÄ±ÅŸÄ±r
CREATE POLICY "tasks_delete" ON tasks
    FOR DELETE USING (
        (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
    );

-- â”€â”€â”€ AUDIT_LOGS TABLOSU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Mevcut politikalarÄ± temizle (varsa)
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_update" ON audit_logs;

-- SELECT: Herkes okuyabilir
CREATE POLICY "audit_logs_select" ON audit_logs
    FOR SELECT USING (TRUE);

-- INSERT: Herkes ekleyebilir
CREATE POLICY "audit_logs_insert" ON audit_logs
    FOR INSERT WITH CHECK (TRUE);

-- DELETE + UPDATE: YASAK (trigger ile de korunuyor, RLS ile de)
-- Politika oluÅŸturulmadÄ± = eriÅŸim yok

-- ============================================================
-- DOÄRULAMA
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE 'âœ… RLS politikalarÄ± gÃ¼ncellendi';
    RAISE NOTICE '  tasks: SELECT/INSERT/UPDATE â†’ aÃ§Ä±k | DELETE â†’ sadece service_role';
    RAISE NOTICE '  audit_logs: SELECT/INSERT â†’ aÃ§Ä±k | UPDATE/DELETE â†’ tamamen engelli';
END;
$$;

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\01_komutlar\stp_alarms_migration.sql
-- ============================================================
-- MIGRATION: stp_alarms tablosu
-- ============================================================
-- Alarm servisi kalÄ±cÄ±lÄ±ÄŸÄ± iÃ§in gerekli tablo.
-- alarmService.ts bu tabloyu birincil depo olarak kullanÄ±r.
-- In-memory Map, bu tablodan yÃ¼klenen cache katmanÄ±dÄ±r.
--
-- Ã‡alÄ±ÅŸtÄ±r: Supabase SQL Editor'da bir kez
-- ============================================================

CREATE TABLE IF NOT EXISTS stp_alarms (
  id            TEXT        PRIMARY KEY,
  baslik        TEXT        NOT NULL,
  aciklama      TEXT        NOT NULL,
  seviye        TEXT        NOT NULL
                            CHECK (seviye IN ('INFO', 'WARNING', 'CRITICAL', 'EMERGENCY')),
  modul         TEXT        NOT NULL,
  durum         TEXT        NOT NULL DEFAULT 'ACIK'
                            CHECK (durum IN ('ACIK', 'GORULDU', 'COZULDU')),
  tekrar_sayisi INTEGER     NOT NULL DEFAULT 1,
  ilk_tetiklenme TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  son_tetiklenme TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS aktif
ALTER TABLE stp_alarms ENABLE ROW LEVEL SECURITY;

-- Sadece giriÅŸ yapmÄ±ÅŸ kullanÄ±cÄ±lar okuyabilir
CREATE POLICY "alarms_select_authenticated"
  ON stp_alarms FOR SELECT
  TO authenticated
  USING (true);

-- Sadece giriÅŸ yapmÄ±ÅŸ kullanÄ±cÄ±lar oluÅŸturabilir
CREATE POLICY "alarms_insert_authenticated"
  ON stp_alarms FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Sadece giriÅŸ yapmÄ±ÅŸ kullanÄ±cÄ±lar gÃ¼ncelleyebilir
CREATE POLICY "alarms_update_authenticated"
  ON stp_alarms FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role tam eriÅŸim (server-side API routes iÃ§in)
CREATE POLICY "alarms_service_role_all"
  ON stp_alarms
  USING (auth.role() = 'service_role');

-- Otomatik updated_at
CREATE OR REPLACE FUNCTION update_stp_alarms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER stp_alarms_updated_at
  BEFORE UPDATE ON stp_alarms
  FOR EACH ROW
  EXECUTE FUNCTION update_stp_alarms_updated_at();

-- Ä°ndeks: modul + durum sorgularÄ±nÄ± hÄ±zlandÄ±rÄ±r
CREATE INDEX IF NOT EXISTS idx_stp_alarms_modul_durum
  ON stp_alarms (modul, durum);

CREATE INDEX IF NOT EXISTS idx_stp_alarms_seviye_durum
  ON stp_alarms (seviye, durum);

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\01_komutlar\supabase_schema.sql
-- ============================================================
-- STP-001 SUPABASE TABLO ÅEMASI
-- OluÅŸturma Tarihi: 2026-04-08
-- Doktrin: SÄ°STEM KURALLARI VE DENETÄ°M KRÄ°TERLERÄ°
-- ============================================================

-- UUID eklentisini etkinleÅŸtir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLO 1: tasks (GÃ¶rev Takip Tablosu)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- GÃ¶rev tanÄ±mlama
    task_code VARCHAR(50) NOT NULL UNIQUE,          -- Ã–rnek: STP-001, STP-002
    title VARCHAR(255) NOT NULL,                     -- GÃ¶rev baÅŸlÄ±ÄŸÄ±
    description TEXT,                                -- GÃ¶rev aÃ§Ä±klamasÄ±
    
    -- Atama ve sorumluluk
    assigned_to VARCHAR(100) NOT NULL,               -- Atanan ekip/kiÅŸi
    assigned_by VARCHAR(100) NOT NULL DEFAULT 'SISTEM', -- Atayan
    
    -- Durum yÃ¶netimi
    status VARCHAR(30) NOT NULL DEFAULT 'beklemede'
        CHECK (status IN (
            'beklemede',        -- HenÃ¼z baÅŸlanmadÄ±
            'devam_ediyor',     -- Ä°ÅŸlem sÃ¼rÃ¼yor
            'dogrulama',        -- DoÄŸrulama aÅŸamasÄ±nda
            'tamamlandi',       -- TamamlandÄ±
            'reddedildi',       -- Reddedildi
            'iptal'             -- Ä°ptal edildi
        )),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('kritik', 'yuksek', 'normal', 'dusuk')),
    
    -- KanÄ±t ve doÄŸrulama
    evidence_required BOOLEAN NOT NULL DEFAULT TRUE,  -- KanÄ±t zorunlu mu?
    evidence_provided BOOLEAN NOT NULL DEFAULT FALSE, -- KanÄ±t sunuldu mu?
    evidence_urls TEXT[],                              -- KanÄ±t dosya yollarÄ±
    
    -- Hata takibi
    error_code VARCHAR(30),                           -- ERR-STP001-XXX formatÄ±nda
    error_message TEXT,                                -- Hata mesajÄ±
    retry_count INTEGER NOT NULL DEFAULT 0,           -- Deneme sayÄ±sÄ± (max: 0)
    
    -- Zaman damgalarÄ±
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Ä°liÅŸkisel
    parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,      -- ArÅŸivlendi mi?
    
    -- Meta veri
    metadata JSONB DEFAULT '{}'::jsonb
);

-- tasks tablosu iÃ§in indeksler
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_task_code ON tasks(task_code);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_tasks_error_code ON tasks(error_code) WHERE error_code IS NOT NULL;

-- tasks tablosu iÃ§in updated_at otomatik gÃ¼ncelleme
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_tasks_updated_at();

-- ============================================================
-- TABLO 2: audit_logs (Denetim KayÄ±t Tablosu)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Ä°ÅŸlem tanÄ±mlama
    log_code VARCHAR(50) NOT NULL,                   -- Otomatik Ã¼retilen log kodu
    operation_type VARCHAR(30) NOT NULL
        CHECK (operation_type IN (
            'CREATE',       -- OluÅŸturma
            'UPDATE',       -- GÃ¼ncelleme
            'DELETE',       -- Silme
            'READ',         -- Okuma
            'EXECUTE',      -- YÃ¼rÃ¼tme
            'VALIDATE',     -- DoÄŸrulama
            'REJECT',       -- Reddetme
            'ERROR',        -- Hata
            'SYSTEM'        -- Sistem iÅŸlemi
        )),
    
    -- Ä°liÅŸkisel referans
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    table_name VARCHAR(100),                          -- Etkilenen tablo
    record_id UUID,                                   -- Etkilenen kayÄ±t ID
    
    -- Ä°ÅŸlem detaylarÄ±
    action_description TEXT NOT NULL,                  -- Ne yapÄ±ldÄ±
    action_location TEXT,                              -- Nerede yapÄ±ldÄ±
    action_output TEXT,                                -- Ã‡Ä±ktÄ± ne
    action_evidence TEXT,                              -- KanÄ±t ne
    
    -- Hata bilgisi
    error_code VARCHAR(30),                            -- ERR-STP001-XXX formatÄ±nda
    error_type VARCHAR(50),                            -- Hata tÃ¼rÃ¼
    error_severity VARCHAR(20) DEFAULT 'INFO'
        CHECK (error_severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL', 'FATAL')),
    
    -- Kim tarafÄ±ndan
    performed_by VARCHAR(100) NOT NULL DEFAULT 'SISTEM',
    authorized_by VARCHAR(100),
    
    -- Durum
    status VARCHAR(20) NOT NULL DEFAULT 'basarili'
        CHECK (status IN ('basarili', 'basarisiz', 'beklemede', 'iptal')),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,        -- Ã‡ift kontrol yapÄ±ldÄ± mÄ±?
    verified_by VARCHAR(100),                          -- Kim doÄŸruladÄ±
    verified_at TIMESTAMPTZ,                           -- Ne zaman doÄŸrulandÄ±
    
    -- Performans
    execution_duration_ms INTEGER,                     -- Ä°ÅŸlem sÃ¼resi (ms)
    
    -- Zaman damgalarÄ±
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- DeÄŸiÅŸmezlik (Immutability)
    -- Bu tablo sadece INSERT yapÄ±labilir, UPDATE ve DELETE yasaktÄ±r
    is_sealed BOOLEAN NOT NULL DEFAULT TRUE,           -- MÃ¼hÃ¼rlÃ¼ mÃ¼?
    
    -- Meta veri
    old_data JSONB,                                    -- Eski veri
    new_data JSONB,                                    -- Yeni veri
    metadata JSONB DEFAULT '{}'::jsonb
);

-- audit_logs tablosu iÃ§in indeksler
CREATE INDEX idx_audit_logs_task_id ON audit_logs(task_id);
CREATE INDEX idx_audit_logs_operation_type ON audit_logs(operation_type);
CREATE INDEX idx_audit_logs_error_code ON audit_logs(error_code) WHERE error_code IS NOT NULL;
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);
CREATE INDEX idx_audit_logs_error_severity ON audit_logs(error_severity) WHERE error_severity IN ('ERROR', 'CRITICAL', 'FATAL');

-- audit_logs tablosunda UPDATE ve DELETE engelleme
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Denetim kayÄ±tlarÄ± deÄŸiÅŸtirilemez veya silinemez. MÃ¼hÃ¼r bozulamaz.';
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

-- ============================================================
-- Otomatik denetim kaydÄ± fonksiyonu
-- tasks tablosundaki her deÄŸiÅŸiklik audit_logs'a yazÄ±lÄ±r
-- ============================================================
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_operation_type VARCHAR(30);
    v_description TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_operation_type := 'CREATE';
        v_description := 'Yeni gÃ¶rev oluÅŸturuldu: ' || NEW.task_code || ' - ' || NEW.title;
        
        INSERT INTO audit_logs (
            log_code, operation_type, task_id, table_name, record_id,
            action_description, new_data, performed_by
        ) VALUES (
            'LOG-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || LEFT(NEW.id::text, 8),
            v_operation_type, NEW.id, 'tasks', NEW.id,
            v_description, TO_JSONB(NEW), NEW.assigned_by
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        v_operation_type := 'UPDATE';
        v_description := 'GÃ¶rev gÃ¼ncellendi: ' || NEW.task_code || ' | Durum: ' || OLD.status || ' â†’ ' || NEW.status;
        
        INSERT INTO audit_logs (
            log_code, operation_type, task_id, table_name, record_id,
            action_description, old_data, new_data, performed_by
        ) VALUES (
            'LOG-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || LEFT(NEW.id::text, 8),
            v_operation_type, NEW.id, 'tasks', NEW.id,
            v_description, TO_JSONB(OLD), TO_JSONB(NEW), NEW.assigned_by
        );
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_task_changes
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_task_changes();

-- ============================================================
-- Row Level Security (RLS) PolitikalarÄ±
-- ============================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- tasks: Authenticated kullanÄ±cÄ±lar tam eriÅŸim
CREATE POLICY "tasks_full_access" ON tasks
    FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);

-- audit_logs: Sadece INSERT izni (SELECT herkes iÃ§in aÃ§Ä±k)
CREATE POLICY "audit_logs_select" ON audit_logs
    FOR SELECT
    USING (TRUE);

CREATE POLICY "audit_logs_insert" ON audit_logs
    FOR INSERT
    WITH CHECK (TRUE);

-- ============================================================
-- DOÄRULAMA: TablolarÄ±n var olduÄŸunu kontrol et
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
        RAISE NOTICE 'âœ… tasks tablosu baÅŸarÄ±yla oluÅŸturuldu';
    ELSE
        RAISE EXCEPTION 'âŒ tasks tablosu oluÅŸturulamadÄ±';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        RAISE NOTICE 'âœ… audit_logs tablosu baÅŸarÄ±yla oluÅŸturuldu';
    ELSE
        RAISE EXCEPTION 'âŒ audit_logs tablosu oluÅŸturulamadÄ±';
    END IF;
END;
$$;

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\02_is_alani\supabase_migration_001.sql
-- ============================================================
-- STP â€” EKSÄ°K TABLOLAR OLUÅTURMA MÄ°GRASYONU
-- Tarih: 10 Nisan 2026
-- Tablolar: board_decisions, notifications
-- Referans: boardService.ts, notificationService.ts
-- ============================================================

-- â”€â”€â”€ 1. BOARD_DECISIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE IF NOT EXISTS board_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('DEPLOYMENT','SCHEMA_CHANGE','SECURITY','ROLLBACK','CONFIG_CHANGE')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','sealed')),
  requested_by TEXT NOT NULL DEFAULT 'SISTEM',

  -- AI Agent OylarÄ± â€” Stratejik
  agent_strategic_vote TEXT,
  agent_strategic_reason TEXT,
  agent_strategic_confidence NUMERIC,
  agent_strategic_at TIMESTAMPTZ,

  -- AI Agent OylarÄ± â€” Teknik
  agent_technical_vote TEXT,
  agent_technical_reason TEXT,
  agent_technical_confidence NUMERIC,
  agent_technical_at TIMESTAMPTZ,

  -- AI Agent OylarÄ± â€” GÃ¼venlik
  agent_security_vote TEXT,
  agent_security_reason TEXT,
  agent_security_confidence NUMERIC,
  agent_security_at TIMESTAMPTZ,

  -- KonsensÃ¼s
  consensus_result JSONB,
  seal_hash TEXT,
  sealed_at TIMESTAMPTZ,
  vote_source TEXT CHECK (vote_source IN ('ai','local')),

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE board_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "board_decisions_select" ON board_decisions FOR SELECT USING (true);
CREATE POLICY "board_decisions_insert" ON board_decisions FOR INSERT WITH CHECK (true);
CREATE POLICY "board_decisions_update" ON board_decisions FOR UPDATE USING (true);

-- â”€â”€â”€ 2. NOTIFICATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','error','success')),
  is_read BOOLEAN DEFAULT false,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (true);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (true);

-- â”€â”€â”€ 3. TASKS TABLOSU CONSTRAINT KONTROLÃœ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- IEM-011: Status constraint eklenmeli (yoksa ekle)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'tasks_status_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
      CHECK (status IN ('beklemede','devam_ediyor','dogrulama','tamamlandi','reddedildi','iptal'));
  END IF;
END $$;

-- â”€â”€â”€ 4. DOÄRULAMA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('tasks','audit_logs','board_decisions','notifications')
ORDER BY table_name;

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\02_is_alani\supabase_migration_001_v_final_schema.sql
-- supabase/migrations/001_v_final_schema.sql
-- V-FINAL Eksik Tablolar
-- Supabase'de zaten var: alerts, detection_results, proof_cache, proofs
-- Bu dosya EKSÄ°K tablolarÄ± oluÅŸturur

-- â•â•â•â•â•â•â• PÄ°PELÄ°NE â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS commands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_text TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('telegram','panel','voice','api')),
  user_id TEXT NOT NULL,
  nonce TEXT UNIQUE NOT NULL,
  hash TEXT NOT NULL,
  confirmed BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'received',
  mode TEXT DEFAULT 'NORMAL' CHECK (mode IN ('STRICT','NORMAL','SAFE')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stp_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  reason TEXT,
  method TEXT,
  alternatives JSONB DEFAULT '[]',
  risk_score REAL DEFAULT 0,
  refutation JSONB DEFAULT '{}',
  conditions JSONB DEFAULT '[]',
  confidence REAL DEFAULT 0.5,
  entropy REAL DEFAULT 0,
  entropy_class TEXT DEFAULT 'medium',
  proof_level TEXT DEFAULT 'BOUNDED_VERIFIED',
  processing_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS formal_specs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  pre_conditions JSONB DEFAULT '[]',
  post_conditions JSONB DEFAULT '[]',
  invariants JSONB DEFAULT '[]',
  z3_input TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refutations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  red_team_result JSONB DEFAULT '{}',
  monte_carlo JSONB DEFAULT '{}',
  consensus_result TEXT CHECK (consensus_result IN ('proceed','halt','escalate')),
  quorum_votes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gate_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  gates JSONB NOT NULL,
  all_passed BOOLEAN DEFAULT false,
  failed_gate TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  status TEXT CHECK (status IN ('success','failed','rolled_back','killed')),
  result JSONB DEFAULT '{}',
  rollback_data JSONB,
  processing_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  state_before JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- â•â•â•â•â•â•â• GÃœVENLÄ°K & KONTROL â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS immutable_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  payload JSONB DEFAULT '{}',
  hash TEXT,
  prev_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- immutable_logs: DELETE/UPDATE yasak (A6)
CREATE OR REPLACE FUNCTION prevent_modify_logs()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  RAISE EXCEPTION 'immutable_logs degistirilemez (V-FINAL A6)';
END;
$func$;

DROP TRIGGER IF EXISTS no_update_logs ON immutable_logs;
CREATE TRIGGER no_update_logs
  BEFORE UPDATE OR DELETE ON immutable_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_modify_logs();

CREATE TABLE IF NOT EXISTS proof_chain (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  proof_hash TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  merkle_root TEXT,
  signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL,
  status TEXT CHECK (status IN ('healthy','degraded','down')),
  last_check TIMESTAMPTZ DEFAULT now(),
  details JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS global_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  rule_body JSONB NOT NULL,
  version INT DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rule_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id TEXT REFERENCES global_rules(rule_id),
  command_id UUID REFERENCES commands(id),
  result BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- â•â•â•â•â•â•â• OPERASYONEL â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value REAL NOT NULL,
  z_score REAL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS problem_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  severity TEXT,
  module TEXT,
  description TEXT,
  resolution TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS traceability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  from_module TEXT,
  to_module TEXT,
  data_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS config_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_by TEXT,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchdog_heartbeats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL,
  status TEXT DEFAULT 'alive',
  last_beat TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operator_certs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  cert_type TEXT,
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS fmea_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  failure_mode TEXT NOT NULL,
  severity INT,
  occurrence INT,
  detection INT,
  rpn INT GENERATED ALWAYS AS (severity * occurrence * detection) STORED,
  mitigation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS traces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trace_id TEXT NOT NULL,
  span_id TEXT,
  parent_span_id TEXT,
  module TEXT,
  operation TEXT,
  duration_ms INT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- â•â•â•â•â•â•â• INDEXLER â•â•â•â•â•â•â•

CREATE INDEX IF NOT EXISTS idx_commands_nonce     ON commands(nonce);
CREATE INDEX IF NOT EXISTS idx_commands_status    ON commands(status);
CREATE INDEX IF NOT EXISTS idx_proofs_command     ON proofs(command_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity    ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_immutable_logs_module ON immutable_logs(module);
CREATE INDEX IF NOT EXISTS idx_proof_cache_expires   ON proof_cache(expires_at);

-- â•â•â•â•â•â•â• RLS â•â•â•â•â•â•â•

ALTER TABLE commands       ENABLE ROW LEVEL SECURITY;
ALTER TABLE immutable_logs ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='commands' AND policyname='insert_commands') THEN
    CREATE POLICY insert_commands ON commands FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='immutable_logs' AND policyname='insert_logs') THEN
    CREATE POLICY insert_logs ON immutable_logs FOR INSERT WITH CHECK (true);
  END IF;
END $do$;

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\02_is_alani\supabase_migration_002.sql
-- ============================================================
-- STP Migration 002: Ä°ÅŸ Emri due_date Kolonu
-- Tarih: 13 Nisan 2026
-- Ä°ÅŸ Emri: EM-ALFA-01
-- Referans: STP-OPS-EMR-001
-- ============================================================
-- Bu migration mevcut verileri BOZMAZ.
-- Yeni kolon NULL default ile eklenir.
-- IF NOT EXISTS korumasÄ± aktif â€” tekrar Ã§alÄ±ÅŸtÄ±rÄ±labilir.
-- ============================================================

-- 1. due_date kolonu ekle
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- 2. Performans indeksi â€” sadece dolu due_date satÄ±rlarÄ±
CREATE INDEX IF NOT EXISTS idx_tasks_due_date
  ON tasks(due_date)
  WHERE due_date IS NOT NULL;

-- 3. DOÄRULAMA SORGUSU
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks' AND column_name = 'due_date';

-- Beklenen Ã§Ä±ktÄ±:
-- column_name | data_type                  | is_nullable
-- due_date    | timestamp with time zone   | YES

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\02_is_alani\supabase_migration_002_circuit_breaker.sql
-- supabase/migrations/002_circuit_breaker_state.sql
-- CircuitBreaker Supabase Persist â€” Serverless uyumu
-- circuitBreaker.ts loadFromDB/saveToDB fonksiyonlarÄ±nÄ±n kullandÄ±ÄŸÄ± tablo

CREATE TABLE IF NOT EXISTS circuit_breaker_state (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module     TEXT UNIQUE NOT NULL,        -- 'ollama_cb' vb.
  state_json JSONB NOT NULL DEFAULT '{}', -- CBDurum nesnesi
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- HÄ±zlÄ± modÃ¼l aramasÄ± iÃ§in index
CREATE INDEX IF NOT EXISTS idx_cb_state_module ON circuit_breaker_state(module);

-- RLS
ALTER TABLE circuit_breaker_state ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='circuit_breaker_state' AND policyname='cb_state_all') THEN
    CREATE POLICY cb_state_all ON circuit_breaker_state FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $do$;

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\02_is_alani\supabase_migration_003_command_archive.sql
-- ============================================================
-- KOMUT ARÅÄ°VÄ° TABLOSU â€” command_archive
-- ============================================================
-- Her komut (panel/telegram/sesli) burada arÅŸivlenir.
-- Tamamlanana kadar veya 45 gÃ¼n tutulur.
-- Otomatik temizleme: pg_cron ile 45 gÃ¼nden eski kayÄ±tlar silinir.
-- ============================================================

CREATE TABLE IF NOT EXISTS command_archive (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Komut bilgileri
  command_text TEXT NOT NULL,
  command_source VARCHAR(20) NOT NULL DEFAULT 'panel',  -- panel | telegram_text | telegram_voice | api
  command_status VARCHAR(20) NOT NULL DEFAULT 'received', -- received | processing | completed | failed | rejected | expired
  
  -- Kim verdi
  sender_name VARCHAR(100) NOT NULL DEFAULT 'KOMUTAN',
  sender_chat_id BIGINT,                                -- Telegram chat ID (nullable)
  
  -- BaÄŸlantÄ±lÄ± gÃ¶rev
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  task_code VARCHAR(50),
  
  -- AI analiz sonuÃ§larÄ±
  ai_priority VARCHAR(20),
  ai_confidence DECIMAL(3,2),
  ai_reasoning TEXT,
  ai_source VARCHAR(20),                                 -- local | ai
  
  -- Sesli komut doÄŸrulama
  voice_confirmed BOOLEAN DEFAULT NULL,                  -- NULL=yazÄ±lÄ±, TRUE=onaylandÄ±, FALSE=reddedildi
  voice_original_text TEXT,                              -- Whisper Ã§Ä±ktÄ±sÄ± (ham metin)
  
  -- Zaman damgalarÄ±
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '45 days'),
  
  -- Metadata (geniÅŸletilebilir)
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Ä°ndeksler
CREATE INDEX IF NOT EXISTS idx_command_archive_status ON command_archive(command_status);
CREATE INDEX IF NOT EXISTS idx_command_archive_source ON command_archive(command_source);
CREATE INDEX IF NOT EXISTS idx_command_archive_sender ON command_archive(sender_name);
CREATE INDEX IF NOT EXISTS idx_command_archive_created ON command_archive(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_archive_task ON command_archive(task_id);
CREATE INDEX IF NOT EXISTS idx_command_archive_expires ON command_archive(expires_at);

-- RLS: TÃ¼m authenticated ve anon kullanÄ±cÄ±lar okuyabilir/yazabilir
ALTER TABLE command_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "command_archive_select" ON command_archive
  FOR SELECT USING (true);
  
CREATE POLICY "command_archive_insert" ON command_archive
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "command_archive_update" ON command_archive
  FOR UPDATE USING (true);

-- Otomatik temizleme view'Ä± (45 gÃ¼nden eski + tamamlanmÄ±ÅŸ komutlar)
-- pg_cron yoksa manuel Ã§alÄ±ÅŸtÄ±rÄ±labilir
CREATE OR REPLACE FUNCTION cleanup_expired_commands()
RETURNS void AS $$
BEGIN
  DELETE FROM command_archive 
  WHERE expires_at < NOW() 
    AND command_status IN ('completed', 'failed', 'rejected', 'expired');
END;
$$ LANGUAGE plpgsql;

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\02_is_alani\supabase_migration_004_l0_tables.sql
-- ============================================================
-- STP Migration 004: L0 Gatekeeper TablolarÄ±
-- Tarih: 15 Nisan 2026
-- Tablolar: commands, immutable_logs
-- Referans: src/core/control_engine.ts â€” L0_GATEKEEPER
-- ============================================================
-- commands   : Replay korumasÄ± (nonce unique), ham girdi arÅŸivi
-- immutable_logs : Proof zinciri, denetim kaydÄ± (deÄŸiÅŸtirilemez)
-- ============================================================

-- â”€â”€â”€ 1. COMMANDS â€” L0 Girdi ArÅŸivi + Replay KorumasÄ± â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE IF NOT EXISTS commands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Ham girdi
  raw_text       TEXT NOT NULL,
  channel        VARCHAR(20) NOT NULL
                   CHECK (channel IN ('telegram', 'panel', 'voice', 'api')),

  -- OperatÃ¶r
  user_id        TEXT NOT NULL,           -- Telegram chat_id veya panel user_id

  -- Replay korumasÄ±
  nonce          TEXT NOT NULL UNIQUE,    -- tg-{chatId}-{messageId} â€” tekrar kullanÄ±lamaz
  hash           TEXT NOT NULL,           -- SHA-256(sanitized + nonce + timestamp)

  -- Ses/yazÄ± ayrÄ±mÄ±
  confirmed      BOOLEAN NOT NULL DEFAULT true,   -- yazÄ± â†’ auto-confirm, ses â†’ false
  status         VARCHAR(30) NOT NULL DEFAULT 'received'
                   CHECK (status IN (
                     'received',
                     'voice_pending',
                     'processing',
                     'completed',
                     'failed',
                     'rejected',
                     'expired'
                   )),

  -- Zamanlama
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Ä°ndeksler
CREATE INDEX IF NOT EXISTS idx_commands_nonce    ON commands(nonce);
CREATE INDEX IF NOT EXISTS idx_commands_user     ON commands(user_id);
CREATE INDEX IF NOT EXISTS idx_commands_channel  ON commands(channel);
CREATE INDEX IF NOT EXISTS idx_commands_status   ON commands(status);
CREATE INDEX IF NOT EXISTS idx_commands_created  ON commands(created_at DESC);

-- RLS
ALTER TABLE commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commands_select" ON commands
  FOR SELECT USING (true);

CREATE POLICY "commands_insert" ON commands
  FOR INSERT WITH CHECK (true);

CREATE POLICY "commands_update" ON commands
  FOR UPDATE USING (true);

-- â”€â”€â”€ 2. IMMUTABLE_LOGS â€” Proof Zinciri (DeÄŸiÅŸtirilemez) â”€â”€â”€â”€â”€

CREATE TABLE IF NOT EXISTS immutable_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Kaynak modÃ¼l ve olay
  module         VARCHAR(20) NOT NULL,    -- K1, K2, K3 vb.
  event_type     TEXT NOT NULL,           -- HERMAI_INPUT_ARCHIVE, L0_PASS, L0_REJECT vb.
  severity       VARCHAR(10) NOT NULL DEFAULT 'info'
                   CHECK (severity IN ('info', 'warning', 'error', 'critical')),

  -- Ä°Ã§erik
  payload        JSONB NOT NULL DEFAULT '{}',

  -- Proof zinciri
  hash           TEXT NOT NULL,           -- Bu kaydÄ±n SHA-256 hash'i
  prev_hash      TEXT NOT NULL DEFAULT '', -- Ã–nceki kaydÄ±n hash'i (chain bÃ¼tÃ¼nlÃ¼ÄŸÃ¼)

  -- Salt okunur zaman damgasÄ±
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Ä°ndeksler
CREATE INDEX IF NOT EXISTS idx_immutable_logs_module     ON immutable_logs(module);
CREATE INDEX IF NOT EXISTS idx_immutable_logs_event_type ON immutable_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_immutable_logs_severity   ON immutable_logs(severity);
CREATE INDEX IF NOT EXISTS idx_immutable_logs_created    ON immutable_logs(created_at DESC);

-- RLS â€” SADECE INSERT, hiÃ§bir zaman UPDATE/DELETE
ALTER TABLE immutable_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "immutable_logs_select" ON immutable_logs
  FOR SELECT USING (true);

CREATE POLICY "immutable_logs_insert" ON immutable_logs
  FOR INSERT WITH CHECK (true);

-- NOT: immutable_logs iÃ§in UPDATE ve DELETE policy'si KASITLI OLARAK YOK.
--      Bu tablo audit zinciridir â€” deÄŸiÅŸtirilemez, silinemez.

-- â”€â”€â”€ 3. DOÄRULAMA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('commands', 'immutable_logs')
ORDER BY table_name;
-- Beklenen Ã§Ä±ktÄ±:
--  commands
--  immutable_logs

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\02_is_alani\supabase_migration_005_stp_outputs.sql
-- ============================================================
-- STP Migration 005: STP Ã‡Ä±ktÄ± Tablosu
-- Tarih: 15 Nisan 2026
-- Tablo: stp_outputs
-- Referans: src/core/hermAI/analysisEngine.ts â€” runSTPAnalysis()
-- ============================================================
-- K2.1 STP analiz sonuÃ§larÄ±nÄ± arÅŸivler.
-- A6 aksiyomu gereÄŸi her analiz kaydedilir.
-- commands.id ile baÄŸlantÄ±lÄ±dÄ±r (L0 â†’ K2.1 zinciri).
-- ============================================================

CREATE TABLE IF NOT EXISTS stp_outputs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- L0 ile baÄŸlantÄ± (replay-safe zincir)
  command_id      UUID REFERENCES commands(id) ON DELETE SET NULL,

  -- K2.1 Analiz Ã‡Ä±ktÄ±sÄ±
  reason          TEXT,
  method          TEXT,
  alternatives    JSONB    NOT NULL DEFAULT '[]',
  risk_score      DECIMAL(4,3),
  refutation      JSONB    NOT NULL DEFAULT '{}',
  conditions      JSONB    NOT NULL DEFAULT '[]',
  questions       JSONB    NOT NULL DEFAULT '[]',  -- Kural #74: 3 eleÅŸtirel soru

  -- Metrikler
  confidence      DECIMAL(4,3) CHECK (confidence BETWEEN 0 AND 1),
  entropy         DECIMAL(6,4),
  entropy_class   VARCHAR(10)  CHECK (entropy_class IN ('low', 'medium', 'high')),

  -- Proof seviyesi (V-FINAL doktrin)
  proof_level     VARCHAR(30)  CHECK (proof_level IN (
                    'PROVEN',
                    'VALIDATED',
                    'BOUNDED_VERIFIED',
                    'GODEL_LIMIT'
                  )),

  -- Performans
  processing_ms   INTEGER,

  -- AI saÄŸlayÄ±cÄ± (Ollama/openai/local)
  ai_provider     VARCHAR(20),

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Ä°ndeksler
CREATE INDEX IF NOT EXISTS idx_stp_outputs_command   ON stp_outputs(command_id);
CREATE INDEX IF NOT EXISTS idx_stp_outputs_proof     ON stp_outputs(proof_level);
CREATE INDEX IF NOT EXISTS idx_stp_outputs_entropy   ON stp_outputs(entropy_class);
CREATE INDEX IF NOT EXISTS idx_stp_outputs_created   ON stp_outputs(created_at DESC);

-- RLS
ALTER TABLE stp_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stp_outputs_select" ON stp_outputs
  FOR SELECT USING (true);

CREATE POLICY "stp_outputs_insert" ON stp_outputs
  FOR INSERT WITH CHECK (true);

-- â”€â”€â”€ DOÄRULAMA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'stp_outputs';
-- Beklenen: stp_outputs

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\02_is_alani\supabase_migration_006_pipeline_tables.sql
-- ============================================================
-- STP Migration 006: V-FINAL Pipeline TablolarÄ±
-- Tarih: 15 Nisan 2026
-- Referans: V-FINAL Doktrin â€” 21 yeni tablo
-- ============================================================
-- commands, immutable_logs, stp_outputs â†’ MEVCUT, ATLANDÄ°
-- Bu migration SADECE eksik tablolarÄ± ekler.
-- ============================================================

-- â”€â”€ commands tablosuna mode kolonu ekle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE commands
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'NORMAL'
    CHECK (mode IN ('STRICT', 'NORMAL', 'SAFE'));

-- â”€â”€ immutable_logs: DELETE/UPDATE engel trigger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION prevent_modify_immutable_logs()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'immutable_logs tablosu deÄŸiÅŸtirilemez (V-FINAL A6)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_update_immutable_logs ON immutable_logs;
CREATE TRIGGER no_update_immutable_logs
  BEFORE UPDATE OR DELETE ON immutable_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_modify_immutable_logs();

-- â•â•â•â•â•â•â• PÄ°PELÄ°NE TABLOLARI â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS detection_results (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id       UUID REFERENCES commands(id) ON DELETE SET NULL,
  criteria_results JSONB NOT NULL DEFAULT '{}',
  micro_controls   JSONB DEFAULT '{}',
  meta_score       INT DEFAULT 0,
  gaps             JSONB DEFAULT '[]',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_detection_results_command ON detection_results(command_id);

CREATE TABLE IF NOT EXISTS formal_specs (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id       UUID REFERENCES commands(id) ON DELETE SET NULL,
  pre_conditions   JSONB DEFAULT '[]',
  post_conditions  JSONB DEFAULT '[]',
  invariants       JSONB DEFAULT '[]',
  z3_input         TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_formal_specs_command ON formal_specs(command_id);

CREATE TABLE IF NOT EXISTS proofs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id     UUID REFERENCES commands(id) ON DELETE SET NULL,
  result         TEXT CHECK (result IN ('valid','invalid','timeout','pending')),
  proof_object   JSONB DEFAULT '{}',
  verifier_a     JSONB DEFAULT '{}',
  verifier_b     JSONB DEFAULT '{}',
  match          BOOLEAN DEFAULT false,
  processing_ms  INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proofs_command ON proofs(command_id);
CREATE INDEX IF NOT EXISTS idx_proofs_result  ON proofs(result);

CREATE TABLE IF NOT EXISTS refutations (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id       UUID REFERENCES commands(id) ON DELETE SET NULL,
  red_team_result  JSONB DEFAULT '{}',
  monte_carlo      JSONB DEFAULT '{}',
  consensus_result TEXT CHECK (consensus_result IN ('proceed','halt','escalate')),
  quorum_votes     JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refutations_command ON refutations(command_id);

CREATE TABLE IF NOT EXISTS gate_results (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id   UUID REFERENCES commands(id) ON DELETE SET NULL,
  gates        JSONB NOT NULL DEFAULT '{}',
  all_passed   BOOLEAN DEFAULT false,
  failed_gate  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gate_results_command ON gate_results(command_id);

CREATE TABLE IF NOT EXISTS executions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id     UUID REFERENCES commands(id) ON DELETE SET NULL,
  status         TEXT CHECK (status IN ('success','failed','rolled_back','killed')),
  result         JSONB DEFAULT '{}',
  rollback_data  JSONB,
  processing_ms  INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_executions_command ON executions(command_id);

CREATE TABLE IF NOT EXISTS snapshots (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id   UUID REFERENCES commands(id) ON DELETE SET NULL,
  state_before JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proof_chain (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id   UUID REFERENCES commands(id) ON DELETE SET NULL,
  proof_hash   TEXT NOT NULL,
  prev_hash    TEXT NOT NULL,
  merkle_root  TEXT,
  signature    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proof_chain_command ON proof_chain(command_id);

-- â•â•â•â•â•â•â• GÃœVENLÄ°K & KONTROL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS alerts (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  severity       INT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  rule_triggered TEXT,
  fail_level     TEXT,
  module         TEXT,
  details        JSONB DEFAULT '{}',
  resolved       BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_severity  ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved  ON alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_module    ON alerts(module);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_select" ON alerts FOR SELECT USING (true);
CREATE POLICY "alerts_insert" ON alerts FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS health_status (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module      TEXT NOT NULL,
  status      TEXT CHECK (status IN ('healthy','degraded','down')),
  last_check  TIMESTAMPTZ DEFAULT NOW(),
  details     JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_health_status_module ON health_status(module);

CREATE TABLE IF NOT EXISTS global_rules (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id     TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  priority    TEXT NOT NULL,
  rule_body   JSONB NOT NULL DEFAULT '{}',
  version     INT DEFAULT 1,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rule_triggers (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id     TEXT REFERENCES global_rules(rule_id) ON DELETE SET NULL,
  command_id  UUID REFERENCES commands(id) ON DELETE SET NULL,
  result      BOOLEAN,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- â•â•â•â•â•â•â• OPERASYONEL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS performance_metrics (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module       TEXT NOT NULL,
  metric_name  TEXT NOT NULL,
  value        REAL NOT NULL,
  z_score      REAL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_module ON performance_metrics(module);

CREATE TABLE IF NOT EXISTS problem_reports (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  severity     TEXT,
  module       TEXT,
  description  TEXT,
  resolution   TEXT,
  status       TEXT DEFAULT 'open',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS traceability (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id   UUID REFERENCES commands(id) ON DELETE SET NULL,
  from_module  TEXT,
  to_module    TEXT,
  data_hash    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS config_changes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key         TEXT NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  changed_by  TEXT,
  approved    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchdog_heartbeats (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module    TEXT NOT NULL,
  status    TEXT DEFAULT 'alive',
  last_beat TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_watchdog_module ON watchdog_heartbeats(module);

CREATE TABLE IF NOT EXISTS operator_certs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    TEXT NOT NULL,
  cert_type  TEXT,
  issued_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  active     BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS fmea_records (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  failure_mode  TEXT NOT NULL,
  severity      INT,
  occurrence    INT,
  detection     INT,
  rpn           INT GENERATED ALWAYS AS (severity * occurrence * detection) STORED,
  mitigation    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS traces (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trace_id        TEXT NOT NULL,
  span_id         TEXT,
  parent_span_id  TEXT,
  module          TEXT,
  operation       TEXT,
  duration_ms     INT,
  status          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_traces_trace_id ON traces(trace_id);

-- â•â•â•â•â•â•â• PROOF CACHE (Redis yerine Supabase) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

CREATE TABLE IF NOT EXISTS proof_cache (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key     TEXT UNIQUE NOT NULL,
  proof_result  JSONB NOT NULL DEFAULT '{}',
  opa_version   TEXT NOT NULL DEFAULT 'v1.0',
  z3_version    TEXT DEFAULT 'zod-v1',
  expires_at    TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_proof_cache_expires  ON proof_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_proof_cache_key      ON proof_cache(cache_key);

-- RLS
ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proofs_select" ON proofs FOR SELECT USING (true);
CREATE POLICY "proofs_insert" ON proofs FOR INSERT WITH CHECK (true);
CREATE POLICY "proofs_update" ON proofs FOR UPDATE USING (true);

-- â•â•â•â•â•â•â• DOÄRULAMA â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'commands','immutable_logs','stp_outputs',
    'detection_results','formal_specs','proofs','refutations',
    'gate_results','executions','snapshots','proof_chain',
    'alerts','health_status','global_rules','rule_triggers',
    'performance_metrics','problem_reports','traceability',
    'config_changes','watchdog_heartbeats','operator_certs',
    'fmea_records','traces','proof_cache'
  )
ORDER BY table_name;
-- Beklenen: 24 satÄ±r

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\02_is_alani\supabase_migration_007_audit_logs.sql
-- supabase_migration_007_audit_logs.sql
-- audit_logs tablosu â€” auditService.ts tarafÄ±ndan kullanÄ±lÄ±yor
-- proofChain.ts â†’ logAudit() â†’ auditService.ts â†’ audit_logs
-- Schema: 6 alan (log_id, task_id, action_code, details, operator_id, timestamp)

CREATE TABLE IF NOT EXISTS audit_logs (
    log_id      BIGSERIAL PRIMARY KEY,
    task_id     UUID,
    action_code VARCHAR(100) NOT NULL,
    details     JSONB        NOT NULL DEFAULT '{}',
    operator_id VARCHAR(100),
    timestamp   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Ä°ndeksler â€” performans
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_code
    ON audit_logs(action_code);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
    ON audit_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_task_id
    ON audit_logs(task_id)
    WHERE task_id IS NOT NULL;

-- JSONB indeksi â€” proofChain.ts action_code filtresi iÃ§in
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

-- NOT: audit_logs IMMUTABLE â€” DELETE ve UPDATE politikasÄ± yok (A6)

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\02_is_alani\supabase_migration_008_pipeline_gates.sql
-- ============================================================
-- Migration 008: Pipeline Gate Onay Sistemi
-- ============================================================
-- G-1 (GÃ¶rev Anlama), G-2 (Ä°ÅŸ PlanÄ±), G-6 (KanÄ±t), G-7 (Ä°nsan Onay)
-- kapÄ±larÄ± iÃ§in durum ve onay tablosu.
--
-- Pipeline ara durakta ESCALATED dÃ¶ndÃ¼ÄŸÃ¼nde, tÃ¼m intermediate
-- sonuÃ§lar bu tabloya yazÄ±lÄ±r. KullanÄ±cÄ± KABUL/RED verdiÄŸinde
-- pipeline kaldÄ±ÄŸÄ± yerden devam eder.
-- ============================================================

-- 1. Pipeline checkpoint tablosu (intermediate state)
CREATE TABLE IF NOT EXISTS pipeline_checkpoints (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_id      UUID NOT NULL REFERENCES commands(id),
    gate_id         TEXT NOT NULL CHECK (gate_id IN ('G1_UNDERSTANDING', 'G2_PLAN', 'G6_EVIDENCE', 'G7_HUMAN_APPROVAL')),
    status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),

    -- G-1: GÃ¶rev Anlama â€” sistemin anladÄ±ÄŸÄ±
    understanding   JSONB,

    -- G-2: Ä°ÅŸ PlanÄ±
    plan            JSONB,

    -- G-6: KanÄ±t
    evidence        JSONB,

    -- G-7: Ä°nsan onay â€” pipeline Ã¶zet raporu
    approval_report JSONB,

    -- Pipeline state (resume iÃ§in)
    pipeline_state  JSONB NOT NULL DEFAULT '{}',

    -- Meta
    mode            TEXT NOT NULL DEFAULT 'NORMAL',
    created_by      TEXT,
    decided_by      TEXT,
    decided_at      TIMESTAMPTZ,
    reject_reason   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 minutes')
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_pipeline_checkpoints_command ON pipeline_checkpoints(command_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_checkpoints_status  ON pipeline_checkpoints(status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_pipeline_checkpoints_gate    ON pipeline_checkpoints(gate_id);

-- RLS
ALTER TABLE pipeline_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_checkpoints_all" ON pipeline_checkpoints
    FOR ALL USING (true) WITH CHECK (true);

-- 2. KanÄ±t tablosu (G-6 detay)
CREATE TABLE IF NOT EXISTS pipeline_evidence (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_id      UUID NOT NULL REFERENCES commands(id),
    evidence_type   TEXT NOT NULL CHECK (evidence_type IN ('terminal_output', 'screenshot', 'url_check', 'db_state', 'file_hash', 'api_response')),
    content         JSONB NOT NULL DEFAULT '{}',
    hash            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_evidence_command ON pipeline_evidence(command_id);

ALTER TABLE pipeline_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_evidence_all" ON pipeline_evidence
    FOR ALL USING (true) WITH CHECK (true);

-- END SOURCE

-- BEGIN SOURCE: C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\02_is_alani\supabase_migration_009_hub_messages.sql
-- ============================================================
-- MIGRATION 009 â€” hub_messages TABLOSU
-- ============================================================
-- R1 DÃœZELTMESÄ°: EventBus in-memory â†’ DB persist + okuma.
-- Vercel serverless cold start sonrasÄ± veri kaybÄ±nÄ± engeller.
--
-- Tarih: 2026-04-18
-- Tablo: hub_messages
-- ============================================================

-- â”€â”€ TABLO OLUÅTUR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS hub_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    VARCHAR(50) NOT NULL UNIQUE,
  source        VARCHAR(100),
  target        VARCHAR(100),
  text          TEXT NOT NULL,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- â”€â”€ Ä°NDEKSLER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE INDEX IF NOT EXISTS idx_hub_messages_timestamp
  ON hub_messages (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_hub_messages_source
  ON hub_messages (source)
  WHERE source IS NOT NULL;

-- â”€â”€ TEMÄ°ZLÄ°K POLÄ°TÄ°KASI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 30 gÃ¼nden eski mesajlarÄ± temizlemek iÃ§in:
-- DELETE FROM hub_messages WHERE timestamp < NOW() - INTERVAL '30 days';

-- â”€â”€ RLS POLÄ°TÄ°KASI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE hub_messages ENABLE ROW LEVEL SECURITY;

-- Okuma: Herkes okuyabilir (anon key)
CREATE POLICY "hub_messages_select_all"
  ON hub_messages FOR SELECT
  USING (true);

-- Yazma: Herkes yazabilir (anon key â€” server-side route korumalÄ±)
CREATE POLICY "hub_messages_insert_all"
  ON hub_messages FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- UYGULAMA:
-- Supabase Dashboard â†’ SQL Editor â†’ Bu SQL'i Ã§alÄ±ÅŸtÄ±rÄ±n.
-- ============================================================

-- END SOURCE

