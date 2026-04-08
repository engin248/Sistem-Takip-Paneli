-- ════════════════════════════════════════════════════════════════
-- SİSTEM KOMUTA MERKEZİ (SKM) — VERİTABANI TEMELİ
-- 4 Nisan 2026
-- Amaç: Değiştirilmez olay kaydı + çift kontrol + alarm sistemi
-- ════════════════════════════════════════════════════════════════

-- Hash zinciri için pgcrypto gerekli
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ┌──────────────────────────────────────────────────────────────┐
-- │ TABLO 1: DEĞİŞTİRİLMEZ OLAY KAYDI (Immutable Event Store) │
-- │ Her işlem buraya yazılır. Silinemez, değiştirilemez.        │
-- │ Referans: NASA kapalı döngü + bankacılık audit trail        │
-- └──────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS skm_olaylar (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- NE OLDU
    olay_tipi       TEXT NOT NULL,                          -- INSERT, UPDATE, DELETE, LOGIN, KARAR, HATA, ALARM
    olay_aciklama   TEXT NOT NULL,                          -- İnsan okunur açıklama
    
    -- NEREDE OLDU
    modul           TEXT NOT NULL,                          -- Hangi modül (karargah, arge, kesim, kasa...)
    tablo_adi       TEXT,                                   -- Hangi veritabanı tablosu
    kayit_id        UUID,                                   -- İlgili kaydın ID'si
    
    -- KİM YAPTI
    kullanici_id    UUID,                                   -- İşlemi yapan kullanıcı
    kullanici_adi   TEXT NOT NULL,                          -- İşlemi yapan kişi adı
    kullanici_rol   TEXT,                                   -- Rol: patron, yonetici, operatör...
    
    -- VERİ
    onceki_deger    JSONB,                                  -- Değişiklik öncesi (UPDATE/DELETE için)
    yeni_deger      JSONB,                                  -- Değişiklik sonrası
    metadata        JSONB DEFAULT '{}',                     -- Ek bilgi (IP, cihaz, konum...)
    
    -- HASH ZİNCİRİ (manipülasyon tespiti)
    onceki_hash     TEXT,                                   -- Bir önceki olayın hash değeri
    olay_hash       TEXT NOT NULL,                          -- Bu olayın hash değeri
    
    -- ZAMAN
    olusturulma     TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- SEVİYE
    seviye          TEXT NOT NULL DEFAULT 'INFO' 
                    CHECK (seviye IN ('DEBUG','INFO','WARNING','CRITICAL','EMERGENCY'))
);

-- SİLME VE GÜNCELLEME YASAĞI (Değiştirilmez kayıt = Immutable)
CREATE OR REPLACE RULE skm_olaylar_no_update 
    AS ON UPDATE TO skm_olaylar DO INSTEAD NOTHING;
CREATE OR REPLACE RULE skm_olaylar_no_delete 
    AS ON DELETE TO skm_olaylar DO INSTEAD NOTHING;

-- İNDEKSLER
CREATE INDEX IF NOT EXISTS idx_skm_olaylar_modul       ON skm_olaylar(modul);
CREATE INDEX IF NOT EXISTS idx_skm_olaylar_olay_tipi   ON skm_olaylar(olay_tipi);
CREATE INDEX IF NOT EXISTS idx_skm_olaylar_kullanici   ON skm_olaylar(kullanici_id);
CREATE INDEX IF NOT EXISTS idx_skm_olaylar_zaman       ON skm_olaylar(olusturulma DESC);
CREATE INDEX IF NOT EXISTS idx_skm_olaylar_seviye      ON skm_olaylar(seviye);
CREATE INDEX IF NOT EXISTS idx_skm_olaylar_tablo       ON skm_olaylar(tablo_adi);


-- ┌──────────────────────────────────────────────────────────────┐
-- │ TABLO 2: ÇİFT KONTROL KAYDI (Dual Validation Log)         │
-- │ Her işlem için yapan + kontrol eden kaydı                   │
-- │ Referans: Bankacılık Maker-Checker + Havacılık DO-178C     │
-- └──────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS skm_cift_kontrol (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- HANGİ OLAY
    olay_id         UUID NOT NULL REFERENCES skm_olaylar(id),
    
    -- YAPAN (PRIMARY)
    yapan_sistem    TEXT NOT NULL,                          -- Hangi sistem/ajan/kişi yaptı
    yapan_sonuc     JSONB NOT NULL,                         -- Yapanın ürettiği sonuç
    yapan_zaman     TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- KONTROL EDEN (VALIDATOR)
    kontrol_sistem  TEXT,                                   -- Hangi sistem/ajan kontrol etti
    kontrol_sonuc   JSONB,                                  -- Kontrol edenin ürettiği sonuç
    kontrol_zaman   TIMESTAMPTZ,
    
    -- KARAR
    sonuc           TEXT NOT NULL DEFAULT 'BEKLIYOR'
                    CHECK (sonuc IN ('BEKLIYOR','ONAY','RED','ZAMAN_ASIMI')),
    uyusmazlik_notu TEXT,                                   -- RED durumunda sebep
    
    -- EL İLE GEÇİŞ (Override)
    override_var    BOOLEAN DEFAULT false,                  -- Patron onayı ile geçildi mi
    override_eden   TEXT,                                   -- Kim override etti
    override_sebep  TEXT,                                   -- Neden override edildi
    override_zaman  TIMESTAMPTZ,
    
    -- ZAMAN
    olusturulma     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SİLME VE GÜNCELLEME YASAĞI (sadece sonuç alanı güncellenebilir)
CREATE OR REPLACE RULE skm_cift_kontrol_no_delete 
    AS ON DELETE TO skm_cift_kontrol DO INSTEAD NOTHING;

-- İNDEKSLER
CREATE INDEX IF NOT EXISTS idx_skm_cift_kontrol_olay   ON skm_cift_kontrol(olay_id);
CREATE INDEX IF NOT EXISTS idx_skm_cift_kontrol_sonuc  ON skm_cift_kontrol(sonuc);
CREATE INDEX IF NOT EXISTS idx_skm_cift_kontrol_zaman  ON skm_cift_kontrol(olusturulma DESC);


-- ┌──────────────────────────────────────────────────────────────┐
-- │ TABLO 3: ALARM SİSTEMİ                                      │
-- │ Kritik uyarılar, eskalasyon, bildirim                       │
-- │ Referans: NOC/SOC severity levels + Kural #49 (3 tekrar)   │
-- └──────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS skm_alarmlar (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ALARM BİLGİSİ
    baslik          TEXT NOT NULL,                          -- Alarm başlığı
    aciklama        TEXT NOT NULL,                          -- Detaylı açıklama
    seviye          TEXT NOT NULL DEFAULT 'WARNING'
                    CHECK (seviye IN ('INFO','WARNING','CRITICAL','EMERGENCY')),
    
    -- KAYNAK
    modul           TEXT NOT NULL,                          -- Hangi modülden geldi
    kaynak_olay_id  UUID REFERENCES skm_olaylar(id),       -- İlgili olay
    kaynak_sistem   TEXT,                                   -- Hangi sistem/ajan tetikledi
    
    -- DURUM
    durum           TEXT NOT NULL DEFAULT 'ACIK'
                    CHECK (durum IN ('ACIK','GORULDU','MUDAHALE','COZULDU','KAPANDI')),
    
    -- ÇÖZÜM
    cozen_id        UUID,                                   -- Kim çözdü
    cozen_adi       TEXT,
    cozum_notu      TEXT,
    cozum_zaman     TIMESTAMPTZ,
    
    -- TEKRAR SAYACI (Kural #49: 3 tekrar → sistem durur)
    tekrar_sayisi   INTEGER DEFAULT 1,
    son_tekrar      TIMESTAMPTZ DEFAULT now(),
    
    -- BİLDİRİM
    telegram_gonderildi  BOOLEAN DEFAULT false,
    dashboard_gosterildi BOOLEAN DEFAULT false,
    
    -- ZAMAN
    olusturulma     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SİLME YASAĞI
CREATE OR REPLACE RULE skm_alarmlar_no_delete 
    AS ON DELETE TO skm_alarmlar DO INSTEAD NOTHING;

-- İNDEKSLER
CREATE INDEX IF NOT EXISTS idx_skm_alarmlar_seviye  ON skm_alarmlar(seviye);
CREATE INDEX IF NOT EXISTS idx_skm_alarmlar_durum   ON skm_alarmlar(durum);
CREATE INDEX IF NOT EXISTS idx_skm_alarmlar_modul   ON skm_alarmlar(modul);
CREATE INDEX IF NOT EXISTS idx_skm_alarmlar_zaman   ON skm_alarmlar(olusturulma DESC);


-- ┌──────────────────────────────────────────────────────────────┐
-- │ ROW LEVEL SECURITY                                          │
-- └──────────────────────────────────────────────────────────────┘

ALTER TABLE skm_olaylar       ENABLE ROW LEVEL SECURITY;
ALTER TABLE skm_cift_kontrol  ENABLE ROW LEVEL SECURITY;
ALTER TABLE skm_alarmlar      ENABLE ROW LEVEL SECURITY;

-- OKUMA: herkes okuyabilir (dashboard için)
CREATE POLICY "skm_olaylar_okuma"       ON skm_olaylar       FOR SELECT USING (true);
CREATE POLICY "skm_cift_kontrol_okuma"  ON skm_cift_kontrol  FOR SELECT USING (true);
CREATE POLICY "skm_alarmlar_okuma"      ON skm_alarmlar      FOR SELECT USING (true);

-- YAZMA: herkes yazabilir (sistem geneli event kaydı)
CREATE POLICY "skm_olaylar_yazma"       ON skm_olaylar       FOR INSERT WITH CHECK (true);
CREATE POLICY "skm_cift_kontrol_yazma"  ON skm_cift_kontrol  FOR INSERT WITH CHECK (true);
CREATE POLICY "skm_alarmlar_yazma"      ON skm_alarmlar      FOR INSERT WITH CHECK (true);

-- GÜNCELLEME: sadece alarm ve çift kontrol (durum değişikliği için)
CREATE POLICY "skm_cift_kontrol_guncelle" ON skm_cift_kontrol FOR UPDATE USING (true);
CREATE POLICY "skm_alarmlar_guncelle"     ON skm_alarmlar     FOR UPDATE USING (true);


-- ┌──────────────────────────────────────────────────────────────┐
-- │ HASH FONKSİYONU (Manipülasyon tespiti)                     │
-- │ Her yeni olay, önceki olayın hash'ini taşır                │
-- └──────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION skm_olay_hash_olustur()
RETURNS TRIGGER AS $$
DECLARE
    onceki_hash_degeri TEXT;
BEGIN
    -- Son olayın hash'ini al
    SELECT olay_hash INTO onceki_hash_degeri
    FROM skm_olaylar
    ORDER BY olusturulma DESC
    LIMIT 1;
    
    -- Hash zinciri oluştur
    NEW.onceki_hash := COALESCE(onceki_hash_degeri, 'GENESIS');
    NEW.olay_hash := encode(
        digest(
            COALESCE(NEW.onceki_hash, '') || 
            NEW.olay_tipi || 
            NEW.modul || 
            NEW.kullanici_adi || 
            COALESCE(NEW.yeni_deger::TEXT, '') ||
            NEW.olusturulma::TEXT,
            'sha256'
        ),
        'hex'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_skm_olay_hash
    BEFORE INSERT ON skm_olaylar
    FOR EACH ROW
    EXECUTE FUNCTION skm_olay_hash_olustur();

-- ════════════════════════════════════════════════════════════════
-- TABLO 4: İZLENEN SİSTEMLER KAYDI
-- Kontrol merkezi birden fazla sistemi izler
-- Her sistem kayıt edilir, sağlık durumu takip edilir
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS skm_sistemler (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- SİSTEM BİLGİSİ
    ad              TEXT NOT NULL UNIQUE,                   -- Sistem adı (47 Sil Baştan, Analiz Motoru...)
    aciklama        TEXT,                                   -- Kısa açıklama
    tip             TEXT NOT NULL DEFAULT 'web'             -- web, api, ajan, veritabani, servis
                    CHECK (tip IN ('web','api','ajan','veritabani','servis','diger')),
    
    -- BAĞLANTI
    url             TEXT,                                   -- Sistemin erişim adresi
    health_endpoint TEXT,                                   -- Sağlık kontrolü endpoint'i (/api/health)
    
    -- DURUM
    durum           TEXT NOT NULL DEFAULT 'aktif'
                    CHECK (durum IN ('aktif','pasif','bakim','hata','planlaniyor')),
    son_saglik      TEXT DEFAULT 'bilinmiyor'               -- son health check sonucu
                    CHECK (son_saglik IN ('saglikli','hasta','ulasilamaz','bilinmiyor')),
    son_kontrol     TIMESTAMPTZ,                           -- Son health check zamanı
    yanit_suresi_ms INTEGER,                                -- Son yanıt süresi (ms)
    
    -- META
    metadata        JSONB DEFAULT '{}',                     -- Ek bilgi (versiyon, modül sayısı...)
    
    -- ZAMAN
    olusturulma     TIMESTAMPTZ NOT NULL DEFAULT now(),
    guncelleme      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- İNDEKSLER
CREATE INDEX IF NOT EXISTS idx_skm_sistemler_durum ON skm_sistemler(durum);

-- RLS
ALTER TABLE skm_sistemler ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skm_sistemler_okuma" ON skm_sistemler FOR SELECT USING (true);
CREATE POLICY "skm_sistemler_yazma" ON skm_sistemler FOR INSERT WITH CHECK (true);
CREATE POLICY "skm_sistemler_guncelle" ON skm_sistemler FOR UPDATE USING (true);


-- ┌──────────────────────────────────────────────────────────────┐
-- │ TABLO 5: SAĞLIK KONTROL GEÇMİŞİ                            │
-- │ Her health check kaydedilir — trend analizi için             │
-- └──────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS skm_saglik_kayitlari (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sistem_id       UUID NOT NULL REFERENCES skm_sistemler(id),
    durum           TEXT NOT NULL CHECK (durum IN ('saglikli','hasta','ulasilamaz')),
    yanit_suresi_ms INTEGER,
    hata_mesaji     TEXT,
    detay           JSONB DEFAULT '{}',
    kontrol_zamani  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skm_saglik_sistem ON skm_saglik_kayitlari(sistem_id);
CREATE INDEX IF NOT EXISTS idx_skm_saglik_zaman  ON skm_saglik_kayitlari(kontrol_zamani DESC);

ALTER TABLE skm_saglik_kayitlari ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skm_saglik_okuma" ON skm_saglik_kayitlari FOR SELECT USING (true);
CREATE POLICY "skm_saglik_yazma" ON skm_saglik_kayitlari FOR INSERT WITH CHECK (true);


-- BAŞLANGIÇ VERİSİ: Bilinen sistemler
INSERT INTO skm_sistemler (ad, aciklama, tip, url, health_endpoint, durum) VALUES
    ('47 Sil Baştan', 'Üretim & Mağaza Sistemi', 'web', 'https://mizanet.com', '/api/health', 'aktif'),
    ('Analiz Motoru', 'Scrapper & Trend Engine', 'servis', 'http://localhost:3001', '/health', 'pasif'),
    ('ARGE Otonom', '12 Ajan Sistemi', 'ajan', NULL, NULL, 'planlaniyor')
ON CONFLICT (ad) DO NOTHING;


-- ════════════════════════════════════════════════════════════════
-- KURULUM TAMAMLANDI
-- Tablolar: skm_olaylar, skm_cift_kontrol, skm_alarmlar,
--           skm_sistemler, skm_saglik_kayitlari
-- Kurallar: UPDATE/DELETE yasak (immutable olay/alarm)
-- Hash: Her olay öncekine zincirlenir (manipülasyon tespiti)
-- RLS: Aktif
-- ════════════════════════════════════════════════════════════════
