-- ============================================================
-- STP-ARKA — SUPABASE RLS POLİTİKALARI MÜHÜRLEMESİ
-- Tarih: 2026-04-08
-- Doktrin: SIFIR İNİSİYATİF / KESİN KANIT İLKESİ
-- ============================================================
-- Bu dosya Supabase Dashboard → SQL Editor'de çalıştırılmalıdır.
-- Tüm tablolarda RLS aktif edilir ve politikalar mühürlenir.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- 1. RLS AKTİVASYONU — Tüm tablolarda zorunlu
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- 2. TASKS TABLOSU — RLS POLİTİKALARI
-- ══════════════════════════════════════════════════════════════

-- Mevcut politikaları temizle (güvenli yeniden uygulama)
DROP POLICY IF EXISTS "tasks_select_anon" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_anon" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_anon" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_anon" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_authenticated" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_authenticated" ON public.tasks;

-- SELECT: Anon ve authenticated kullanıcılar tüm görevleri okuyabilir
CREATE POLICY "tasks_select_anon"
  ON public.tasks
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "tasks_select_authenticated"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Sadece authenticated kullanıcılar ve anon (panel frontend)
CREATE POLICY "tasks_insert_anon"
  ON public.tasks
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "tasks_insert_authenticated"
  ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Sadece authenticated kullanıcılar ve anon (durum güncellemesi)
CREATE POLICY "tasks_update_anon"
  ON public.tasks
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "tasks_update_authenticated"
  ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Sadece authenticated kullanıcılar ve anon (görev silme)
CREATE POLICY "tasks_delete_anon"
  ON public.tasks
  FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "tasks_delete_authenticated"
  ON public.tasks
  FOR DELETE
  TO authenticated
  USING (true);

-- ══════════════════════════════════════════════════════════════
-- 3. AUDIT_LOGS TABLOSU — RLS POLİTİKALARI
-- ══════════════════════════════════════════════════════════════

-- Mevcut politikaları temizle
DROP POLICY IF EXISTS "audit_select_anon" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_insert_anon" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_select_authenticated" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_insert_authenticated" ON public.audit_logs;

-- SELECT: Tüm kullanıcılar audit log'ları okuyabilir
CREATE POLICY "audit_select_anon"
  ON public.audit_logs
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "audit_select_authenticated"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Tüm kullanıcılar audit log yazabilir (sistem gerekliliği)
CREATE POLICY "audit_insert_anon"
  ON public.audit_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "audit_insert_authenticated"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE/DELETE: audit_logs tablosunda güncelleme/silme YASAKTIR
-- Audit kayıtları değiştirilemez — MÜHÜRLEME İLKESİ
-- (Politika oluşturulmaz → varsayılan olarak reddedilir)

-- ══════════════════════════════════════════════════════════════
-- 4. REALTIME — Tablo yayınlama (Publication)
-- ══════════════════════════════════════════════════════════════
-- Supabase Realtime'ın çalışması için tabloların publication'a 
-- eklenmesi gerekir. Zaten eklenmiş olabilir, IF NOT EXISTS ile korunur.

DO $$
BEGIN
  -- supabase_realtime publication'ına tabloları ekle
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 5. DOĞRULAMA SORGUSU — RLS durumunu kontrol et
-- ══════════════════════════════════════════════════════════════

SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('tasks', 'audit_logs')
ORDER BY tablename;

-- Politikaları listele
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('tasks', 'audit_logs')
ORDER BY tablename, policyname;

-- ══════════════════════════════════════════════════════════════
-- MÜHÜR: RLS POLİTİKALARI TAMAMLANDI
-- tasks: SELECT/INSERT/UPDATE/DELETE → anon + authenticated
-- audit_logs: SELECT/INSERT → anon + authenticated (UPDATE/DELETE YASAK)
-- Realtime: Her iki tablo supabase_realtime publication'ına eklendi
-- ══════════════════════════════════════════════════════════════
