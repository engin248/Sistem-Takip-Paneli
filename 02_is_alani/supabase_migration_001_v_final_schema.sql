-- supabase/migrations/001_v_final_schema.sql
-- V-FINAL Eksik Tablolar
-- Supabase'de zaten var: alerts, detection_results, proof_cache, proofs
-- Bu dosya EKSİK tabloları oluşturur

-- ═══════ PİPELİNE ═══════

CREATE TABLE IF NOT EXISTS commands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_text TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('telegram','panel','voice','api')),
  user_id TEXT NOT NULL,
  nonce TEXT UNIQUE NOT NULL,
  hash TEXT NOT NULL,
  confirmed BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'received',
  mode TEXT DEFAULT 'NORMAL' CHECK (mode IN ('STRICT','NORMAL','SAFE')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hermai_outputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  reason TEXT,
  method TEXT,
  alternatives JSONB DEFAULT '[]',
  risk_score REAL DEFAULT 0,
  refutation JSONB DEFAULT '{}',
  conditions JSONB DEFAULT '[]',
  confidence REAL DEFAULT 0.5,
  entropy REAL DEFAULT 0,
  entropy_class TEXT DEFAULT 'medium',
  proof_level TEXT DEFAULT 'BOUNDED_VERIFIED',
  processing_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS formal_specs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  pre_conditions JSONB DEFAULT '[]',
  post_conditions JSONB DEFAULT '[]',
  invariants JSONB DEFAULT '[]',
  z3_input TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refutations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  red_team_result JSONB DEFAULT '{}',
  monte_carlo JSONB DEFAULT '{}',
  consensus_result TEXT CHECK (consensus_result IN ('proceed','halt','escalate')),
  quorum_votes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gate_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  gates JSONB NOT NULL,
  all_passed BOOLEAN DEFAULT false,
  failed_gate TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  status TEXT CHECK (status IN ('success','failed','rolled_back','killed')),
  result JSONB DEFAULT '{}',
  rollback_data JSONB,
  processing_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  state_before JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════ GÜVENLİK & KONTROL ═══════

CREATE TABLE IF NOT EXISTS immutable_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  payload JSONB DEFAULT '{}',
  hash TEXT,
  prev_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- immutable_logs: DELETE/UPDATE yasak (A6)
CREATE OR REPLACE FUNCTION prevent_modify_logs()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  RAISE EXCEPTION 'immutable_logs degistirilemez (V-FINAL A6)';
END;
$func$;

DROP TRIGGER IF EXISTS no_update_logs ON immutable_logs;
CREATE TRIGGER no_update_logs
  BEFORE UPDATE OR DELETE ON immutable_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_modify_logs();

CREATE TABLE IF NOT EXISTS proof_chain (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  proof_hash TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  merkle_root TEXT,
  signature TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS health_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL,
  status TEXT CHECK (status IN ('healthy','degraded','down')),
  last_check TIMESTAMPTZ DEFAULT now(),
  details JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS global_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  rule_body JSONB NOT NULL,
  version INT DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rule_triggers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id TEXT REFERENCES global_rules(rule_id),
  command_id UUID REFERENCES commands(id),
  result BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════ OPERASYONEL ═══════

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value REAL NOT NULL,
  z_score REAL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS problem_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  severity TEXT,
  module TEXT,
  description TEXT,
  resolution TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS traceability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  command_id UUID REFERENCES commands(id),
  from_module TEXT,
  to_module TEXT,
  data_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS config_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  changed_by TEXT,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchdog_heartbeats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module TEXT NOT NULL,
  status TEXT DEFAULT 'alive',
  last_beat TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operator_certs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  cert_type TEXT,
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS fmea_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  failure_mode TEXT NOT NULL,
  severity INT,
  occurrence INT,
  detection INT,
  rpn INT GENERATED ALWAYS AS (severity * occurrence * detection) STORED,
  mitigation TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS traces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trace_id TEXT NOT NULL,
  span_id TEXT,
  parent_span_id TEXT,
  module TEXT,
  operation TEXT,
  duration_ms INT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════ INDEXLER ═══════

CREATE INDEX IF NOT EXISTS idx_commands_nonce     ON commands(nonce);
CREATE INDEX IF NOT EXISTS idx_commands_status    ON commands(status);
CREATE INDEX IF NOT EXISTS idx_proofs_command     ON proofs(command_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity    ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_immutable_logs_module ON immutable_logs(module);
CREATE INDEX IF NOT EXISTS idx_proof_cache_expires   ON proof_cache(expires_at);

-- ═══════ RLS ═══════

ALTER TABLE commands       ENABLE ROW LEVEL SECURITY;
ALTER TABLE immutable_logs ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='commands' AND policyname='insert_commands') THEN
    CREATE POLICY insert_commands ON commands FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='immutable_logs' AND policyname='insert_logs') THEN
    CREATE POLICY insert_logs ON immutable_logs FOR INSERT WITH CHECK (true);
  END IF;
END $do$;
