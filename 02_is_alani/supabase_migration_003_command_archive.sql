-- ============================================================
-- KOMUT ARŞİVİ TABLOSU — command_archive
-- ============================================================
-- Her komut (panel/telegram/sesli) burada arşivlenir.
-- Tamamlanana kadar veya 45 gün tutulur.
-- Otomatik temizleme: pg_cron ile 45 günden eski kayıtlar silinir.
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
  
  -- Bağlantılı görev
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  task_code VARCHAR(50),
  
  -- AI analiz sonuçları
  ai_priority VARCHAR(20),
  ai_confidence DECIMAL(3,2),
  ai_reasoning TEXT,
  ai_source VARCHAR(20),                                 -- local | ai
  
  -- Sesli komut doğrulama
  voice_confirmed BOOLEAN DEFAULT NULL,                  -- NULL=yazılı, TRUE=onaylandı, FALSE=reddedildi
  voice_original_text TEXT,                              -- Whisper çıktısı (ham metin)
  
  -- Zaman damgaları
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '45 days'),
  
  -- Metadata (genişletilebilir)
  metadata JSONB DEFAULT '{}'::jsonb
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_command_archive_status ON command_archive(command_status);
CREATE INDEX IF NOT EXISTS idx_command_archive_source ON command_archive(command_source);
CREATE INDEX IF NOT EXISTS idx_command_archive_sender ON command_archive(sender_name);
CREATE INDEX IF NOT EXISTS idx_command_archive_created ON command_archive(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_archive_task ON command_archive(task_id);
CREATE INDEX IF NOT EXISTS idx_command_archive_expires ON command_archive(expires_at);

-- RLS: Tüm authenticated ve anon kullanıcılar okuyabilir/yazabilir
ALTER TABLE command_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "command_archive_select" ON command_archive
  FOR SELECT USING (true);
  
CREATE POLICY "command_archive_insert" ON command_archive
  FOR INSERT WITH CHECK (true);
  
CREATE POLICY "command_archive_update" ON command_archive
  FOR UPDATE USING (true);

-- Otomatik temizleme view'ı (45 günden eski + tamamlanmış komutlar)
-- pg_cron yoksa manuel çalıştırılabilir
CREATE OR REPLACE FUNCTION cleanup_expired_commands()
RETURNS void AS $$
BEGIN
  DELETE FROM command_archive 
  WHERE expires_at < NOW() 
    AND command_status IN ('completed', 'failed', 'rejected', 'expired');
END;
$$ LANGUAGE plpgsql;
