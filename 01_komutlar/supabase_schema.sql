-- ============================================================
-- STP-001 SUPABASE TABLO ŞEMASI
-- Oluşturma Tarihi: 2026-04-08
-- Doktrin: SİSTEM KURALLARI VE DENETİM KRİTERLERİ
-- ============================================================

-- UUID eklentisini etkinleştir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLO 1: tasks (Görev Takip Tablosu)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Görev tanımlama
    task_code VARCHAR(50) NOT NULL UNIQUE,          -- Örnek: STP-001, STP-002
    title VARCHAR(255) NOT NULL,                     -- Görev başlığı
    description TEXT,                                -- Görev açıklaması
    
    -- Atama ve sorumluluk
    assigned_to VARCHAR(100) NOT NULL,               -- Atanan ekip/kişi
    assigned_by VARCHAR(100) NOT NULL DEFAULT 'SISTEM', -- Atayan
    
    -- Durum yönetimi
    status VARCHAR(30) NOT NULL DEFAULT 'beklemede'
        CHECK (status IN (
            'beklemede',        -- Henüz başlanmadı
            'devam_ediyor',     -- İşlem sürüyor
            'dogrulama',        -- Doğrulama aşamasında
            'tamamlandi',       -- Tamamlandı
            'reddedildi',       -- Reddedildi
            'iptal'             -- İptal edildi
        )),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('kritik', 'yuksek', 'normal', 'dusuk')),
    
    -- Kanıt ve doğrulama
    evidence_required BOOLEAN NOT NULL DEFAULT TRUE,  -- Kanıt zorunlu mu?
    evidence_provided BOOLEAN NOT NULL DEFAULT FALSE, -- Kanıt sunuldu mu?
    evidence_urls TEXT[],                              -- Kanıt dosya yolları
    
    -- Hata takibi
    error_code VARCHAR(30),                           -- ERR-STP001-XXX formatında
    error_message TEXT,                                -- Hata mesajı
    retry_count INTEGER NOT NULL DEFAULT 0,           -- Deneme sayısı (max: 0)
    
    -- Zaman damgaları
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- İlişkisel
    parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    
    -- Meta veri
    metadata JSONB DEFAULT '{}'::jsonb
);

-- tasks tablosu için indeksler
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_task_code ON tasks(task_code);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_tasks_error_code ON tasks(error_code) WHERE error_code IS NOT NULL;

-- tasks tablosu için updated_at otomatik güncelleme
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
-- TABLO 2: audit_logs (Denetim Kayıt Tablosu)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- İşlem tanımlama
    log_code VARCHAR(50) NOT NULL,                   -- Otomatik üretilen log kodu
    operation_type VARCHAR(30) NOT NULL
        CHECK (operation_type IN (
            'CREATE',       -- Oluşturma
            'UPDATE',       -- Güncelleme
            'DELETE',       -- Silme
            'READ',         -- Okuma
            'EXECUTE',      -- Yürütme
            'VALIDATE',     -- Doğrulama
            'REJECT',       -- Reddetme
            'ERROR',        -- Hata
            'SYSTEM'        -- Sistem işlemi
        )),
    
    -- İlişkisel referans
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    table_name VARCHAR(100),                          -- Etkilenen tablo
    record_id UUID,                                   -- Etkilenen kayıt ID
    
    -- İşlem detayları
    action_description TEXT NOT NULL,                  -- Ne yapıldı
    action_location TEXT,                              -- Nerede yapıldı
    action_output TEXT,                                -- Çıktı ne
    action_evidence TEXT,                              -- Kanıt ne
    
    -- Hata bilgisi
    error_code VARCHAR(30),                            -- ERR-STP001-XXX formatında
    error_type VARCHAR(50),                            -- Hata türü
    error_severity VARCHAR(20) DEFAULT 'INFO'
        CHECK (error_severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL', 'FATAL')),
    
    -- Kim tarafından
    performed_by VARCHAR(100) NOT NULL DEFAULT 'SISTEM',
    authorized_by VARCHAR(100),
    
    -- Durum
    status VARCHAR(20) NOT NULL DEFAULT 'basarili'
        CHECK (status IN ('basarili', 'basarisiz', 'beklemede', 'iptal')),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,        -- Çift kontrol yapıldı mı?
    verified_by VARCHAR(100),                          -- Kim doğruladı
    verified_at TIMESTAMPTZ,                           -- Ne zaman doğrulandı
    
    -- Performans
    execution_duration_ms INTEGER,                     -- İşlem süresi (ms)
    
    -- Zaman damgaları
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Değişmezlik (Immutability)
    -- Bu tablo sadece INSERT yapılabilir, UPDATE ve DELETE yasaktır
    is_sealed BOOLEAN NOT NULL DEFAULT TRUE,           -- Mühürlü mü?
    
    -- Meta veri
    old_data JSONB,                                    -- Eski veri
    new_data JSONB,                                    -- Yeni veri
    metadata JSONB DEFAULT '{}'::jsonb
);

-- audit_logs tablosu için indeksler
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
    RAISE EXCEPTION 'Denetim kayıtları değiştirilemez veya silinemez. Mühür bozulamaz.';
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
-- Otomatik denetim kaydı fonksiyonu
-- tasks tablosundaki her değişiklik audit_logs'a yazılır
-- ============================================================
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_operation_type VARCHAR(30);
    v_description TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_operation_type := 'CREATE';
        v_description := 'Yeni görev oluşturuldu: ' || NEW.task_code || ' - ' || NEW.title;
        
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
        v_description := 'Görev güncellendi: ' || NEW.task_code || ' | Durum: ' || OLD.status || ' → ' || NEW.status;
        
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
-- Row Level Security (RLS) Politikaları
-- ============================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- tasks: Authenticated kullanıcılar tam erişim
CREATE POLICY "tasks_full_access" ON tasks
    FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);

-- audit_logs: Sadece INSERT izni (SELECT herkes için açık)
CREATE POLICY "audit_logs_select" ON audit_logs
    FOR SELECT
    USING (TRUE);

CREATE POLICY "audit_logs_insert" ON audit_logs
    FOR INSERT
    WITH CHECK (TRUE);

-- ============================================================
-- DOĞRULAMA: Tabloların var olduğunu kontrol et
-- ============================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
        RAISE NOTICE '✅ tasks tablosu başarıyla oluşturuldu';
    ELSE
        RAISE EXCEPTION '❌ tasks tablosu oluşturulamadı';
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        RAISE NOTICE '✅ audit_logs tablosu başarıyla oluşturuldu';
    ELSE
        RAISE EXCEPTION '❌ audit_logs tablosu oluşturulamadı';
    END IF;
END;
$$;
