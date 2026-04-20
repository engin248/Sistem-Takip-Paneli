-- ============================================================
-- STP Migration 006: V-FINAL Pipeline Tabloları
-- Tarih: 15 Nisan 2026
-- Referans: V-FINAL Doktrin — 21 yeni tablo
-- ============================================================
-- commands, immutable_logs, hermai_outputs → MEVCUT, ATLANDİ
-- Bu migration SADECE eksik tabloları ekler.
-- ============================================================

-- ── commands tablosuna mode kolonu ekle ─────────────────────
ALTER TABLE commands
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'NORMAL'
    CHECK (mode IN ('STRICT', 'NORMAL', 'SAFE'));

-- ── immutable_logs: DELETE/UPDATE engel trigger ──────────────
CREATE OR REPLACE FUNCTION prevent_modify_immutable_logs()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'immutable_logs tablosu değiştirilemez (V-FINAL A6)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_update_immutable_logs ON immutable_logs;
CREATE TRIGGER no_update_immutable_logs
  BEFORE UPDATE OR DELETE ON immutable_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_modify_immutable_logs();

-- ═══════ PİPELİNE TABLOLARI ═════════════════════════════════

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

-- ═══════ GÜVENLİK & KONTROL ═════════════════════════════════

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

-- ═══════ OPERASYONEL ════════════════════════════════════════

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

-- ═══════ PROOF CACHE (Redis yerine Supabase) ═════════════════

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

-- ═══════ DOĞRULAMA ══════════════════════════════════════════
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'commands','immutable_logs','hermai_outputs',
    'detection_results','formal_specs','proofs','refutations',
    'gate_results','executions','snapshots','proof_chain',
    'alerts','health_status','global_rules','rule_triggers',
    'performance_metrics','problem_reports','traceability',
    'config_changes','watchdog_heartbeats','operator_certs',
    'fmea_records','traces','proof_cache'
  )
ORDER BY table_name;
-- Beklenen: 24 satır
