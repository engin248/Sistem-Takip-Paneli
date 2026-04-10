-- ============================================================
-- STP — EKSİK TABLOLAR OLUŞTURMA MİGRASYONU
-- Tarih: 10 Nisan 2026
-- Tablolar: board_decisions, notifications
-- Referans: boardService.ts, notificationService.ts
-- ============================================================

-- ─── 1. BOARD_DECISIONS ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS board_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('DEPLOYMENT','SCHEMA_CHANGE','SECURITY','ROLLBACK','CONFIG_CHANGE')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','sealed')),
  requested_by TEXT NOT NULL DEFAULT 'SISTEM',

  -- AI Agent Oyları — Stratejik
  agent_strategic_vote TEXT,
  agent_strategic_reason TEXT,
  agent_strategic_confidence NUMERIC,
  agent_strategic_at TIMESTAMPTZ,

  -- AI Agent Oyları — Teknik
  agent_technical_vote TEXT,
  agent_technical_reason TEXT,
  agent_technical_confidence NUMERIC,
  agent_technical_at TIMESTAMPTZ,

  -- AI Agent Oyları — Güvenlik
  agent_security_vote TEXT,
  agent_security_reason TEXT,
  agent_security_confidence NUMERIC,
  agent_security_at TIMESTAMPTZ,

  -- Konsensüs
  consensus_result JSONB,
  seal_hash TEXT,
  sealed_at TIMESTAMPTZ,
  vote_source TEXT CHECK (vote_source IN ('ai','local')),

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE board_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "board_decisions_select" ON board_decisions FOR SELECT USING (true);
CREATE POLICY "board_decisions_insert" ON board_decisions FOR INSERT WITH CHECK (true);
CREATE POLICY "board_decisions_update" ON board_decisions FOR UPDATE USING (true);

-- ─── 2. NOTIFICATIONS ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','error','success')),
  is_read BOOLEAN DEFAULT false,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (true);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (true);

-- ─── 3. TASKS TABLOSU CONSTRAINT KONTROLÜ ───────────────────
-- IEM-011: Status constraint eklenmeli (yoksa ekle)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'tasks_status_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
      CHECK (status IN ('beklemede','devam_ediyor','dogrulama','tamamlandi','reddedildi','iptal'));
  END IF;
END $$;

-- ─── 4. DOĞRULAMA ───────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('tasks','audit_logs','board_decisions','notifications')
ORDER BY table_name;
