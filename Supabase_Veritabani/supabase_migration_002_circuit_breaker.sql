-- supabase/migrations/002_circuit_breaker_state.sql
-- CircuitBreaker Supabase Persist — Serverless uyumu
-- circuitBreaker.ts loadFromDB/saveToDB fonksiyonlarının kullandığı tablo

CREATE TABLE IF NOT EXISTS circuit_breaker_state (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module     TEXT UNIQUE NOT NULL,        -- 'ollama_cb' vb.
  state_json JSONB NOT NULL DEFAULT '{}', -- CBDurum nesnesi
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Hızlı modül araması için index
CREATE INDEX IF NOT EXISTS idx_cb_state_module ON circuit_breaker_state(module);

-- RLS
ALTER TABLE circuit_breaker_state ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='circuit_breaker_state' AND policyname='cb_state_all') THEN
    CREATE POLICY cb_state_all ON circuit_breaker_state FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $do$;
