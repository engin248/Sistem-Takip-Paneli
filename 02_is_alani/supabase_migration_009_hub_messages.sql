-- ============================================================
-- MIGRATION 009 — hub_messages TABLOSU
-- ============================================================
-- R1 DÜZELTMESİ: EventBus in-memory → DB persist + okuma.
-- Vercel serverless cold start sonrası veri kaybını engeller.
--
-- Tarih: 2026-04-18
-- Tablo: hub_messages
-- ============================================================

-- ── TABLO OLUŞTUR ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hub_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    VARCHAR(50) NOT NULL UNIQUE,
  source        VARCHAR(100),
  target        VARCHAR(100),
  text          TEXT NOT NULL,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── İNDEKSLER ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_hub_messages_timestamp
  ON hub_messages (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_hub_messages_source
  ON hub_messages (source)
  WHERE source IS NOT NULL;

-- ── TEMİZLİK POLİTİKASI ────────────────────────────────────
-- 30 günden eski mesajları temizlemek için:
-- DELETE FROM hub_messages WHERE timestamp < NOW() - INTERVAL '30 days';

-- ── RLS POLİTİKASI ──────────────────────────────────────────
ALTER TABLE hub_messages ENABLE ROW LEVEL SECURITY;

-- Okuma: Herkes okuyabilir (anon key)
CREATE POLICY "hub_messages_select_all"
  ON hub_messages FOR SELECT
  USING (true);

-- Yazma: Herkes yazabilir (anon key — server-side route korumalı)
CREATE POLICY "hub_messages_insert_all"
  ON hub_messages FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- UYGULAMA:
-- Supabase Dashboard → SQL Editor → Bu SQL'i çalıştırın.
-- ============================================================
