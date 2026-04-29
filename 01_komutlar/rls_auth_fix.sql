-- ============================================================
-- MIGRATION: RLS Politikaları — Authenticated Kısıtlaması
-- ============================================================
-- Mevcut USING(true) politikaları anonymous erişime izin verir.
-- Bu migration tüm tabloları "sadece giriş yapmış kullanıcı"
-- politikasına güncelliyor.
--
-- Çalıştır: Supabase SQL Editor'da bir kez
-- ============================================================

-- ─── tasks ──────────────────────────────────────────────────

-- Eski politikaları sil
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;
DROP POLICY IF EXISTS "Allow read access" ON tasks;
DROP POLICY IF EXISTS "Allow all" ON tasks;

-- Yeni politikalar: Sadece authenticated
CREATE POLICY "tasks_select_auth"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tasks_insert_auth"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "tasks_update_auth"
  ON tasks FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "tasks_delete_auth"
  ON tasks FOR DELETE
  TO authenticated
  USING (true);

-- Service role tam erişim
CREATE POLICY "tasks_service_role"
  ON tasks
  USING (auth.role() = 'service_role');

-- ─── audit_logs ──────────────────────────────────────────────

DROP POLICY IF EXISTS "audit_logs_select_policy" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON audit_logs;
DROP POLICY IF EXISTS "Allow read access" ON audit_logs;
DROP POLICY IF EXISTS "Allow insert" ON audit_logs;

CREATE POLICY "audit_logs_select_auth"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "audit_logs_insert_auth"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "audit_logs_service_role"
  ON audit_logs
  USING (auth.role() = 'service_role');

-- ─── board_decisions ─────────────────────────────────────────

DROP POLICY IF EXISTS "board_decisions_select_policy" ON board_decisions;
DROP POLICY IF EXISTS "board_decisions_insert_policy" ON board_decisions;
DROP POLICY IF EXISTS "board_decisions_update_policy" ON board_decisions;
DROP POLICY IF EXISTS "Allow all" ON board_decisions;

CREATE POLICY "board_decisions_select_auth"
  ON board_decisions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "board_decisions_insert_auth"
  ON board_decisions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "board_decisions_update_auth"
  ON board_decisions FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "board_decisions_service_role"
  ON board_decisions
  USING (auth.role() = 'service_role');

-- ─── command_archive ─────────────────────────────────────────

DROP POLICY IF EXISTS "command_archive_select_policy" ON command_archive;
DROP POLICY IF EXISTS "command_archive_insert_policy" ON command_archive;
DROP POLICY IF EXISTS "command_archive_update_policy" ON command_archive;
DROP POLICY IF EXISTS "Allow all" ON command_archive;

CREATE POLICY "command_archive_select_auth"
  ON command_archive FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "command_archive_insert_auth"
  ON command_archive FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "command_archive_update_auth"
  ON command_archive FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "command_archive_service_role"
  ON command_archive
  USING (auth.role() = 'service_role');
