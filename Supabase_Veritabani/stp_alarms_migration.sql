-- ============================================================
-- MIGRATION: stp_alarms tablosu
-- ============================================================
-- Alarm servisi kalıcılığı için gerekli tablo.
-- alarmService.ts bu tabloyu birincil depo olarak kullanır.
-- In-memory Map, bu tablodan yüklenen cache katmanıdır.
--
-- Çalıştır: Supabase SQL Editor'da bir kez
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

-- Sadece giriş yapmış kullanıcılar okuyabilir
CREATE POLICY "alarms_select_authenticated"
  ON stp_alarms FOR SELECT
  TO authenticated
  USING (true);

-- Sadece giriş yapmış kullanıcılar oluşturabilir
CREATE POLICY "alarms_insert_authenticated"
  ON stp_alarms FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Sadece giriş yapmış kullanıcılar güncelleyebilir
CREATE POLICY "alarms_update_authenticated"
  ON stp_alarms FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role tam erişim (server-side API routes için)
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

-- İndeks: modul + durum sorgularını hızlandırır
CREATE INDEX IF NOT EXISTS idx_stp_alarms_modul_durum
  ON stp_alarms (modul, durum);

CREATE INDEX IF NOT EXISTS idx_stp_alarms_seviye_durum
  ON stp_alarms (seviye, durum);
