-- ============================================================
-- BOARD_DECISIONS — Yönetim Kurulu Karar Tablosu
-- ============================================================
-- 3 AI ajan konsensüs mekanizması için karar depolama.
-- Her karar stratejik, teknik ve güvenlik perspektifinden
-- bağımsız olarak oylanır. 3/3 ONAY → MÜHÜRLÜ.
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
  requested_by VARCHAR(100) NOT NULL DEFAULT 'OPERATÖR',

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

  -- Güvenlik Ajanı Oyu
  agent_security_vote VARCHAR(20) CHECK (agent_security_vote IN ('ONAY', 'RED')),
  agent_security_reason TEXT,
  agent_security_confidence DECIMAL(3,2),
  agent_security_at TIMESTAMPTZ,

  -- Konsensüs Sonucu
  consensus_result VARCHAR(20) CHECK (consensus_result IN ('MÜHÜRLÜ', 'REDDEDİLDİ', 'BEKLEMEDE')),
  seal_hash VARCHAR(128),
  sealed_at TIMESTAMPTZ,
  vote_source VARCHAR(10) CHECK (vote_source IN ('ai', 'local')),

  -- Meta
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- İNDEKSLER
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_board_decisions_status ON board_decisions(status);
CREATE INDEX IF NOT EXISTS idx_board_decisions_category ON board_decisions(category);
CREATE INDEX IF NOT EXISTS idx_board_decisions_created ON board_decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_board_decisions_consensus ON board_decisions(consensus_result);

-- ============================================================
-- RLS POLİTİKALARI
-- ============================================================
ALTER TABLE board_decisions ENABLE ROW LEVEL SECURITY;

-- Okuma: Herkes okuyabilir (anon)
CREATE POLICY "board_decisions_select_policy"
  ON board_decisions
  FOR SELECT
  USING (true);

-- Yazma: Herkes yazabilir (anon) — production'da kısıtlanmalı
CREATE POLICY "board_decisions_insert_policy"
  ON board_decisions
  FOR INSERT
  WITH CHECK (true);

-- Güncelleme: Herkes güncelleyebilir (anon)
CREATE POLICY "board_decisions_update_policy"
  ON board_decisions
  FOR UPDATE
  USING (true);

-- ============================================================
-- updated_at TRİGGER
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
