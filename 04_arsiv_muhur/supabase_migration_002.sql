-- ============================================================
-- STP Migration 002: İş Emri due_date Kolonu
-- Tarih: 13 Nisan 2026
-- İş Emri: EM-ALFA-01
-- Referans: STP-OPS-EMR-001
-- ============================================================
-- Bu migration mevcut verileri BOZMAZ.
-- Yeni kolon NULL default ile eklenir.
-- IF NOT EXISTS koruması aktif — tekrar çalıştırılabilir.
-- ============================================================

-- 1. due_date kolonu ekle
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- 2. Performans indeksi — sadece dolu due_date satırları
CREATE INDEX IF NOT EXISTS idx_tasks_due_date
  ON tasks(due_date)
  WHERE due_date IS NOT NULL;

-- 3. DOĞRULAMA SORGUSU
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks' AND column_name = 'due_date';

-- Beklenen çıktı:
-- column_name | data_type                  | is_nullable
-- due_date    | timestamp with time zone   | YES
