-- ============================================================
-- Migration 008: Pipeline Gate Onay Sistemi
-- ============================================================
-- G-1 (Görev Anlama), G-2 (İş Planı), G-6 (Kanıt), G-7 (İnsan Onay)
-- kapıları için durum ve onay tablosu.
--
-- Pipeline ara durakta ESCALATED döndüğünde, tüm intermediate
-- sonuçlar bu tabloya yazılır. Kullanıcı KABUL/RED verdiğinde
-- pipeline kaldığı yerden devam eder.
-- ============================================================

-- 1. Pipeline checkpoint tablosu (intermediate state)
CREATE TABLE IF NOT EXISTS pipeline_checkpoints (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    command_id      UUID NOT NULL REFERENCES commands(id),
    gate_id         TEXT NOT NULL CHECK (gate_id IN ('G1_UNDERSTANDING', 'G2_PLAN', 'G6_EVIDENCE', 'G7_HUMAN_APPROVAL')),
    status          TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),

    -- G-1: Görev Anlama — sistemin anladığı
    understanding   JSONB,

    -- G-2: İş Planı
    plan            JSONB,

    -- G-6: Kanıt
    evidence        JSONB,

    -- G-7: İnsan onay — pipeline özet raporu
    approval_report JSONB,

    -- Pipeline state (resume için)
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

-- 2. Kanıt tablosu (G-6 detay)
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
