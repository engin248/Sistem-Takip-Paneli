-- ============================================================
-- STP Migration 004: L0 Gatekeeper Tabloları
-- Tarih: 15 Nisan 2026
-- Tablolar: commands, immutable_logs
-- Referans: src/core/control_engine.ts — L0_GATEKEEPER
-- ============================================================
-- commands   : Replay koruması (nonce unique), ham girdi arşivi
-- immutable_logs : Proof zinciri, denetim kaydı (değiştirilemez)
-- ============================================================

-- ─── 1. COMMANDS — L0 Girdi Arşivi + Replay Koruması ────────

CREATE TABLE IF NOT EXISTS commands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Ham girdi
  raw_text       TEXT NOT NULL,
  channel        VARCHAR(20) NOT NULL
                   CHECK (channel IN ('telegram', 'panel', 'voice', 'api')),

  -- Operatör
  user_id        TEXT NOT NULL,           -- Telegram chat_id veya panel user_id

  -- Replay koruması
  nonce          TEXT NOT NULL UNIQUE,    -- tg-{chatId}-{messageId} — tekrar kullanılamaz
  hash           TEXT NOT NULL,           -- SHA-256(sanitized + nonce + timestamp)

  -- Ses/yazı ayrımı
  confirmed      BOOLEAN NOT NULL DEFAULT true,   -- yazı → auto-confirm, ses → false
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

-- İndeksler
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

-- ─── 2. IMMUTABLE_LOGS — Proof Zinciri (Değiştirilemez) ─────

CREATE TABLE IF NOT EXISTS immutable_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Kaynak modül ve olay
  module         VARCHAR(20) NOT NULL,    -- K1, K2, K3 vb.
  event_type     TEXT NOT NULL,           -- HERMAI_INPUT_ARCHIVE, L0_PASS, L0_REJECT vb.
  severity       VARCHAR(10) NOT NULL DEFAULT 'info'
                   CHECK (severity IN ('info', 'warning', 'error', 'critical')),

  -- İçerik
  payload        JSONB NOT NULL DEFAULT '{}',

  -- Proof zinciri
  hash           TEXT NOT NULL,           -- Bu kaydın SHA-256 hash'i
  prev_hash      TEXT NOT NULL DEFAULT '', -- Önceki kaydın hash'i (chain bütünlüğü)

  -- Salt okunur zaman damgası
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_immutable_logs_module     ON immutable_logs(module);
CREATE INDEX IF NOT EXISTS idx_immutable_logs_event_type ON immutable_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_immutable_logs_severity   ON immutable_logs(severity);
CREATE INDEX IF NOT EXISTS idx_immutable_logs_created    ON immutable_logs(created_at DESC);

-- RLS — SADECE INSERT, hiçbir zaman UPDATE/DELETE
ALTER TABLE immutable_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "immutable_logs_select" ON immutable_logs
  FOR SELECT USING (true);

CREATE POLICY "immutable_logs_insert" ON immutable_logs
  FOR INSERT WITH CHECK (true);

-- NOT: immutable_logs için UPDATE ve DELETE policy'si KASITLI OLARAK YOK.
--      Bu tablo audit zinciridir — değiştirilemez, silinemez.

-- ─── 3. DOĞRULAMA ────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('commands', 'immutable_logs')
ORDER BY table_name;
-- Beklenen çıktı:
--  commands
--  immutable_logs
