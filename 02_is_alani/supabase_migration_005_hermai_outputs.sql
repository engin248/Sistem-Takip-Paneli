-- ============================================================
-- STP Migration 005: HermAI Çıktı Tablosu
-- Tarih: 15 Nisan 2026
-- Tablo: hermai_outputs
-- Referans: src/core/hermAI/analysisEngine.ts — runHermAIAnalysis()
-- ============================================================
-- K2.1 HermAI analiz sonuçlarını arşivler.
-- A6 aksiyomu gereği her analiz kaydedilir.
-- commands.id ile bağlantılıdır (L0 → K2.1 zinciri).
-- ============================================================

CREATE TABLE IF NOT EXISTS hermai_outputs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- L0 ile bağlantı (replay-safe zincir)
  command_id      UUID REFERENCES commands(id) ON DELETE SET NULL,

  -- K2.1 Analiz Çıktısı
  reason          TEXT,
  method          TEXT,
  alternatives    JSONB    NOT NULL DEFAULT '[]',
  risk_score      DECIMAL(4,3),
  refutation      JSONB    NOT NULL DEFAULT '{}',
  conditions      JSONB    NOT NULL DEFAULT '[]',

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

  -- AI sağlayıcı (Ollama/openai/local)
  ai_provider     VARCHAR(20),

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_hermai_outputs_command   ON hermai_outputs(command_id);
CREATE INDEX IF NOT EXISTS idx_hermai_outputs_proof     ON hermai_outputs(proof_level);
CREATE INDEX IF NOT EXISTS idx_hermai_outputs_entropy   ON hermai_outputs(entropy_class);
CREATE INDEX IF NOT EXISTS idx_hermai_outputs_created   ON hermai_outputs(created_at DESC);

-- RLS
ALTER TABLE hermai_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hermai_outputs_select" ON hermai_outputs
  FOR SELECT USING (true);

CREATE POLICY "hermai_outputs_insert" ON hermai_outputs
  FOR INSERT WITH CHECK (true);

-- ─── DOĞRULAMA ───────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'hermai_outputs';
-- Beklenen: hermai_outputs
