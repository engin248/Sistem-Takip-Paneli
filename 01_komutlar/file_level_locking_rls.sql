-- ============================================================
-- STP-002 FILE-LEVEL LOCKING — RLS İLE YAZMA KISITLAMASI
-- Tarih: 2026-04-08
-- Doktrin: Ekip üyesi sadece assigned_to = kendi adı olan
--          görevleri güncelleyebilir. Yönetici/Admin hariç.
-- ============================================================
-- ÖNEMLİ: Bu migration mevcut rls_politikalari.sql üzerine
-- çalışır. Önce mevcut tasks_update politikası kaldırılır,
-- yerine sahiplik bazlı politika oluşturulur.
-- ============================================================

-- ─── MEVCUT GÜNCELLEME POLİTİKASINI KALDIR ─────────────────
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_update_owner" ON tasks;
DROP POLICY IF EXISTS "tasks_update_elevated" ON tasks;

-- ─── SAHİPLİK BAZLI GÜNCELLEME (File-Level Lock) ───────────
-- Normal kullanıcılar: Sadece assigned_to = kendi adı olan
-- görevleri güncelleyebilir.
-- NOT: Supabase anon key ile çalışılıyorsa request header'dan
-- operatör adı alınır. custom_claims kullanılıyorsa JWT'den.
-- ─────────────────────────────────────────────────────────────

-- Yöntem 1: custom request header üzerinden doğrulama
-- Frontend'den: supabase.from('tasks').update(...) çağrısı
-- öncesi headers ayarlanarak operatör kimliği gönderilir.
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "tasks_update_owner" ON tasks
    FOR UPDATE USING (
        -- Koşul 1: assigned_to, request header'daki operatör ile eşleşsin
        UPPER(assigned_to) = UPPER(
            COALESCE(
                current_setting('request.headers', true)::json->>'x-operator-name',
                'SISTEM'
            )
        )
    ) WITH CHECK (TRUE);

-- Yöntem 2: Yükseltilmiş yetki (YÖNETİCİ / ADMIN)
-- x-operator-role header'ı 'ADMIN' veya 'YÖNETİCİ' ise tüm görevlere erişim
CREATE POLICY "tasks_update_elevated" ON tasks
    FOR UPDATE USING (
        UPPER(
            COALESCE(
                current_setting('request.headers', true)::json->>'x-operator-role',
                ''
            )
        ) IN ('ADMIN', 'YÖNETİCİ')
    ) WITH CHECK (TRUE);

-- ============================================================
-- DOĞRULAMA
-- ============================================================
DO $$
BEGIN
    RAISE NOTICE '✅ File-level locking RLS politikaları oluşturuldu';
    RAISE NOTICE '  tasks_update_owner:    assigned_to = x-operator-name';
    RAISE NOTICE '  tasks_update_elevated: x-operator-role IN (ADMIN, YÖNETİCİ)';
    RAISE NOTICE '  Frontend guard: permissionGuard.ts (istemci tarafı ek kontrol)';
END;
$$;
