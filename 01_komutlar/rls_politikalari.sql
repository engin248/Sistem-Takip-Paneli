-- ============================================================
-- STP-001 ROW LEVEL SECURITY (RLS) GÜNCELLEMESİ
-- Tarih: 2026-04-08
-- Doktrin: service_role harici yetkisiz silme yasak
-- ============================================================

-- ─── TASKS TABLOSU ──────────────────────────────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları temizle (varsa)
DROP POLICY IF EXISTS "tasks_full_access" ON tasks;
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

-- SELECT: Herkes okuyabilir
CREATE POLICY "tasks_select" ON tasks
    FOR SELECT USING (TRUE);

-- INSERT: Herkes ekleyebilir
CREATE POLICY "tasks_insert" ON tasks
    FOR INSERT WITH CHECK (TRUE);

-- UPDATE: Herkes güncelleyebilir
CREATE POLICY "tasks_update" ON tasks
    FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

-- DELETE: SADECE service_role silebilir (anon ve authenticated engellenmiş)
-- Bu politika anon/authenticated kullanıcıların silmesini engeller
-- Supabase Dashboard ve service_role erişimi hala çalışır
CREATE POLICY "tasks_delete" ON tasks
    FOR DELETE USING (
        (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
    );

-- ─── AUDIT_LOGS TABLOSU ────────────────────────────────────
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları temizle (varsa)
DROP POLICY IF EXISTS "audit_logs_select" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_update" ON audit_logs;

-- SELECT: Herkes okuyabilir
CREATE POLICY "audit_logs_select" ON audit_logs
    FOR SELECT USING (TRUE);

-- INSERT: Herkes ekleyebilir
CREATE POLICY "audit_logs_insert" ON audit_logs
    FOR INSERT WITH CHECK (TRUE);

-- DELETE + UPDATE: YASAK (trigger ile de korunuyor, RLS ile de)
-- Politika oluşturulmadı = erişim yok

-- ============================================================
-- DOĞRULAMA
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ RLS politikaları güncellendi';
    RAISE NOTICE '  tasks: SELECT/INSERT/UPDATE → açık | DELETE → sadece service_role';
    RAISE NOTICE '  audit_logs: SELECT/INSERT → açık | UPDATE/DELETE → tamamen engelli';
END;
$$;
