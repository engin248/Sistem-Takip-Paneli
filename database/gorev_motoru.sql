-- ════════════════════════════════════════════════════════════════
-- SİSTEM KONTROL MERKEZİ — GÖREV MOTORU VERİTABANI
-- Kaynak: ARGE-Arastirma/05_proje_takip_paneli.md
-- ════════════════════════════════════════════════════════════════

-- ┌──────────────────────────────────────────────────────────────┐
-- │ GÖREV TABLOSU — 14 ALAN (ARGE dosya 05, madde 5)            │
-- │ Her görev bu 14 alana sahip olmalı                          │
-- └──────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS gorevler (
    -- 1. ID — Benzersiz görev kimliği
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gorev_kodu      TEXT NOT NULL UNIQUE,                   -- G-001, G-002...

    -- 2. Öncelik — P0/P1/P2
    oncelik         TEXT NOT NULL DEFAULT 'P1'
                    CHECK (oncelik IN ('P0','P1','P2')),

    -- 3. Amaç (goal) — Nihai hedef
    amac            TEXT NOT NULL,

    -- 4. Neden (reason) — Neden yapılıyor
    neden           TEXT NOT NULL,

    -- 5. Kapsam — Ne dahil, ne hariç
    kapsam          JSONB NOT NULL DEFAULT '{"dahil":[],"haric":[]}',

    -- 6. Girdi — Giriş dosyaları + parametreler
    girdi           JSONB DEFAULT '{}',

    -- 7. İşlem tipi — code / exec / analysis / monitor
    islem_tipi      TEXT NOT NULL DEFAULT 'code'
                    CHECK (islem_tipi IN ('code','exec','analysis','monitor')),

    -- 8. Çıktı — Beklenen dosyalar + testler
    beklenen_cikti  JSONB NOT NULL DEFAULT '{"dosyalar":[],"testler":[]}',

    -- 9. Kısıtlar — Süre, teknik limitler
    kisitlar        JSONB DEFAULT '{}',

    -- 10. Test kriteri — Ölçülebilir başarı kuralları
    test_kriterleri JSONB NOT NULL DEFAULT '[]',

    -- 11. Risk — Bu görev neyi bozabilir
    risk            TEXT,

    -- 12. Onay noktası — Nerede durup kontrol edilecek
    onay_noktasi    TEXT,

    -- 13. Sorumlu — Kim yapacak, kim kontrol edecek
    yapan           TEXT NOT NULL,
    kontrol_eden    TEXT,

    -- 14. Durum — pending → running → validation → done / rejected
    durum           TEXT NOT NULL DEFAULT 'pending'
                    CHECK (durum IN ('pending','running','validation','done','rejected')),

    -- ONAY SİSTEMİ (dosya 05, madde 7)
    onay_modu       TEXT NOT NULL DEFAULT 'hybrid'
                    CHECK (onay_modu IN ('auto','manual','hybrid')),
    confidence      INTEGER DEFAULT 0,                      -- %0-100

    -- 3 KATMANLI DOĞRULAMA (dosya 05, madde 6)
    katman1_execution   BOOLEAN,                            -- Kod çalıştı mı? Dosya üretildi mi?
    katman2_teknik      BOOLEAN,                            -- Test geçti mi? Hata var mı?
    katman3_misyon      BOOLEAN,                            -- Hedef karşılandı mı?

    -- ZAMAN
    olusturulma     TIMESTAMPTZ NOT NULL DEFAULT now(),
    baslama         TIMESTAMPTZ,
    bitirme         TIMESTAMPTZ,
    guncelleme      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- İNDEKSLER
CREATE INDEX IF NOT EXISTS idx_gorevler_durum    ON gorevler(durum);
CREATE INDEX IF NOT EXISTS idx_gorevler_oncelik  ON gorevler(oncelik);
CREATE INDEX IF NOT EXISTS idx_gorevler_yapan    ON gorevler(yapan);
CREATE INDEX IF NOT EXISTS idx_gorevler_zaman    ON gorevler(olusturulma DESC);

-- ┌──────────────────────────────────────────────────────────────┐
-- │ KANIT TABLOSU (dosya 05, madde 9)                           │
-- │ Her tamamlanan görev için:                                   │
-- │ - Oluşturulan dosyalar                                       │
-- │ - Dosya hash'leri (SHA256)                                   │
-- │ - İşlem logu                                                 │
-- │ - Çalıştırılan komut çıktısı                                │
-- │ - Mission doğrulama sonucu                                   │
-- └──────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS gorev_kanitlar (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gorev_id        UUID NOT NULL REFERENCES gorevler(id),

    -- KANIT TİPİ
    tip             TEXT NOT NULL
                    CHECK (tip IN ('dosya','hash','log','komut_ciktisi','mission_dogrulama','ekran_goruntusu')),

    -- İÇERİK
    baslik          TEXT NOT NULL,
    icerik          TEXT,                                   -- Metin içerik veya dosya yolu
    hash_degeri     TEXT,                                   -- SHA256 hash
    dosya_yolu      TEXT,                                   -- Dosya sistemi yolu

    -- META
    metadata        JSONB DEFAULT '{}',

    -- ZAMAN
    olusturulma     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kanitlar_gorev ON gorev_kanitlar(gorev_id);

-- ┌──────────────────────────────────────────────────────────────┐
-- │ GÖREV LOG TABLOSU (dosya 05, madde 9)                       │
-- │ Adım adım kayıt — silinemez, değiştirilemez                 │
-- └──────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS gorev_loglar (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gorev_id        UUID NOT NULL REFERENCES gorevler(id),

    -- LOG
    adim            INTEGER NOT NULL,                       -- Adım numarası
    islem           TEXT NOT NULL,                          -- Ne yapıldı
    sonuc           TEXT,                                   -- Çıktı
    basarili        BOOLEAN NOT NULL DEFAULT true,
    hata_mesaji     TEXT,

    -- KİM
    yapan           TEXT NOT NULL,

    -- ZAMAN
    sure_ms         INTEGER,                                -- İşlem süresi (ms)
    olusturulma     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SİLME VE GÜNCELLEME YASAĞI (dosya 05, madde 4: append-only)
CREATE OR REPLACE RULE gorev_loglar_no_update
    AS ON UPDATE TO gorev_loglar DO INSTEAD NOTHING;
CREATE OR REPLACE RULE gorev_loglar_no_delete
    AS ON DELETE TO gorev_loglar DO INSTEAD NOTHING;

CREATE INDEX IF NOT EXISTS idx_loglar_gorev ON gorev_loglar(gorev_id);
CREATE INDEX IF NOT EXISTS idx_loglar_zaman ON gorev_loglar(olusturulma DESC);

-- RLS
ALTER TABLE gorevler        ENABLE ROW LEVEL SECURITY;
ALTER TABLE gorev_kanitlar  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gorev_loglar    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gorevler_okuma"       ON gorevler        FOR SELECT USING (true);
CREATE POLICY "gorevler_yazma"       ON gorevler        FOR INSERT WITH CHECK (true);
CREATE POLICY "gorevler_guncelle"    ON gorevler        FOR UPDATE USING (true);
CREATE POLICY "kanitlar_okuma"       ON gorev_kanitlar   FOR SELECT USING (true);
CREATE POLICY "kanitlar_yazma"       ON gorev_kanitlar   FOR INSERT WITH CHECK (true);
CREATE POLICY "loglar_okuma"         ON gorev_loglar     FOR SELECT USING (true);
CREATE POLICY "loglar_yazma"         ON gorev_loglar     FOR INSERT WITH CHECK (true);
