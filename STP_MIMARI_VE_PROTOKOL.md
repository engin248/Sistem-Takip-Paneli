# STP — MİMARİ VE PROTOKOL REFERANSI
> **Versiyon:** 2.0 | **Tarih:** 13 Nisan 2026  
> **Kurucu:** Engin | **Proje:** Sistem Takip Paneli
> **Kaynak:** 5_KATMAN_PROTOKOLU + GOREV_ISLEM_MIMARISI_ARGE + ARGE_ARASTIRMA_SONUCLARI konsolidasyonu  
> **Durum:** KONSOLİDE — TEK KAYNAK

---

## 1. İŞLEM KONTROL KATMANLARI (K1–K8)

Her iş emri aşağıdaki katmanlardan sırayla geçer. **K1–K5 ZORUNLU**, K6–K8 ihtiyaç halinde devreye girer.

### K-1: İŞ VE İŞLEM PLANI UYGUNLUĞU
- İşlem planlı mı? İş planında kayıtlı mı?
- Sırası doğru mu? Öncelikli bağımlılıkları tamamlanmış mı?
- Alt, üst, yan, ön, arka bağlantıları tanımlanmış mı?
- **Sorumlu:** AJAN-B (Uygunluk Kontrolcüsü)
- **Kontrol Listesi:**
  - [ ] Görev iş planında kayıtlı
  - [ ] Bağımlılık zinciri tamamlanmış
  - [ ] Sıra doğru (öncelik tablosuna uygun)

### K-2: SİSTEM VE BECERİ UYGUNLUĞU
- İstenen özellik/beceri mevcut sistemde tanımlı mı?
- Teknoloji yığını uyumlu mu?
- Mevcut mimariye eklenebilir mi?
- **Sorumlu:** AJAN-B (Uygunluk Kontrolcüsü)
- **Kontrol Listesi:**
  - [ ] Beceri haritasında bu görev tipi tanımlı
  - [ ] Stack uyumu doğrulanmış
  - [ ] Mimari genişleme uyumlu

### K-3: UYGULAMA (Execution)
- Kod yazıldı mı? Dosya oluşturuldu mu?
- Entegrasyon noktaları bağlandı mı?
- errorCore entegrasyonu yapıldı mı?
- **Sorumlu:** AJAN-A (Yapıcı — İşlemi yeniden yapıyormuş gibi kontrol eder)
- **Kontrol Listesi:**
  - [ ] Kod iş planına uygun yazılmış
  - [ ] ERR kodu atanmış (errorCore.ts)
  - [ ] processError() entegre

### K-4: PROJE UYGUNLUK KONTROLÜ
- 4 katman dizin yapısına (01, 02, 03, 04) uyuyor mu?
- i18n (TR/AR) simetri sağlanmış mı?
- RTL desteği var mı?
- Audit log'a kaydediliyor mu?
- **Sorumlu:** AJAN-B (Uygunluk Kontrolcüsü)
- **Kontrol Listesi:**
  - [ ] Dizin yapısı (01→04) uyumlu
  - [ ] TR ve AR çeviriler i18n.ts'e eklenmiş
  - [ ] RTL/LTR simetri kontrol edilmiş
  - [ ] logAudit() çağrısı mevcut

### K-5: DOĞRULAMA VE ONAY (Final Gate)
- İşlem doğru çalışıyor mu?
- Yan etkisi var mı?
- Hata kodu doğru atanmış mı?
- İş planı + Proje planı + Doğruluk = 3'ü de uygun mu?
- **Sorumlu:** AJAN-C (Doğrulayıcı — Final onay)
- **KOŞUL:** 3 ajan onaylamadan işlem "TAMAMLANDI" sayılmaz.
- **Kontrol Listesi:**
  - [ ] AJAN-A onayı ✅
  - [ ] AJAN-B onayı ✅
  - [ ] AJAN-C onayı ✅

### K-6: GÖREV İŞ KABUL (İlave)
- İşlem iş emri olarak sisteme kaydedildi mi?
- Görev kodu (TSK-XXXX) atandı mı?

### K-7: SİSTEM KONTROLÜ (İlave)
- Canlı ortamda çalışıyor mu?
- Performans etkisi ölçüldü mü?

### K-8: GERİ BİLDİRİM (İlave)
- Kurucu (Engin) onayı alındı mı?
- Değişiklik talep edildi mi?

### KATMAN KURALLARI (IMMUTABLE)
1. Hiçbir işlem sırasından çıkarılamaz
2. Hiçbir katman atlanamaz
3. 3 ajan onayı olmadan işlem kapanmaz
4. Her onay kanıtlanır ve raporlanır
5. Bu protokol değişmezdir — sadece katman EKLENEBİLİR, çıkarılamaz

---

## 2. 3 AJAN TANIMI (İŞLEM KONTROL AJANLARI)

| Ajan | Kod | Görev | Kontrol Alanı | Açıklama |
|------|-----|-------|---------------|----------|
| **AJAN-A** | YAPICI | İşlemi yeniden yapıyormuş gibi kontrol eder | K-3 | Kodu satır satır okur, iş planına uygunluğu denetler |
| **AJAN-B** | UYGUNLUK | Projeye ve iş planına uygunluğunu kontrol eder | K-1, K-2, K-4 | Plan, beceri, proje yapısı kontrolü |
| **AJAN-C** | DOĞRULAYICI | Doğruluğu + tüm planlara uygunluğu doğrular, final onay | K-5 | Son kapı — tüm önceki katmanların çıktılarını toplar |

### AJAN BECERİ KARTI ZORUNLULUĞU

Sistemdeki her ajana şu 4 parametre tanımlanmak **ZORUNDADIR**. Tanımı olmayan ajan sisteme dahil edilemez.

| Parametre | Açıklama |
|-----------|----------|
| **beceri_listesi** | Bu ajan hangi görev tiplerini yapabilir? |
| **kapsam_siniri** | Hangi görev tiplerini YAPAMAZ? |
| **ogrenme_kapasitesi** | Yeni bilgi/kural enjekte edilebilir mi? |
| **bagimliliklari** | Hangi harici servis/API'ye bağlı? |

**Örnek Ajan Kartı:**
```json
{
  "ajan_id": "ARGE-A0",
  "rol": "AR-GE Araştırma Görevlisi",
  "beceri_listesi": ["dosya okuma", "rapor üretme", "veri sınıflandırma"],
  "kapsam_siniri": ["kod yazma", "veritabanı değiştirme", "terminal komutu çalıştırma"],
  "ogrenme_kapasitesi": true,
  "bagimliliklari": ["dosya sistemi erişimi"]
}
```

---

## 3. 8 KAPILI GÖREV ZİNCİRİ (G-0 → G-8)

Her görev bu kapılardan sırayla geçmeden **KAPATILDI** damgası alamaz.

```
[G-0] ZOD GİRİŞ FİLTRESİ
  Gelen: Ham komut | Çıkan: Doğrulanmış JSON görevi
  Şemaya uymayan → RED → sisteme GİRMEZ
  Dosya: validation.ts (7 ZOD şeması)
  Durum: ✅ Aktif
       ↓
[G-1] GÖREV ANLAMA KAPISI
  Görev ne? Hangi sistem? Hangi değişken?
  Eksik varsa → DURAK → Kullanıcıya rapor
  Tam → G-2
  Dosya: aiManager.ts
  Durum: ✅ Aktif
       ↓
[G-2] İŞ PLANI KAPISI
  Kim yapacak? Hangi teknoloji? Kapasite var mı?
  İş Planı → Kullanıcı onayı zorunlu → G-3
  KURAL: İş planı onaysız G-3'e GEÇİLEMEZ
  Durum: ✅ Manuel
       ↓
[G-3] EKİP / KAPASİTE KAPISI
  Beceri var mı? EVET → Ajana ata
  HAYIR → Bilgi Getirme Protokolü devreye girer (3 YOL)
  Durum: ⚠️ Planlanmış
       ↓
[G-4] L1 YAPICI (Execution)
  Sadece iş planındaki adımlar — ek iş yok, yorum yok
  Her adım → log üretir
  Durum: ✅ Aktif
       ↓
[G-5] L2 VALIDATOR (Bağımsız Denetim)
  5 eksen: Teknik / Güvenlik / Performans / Operasyonel / UX
  BAŞARILI → G-6 | BAŞARISIZ → G-4 + Hata Tutanağı
  Dosya: l2Validator.ts
  Durum: ✅ Aktif
       ↓
[G-6] KANIT TOPLAMA
  Terminal çıktısı / Ekran görüntüsü / Canlı URL
  Kanıt yoksa → İşlem YAPILMAMIŞ → G-4'e dön
  Dosya: audit_logs tablosu
  Durum: ✅ Aktif
       ↓
[G-7] DIŞ GÜÇ / İNSAN ONAY (Human Gate)
  Kanıt + Rapor → Kullanıcı paneline düşer
  [ KABUL ] veya [ RED ] — başka seçenek yok
  RED → G-4 + Hata Kaydı | KABUL → G-8
  Dosya: TaskCard.tsx UI
  Durum: ✅ Aktif
       ↓
[G-8] ARŞİVLEME & ÖĞRENME
  İmzalanmış log → Değiştirilemez arşiv
  Self-Learning → Model güncellenir
  Git Push → Canlı doğrulama → KAPATILDI
  Dosya: selfLearningEngine.ts
  Durum: ⚠️ Kısmi (dosya var, tam aktif değil)
```

### BIND_RULES KURAL/KAPI EŞLEŞMESİ

| Kural | Aktif Kapı | Açıklama |
|-------|-----------|----------|
| #1 rules.md oku | G-0 öncesi | Her işlem öncesi kural dosyası okunur |
| #3 komutu tam anla | G-1 | Semantik analiz zorunlu |
| #5 varsayım yok | G-1, G-2 | Eksik → DURAK + SOR |
| #7 kanıt zorunlu | G-6 | Kanıtsız iş = yapılmamış iş |
| #8 hata anında kabul | G-5 RED | Hata gizlenmez, anında raporlanır |
| #13 alt bağlantı kontrolü | G-2, G-4 | Bağımlılık zinciri denetimi |
| #16 test/doğrulama | G-5, G-6 | Validator 5 eksende denetler |
| #22 çalışırken izin istemez | G-4 | Yapıcı iş planına göre otomatik |
| #24 kök neden analizi | G-5 RED | RED → 5 eksende kök neden |
| #25 5 bakış açısı | G-5 Validator | Stratejik/teknik/operasyonel/ekonomik/insan |

---

## 4. AJAN SEVİYELERİ (OTONOM HİYERARŞİ — L1→L5+)

| Seviye | Ad | Görev | Kural | Mevcut Durum |
|--------|-----|-------|-------|-------------|
| **L1** | Yapıcı | Görevi yürütür | Sadece iş planındaki adımlar | ✅ Aktif (aiManager, taskService) |
| **L2** | Denetçi (Validator) | L1'den bağımsız denetler | L1 ve L2 aynı sistem OLAMAZ | ✅ Aktif (l2Validator.ts) |
| **L3** | Hakem | L1-L2 çelişirse karar verir | 3. bağımsız değerlendirme | ✅ Aktif (consensusEngine.ts) |
| **L4** | İnsan Kapısı | Sadece KABUL/RED | Bypass edilemez — kod kilidi | ✅ Aktif (TaskCard.tsx UI) |
| **L5+** | Self-Learning | Geçmiş görevlerden öğrenir | Hafıza veritabanı beslemesi | ⚠️ Kısmi (selfLearningEngine.ts) |

**KEsin Kural:** L1 ve L2 aynı sistem olamaz. Kendi işini kendi denetleyemez.

**Katman Büyüme Kuralı:** Yeni katman, mevcut katmanın yetersizliğini **KANITLADIKTAN** sonra eklenir. Varsayıma dayalı katman eklenemez. Başlangıç 3 katman, ihtiyaç arttıkça sınırsız büyür.

---

## 5. KAPASİTE / BECERİ YÖNETİMİ

### 5.1 Beceri Boşluğu Tespit → Giderme Döngüsü

```
Görev Geldi (G-2 İş Planı Kapısı)
     ↓
SİSTEM: Bu görevi yapabilecek ajan var mı?
     ↓
┌───────────────────────────────────┐
│  EVET → Mevcut ajana ata          │
└───────────────────────────────────┘
     ↓
┌───────────────────────────────────┐
│  HAYIR — Kapasite Boşluğu Var    │
│  → 3 YOL analizi başlatılır      │
└───────────────────────────────────┘
         ↓
  [YOL 1] İç Eğitim
  Mevcut ajanın beceri listesine yeni kural/kapsam enjekte edilir.
  Kaynak: rules.md + Ar-Ge arşivi
  Maliyet: SIFIR
         ↓
  [YOL 2] Yeni Ajan Üretimi (Klonlama)
  Mevcut bir ajanın kopyası alınır, sadece bu göreve özel kapsam
  tanımlanarak yeni bir kart oluşturulur.
  Maliyet: SIFIR
         ↓
  [YOL 3] Bilgi Getirme
  Sistem kendi arşivlerinden (KI / Ar-Ge Klasörü / rules.md) gerekli
  bilgiyi arar. Dış kaynak SADECE iç kaynak tükendiğinde ve ücretsiz
  ise kullanılır.
  Maliyet: SIFIR (ücretsiz API öncelikli)
```

### 5.2 İç Kaynak Kullanım Hiyerarşisi

```
1. SİSTEM HAFİZASI (KI / Ar-Ge Arşivi) — Maliyet: SIFIR
2. rules.md + GEMINI.md + BIND_RULES — Maliyet: SIFIR
3. Mevcut Ajan Eğitimi (kural enjeksiyonu) — Maliyet: SIFIR
4. Yeni Ajan Üretimi (klonlama) — Maliyet: SIFIR
5. Ücretsiz Harici API (kota dahilinde) — Maliyet: SIFIR
6. Ücretli Harici API — Kullanıcı ONAYLAMAZSA YASAK
```

### 5.3 Kapasite Eksikliğinde Bilgi Getirme Sırası

```
1. DURAK — İş planı oluşturulamaz
2. "Şu bilgi/araç eksik" raporu üret
3. Bilgi getirme sırası:
   a. Sistem hafızası (KI, Ar-Ge arşivi)
   b. rules.md + GEMINI.md
   c. Dış kaynak (API araştırma)
   d. Kullanıcıya sor
4. Bilgi doğrulandı → İş planına ekle → G-2'den devam
```

---

## 6. OPERASYON HARİTASI

### 6.1 Her İşlem Bu Sırayı İZLER

```
1. İŞLEM ÖNCESİ
   ├─ rules.md okunur (BIND #1 — zorunlu)
   ├─ Görev tipi belirlenir
   ├─ Beceri haritasına bakılır
   ├─ Kapasite kontrolü yapılır
   └─ İŞ PLANI üretilir (onaysız adım atılamaz)

2. İŞLEM SIRASI (Öncelik)
   ├─ P0 — Sistem sağlığını tehdit eden → Anında ata
   ├─ P1 — İşletme kritik (gelir/kayıp riski) → İlk sıra
   ├─ P2 — Operasyonel iyileştirme → İkinci sıra
   ├─ P3 — Araştırma / Geliştirme → Üçüncü sıra
   └─ PX — Belirsiz öncelik → Kullanıcıya sor, varsayım YAPMA

3. İŞLEM SONRASI
   ├─ Test → Validator → Kanıt → Human Gate
   └─ Arşiv → Self-Learning → Git Push
```

### 6.2 Görev İş Planı JSON Şablonu

```json
{
  "gorev_id": "GOREV-[TARIH]-[NO]",
  "komut": "[Kullanıcının ham komutu — değiştirilmez]",
  "anlasilan": "[Sistemin anladığı — kullanıcı onaylar]",
  "adimlar": [
    { "no": 1, "islem": "", "sorumlu": "L1", "beklenen_cikti": "" },
    { "no": 2, "islem": "", "sorumlu": "L2", "beklenen_cikti": "" }
  ],
  "kapasite_var_mi": true,
  "onay_durumu": "BEKLIYOR",
  "kanit": null,
  "hata_logu": []
}
```

### 6.3 Sistem Sağlık Kontrol Listesi (Her Operasyon Öncesi)

```
✅ rules.md son versiyonu aktif mi?
✅ Ajan beceri kartları güncel mi?
✅ Supabase bağlantısı sağlıklı mı?
✅ Git repo güncel mi? (Takılı push var mı?)
✅ Self-Learning veritabanı yazılabilir mi?
✅ Human Gate (G-7) erişilebilir mi?
✅ Arşiv klasörü yazılabilir mi?
```

Herhangi bir "✗" varsa o kapasiteyle ilgili görev işleme **ALINAMAZ**.

---

## 7. SELF-LEARNING (ÖĞRENME MEKANİZMASI)

### 7.1 Öğrenme Döngüsü

```
HER TAMAMLANAN GÖREV
     ↓
G-8 Arşiv Motoruna düşer (selfLearningEngine.ts)

Kayıt Edilen Bilgiler:
  - Görev tipi
  - Hangi beceri kullanıldı
  - Hangi adımda hata çıktı
  - Hangi kural devreye girdi
  - Kullanıcı RED mi KABUL mü verdi
     ↓
PATTERN MOTORU
  "P2 tipi görevlerde L1 şu adımda takılıyor"
  "Kapasite boşluğu en çok şu konularda çıkıyor"
     ↓
KURAL MOTORU GÜNCELLENİR
  → rules.md'e yeni kural önerisi üretilir
  → Kullanıcı onaylarsa rules.md güncellenir
     ↓
SİSTEM BU KONUDA BİR DAHA HATA YAPAMAZ
```

### 7.2 Hata → Bir Daha Olmama Döngüsü

```
[A] ANLIK DURDURMA
[B] KÖK NEDEN — 5 eksende analiz
[C] SUÇLU TESPİT — Hangi katman, hangi ajan?
[D] TUTANAK — audit_logs + self_learning_logs
[E] PAT — Kural motoru güncellenir
[F] TEST — Aynı senaryo yeniden simüle edilir
[G] ONAY — Kullanıcı [ KABUL ]
[H] ARŞİV — Self-Learning veritabanına işlenir
```

### 7.3 Büyüme Projeksiyonu

```
Başlangıç Günü:
  3 ajan, 8 beceri, 3 katman
        ↓ (her görev G-8'den geçer)
3 Ay Sonra:
  Sistem kendi hatalarını analiz etti
  Beceri kartlarını güncelledi
  rules.md'e 12 yeni kural eklendi
  Kapasite boşluğu %80 azaldı
        ↓
1 Yıl Sonra:
  Sistem geçmiş 500+ görevden öğrendi
  Aynı hata bir daha olmadı (Self-Learning)
  İnsan müdahalesi sadece P0 ve onay noktalarına düştü
```

---

## 8. KÖR NOKTA ANALİZİ (BİRLEŞTİRİLMİŞ)

| # | Kör Nokta | Çözümü | Kaynak |
|---|-----------|--------|--------|
| 1 | G-0 öncesi ajan başlatılabilir | BIND #1: Her işlem öncesi rules.md okunur | GOREV_ISLEM |
| 2 | G-1'de "anladım" deyip anlamamak | G-1 çıktısı kullanıcıya gösterilip onay alınır | GOREV_ISLEM |
| 3 | L1 ve L2 aynı sistem | Kod seviyesinde izolasyon zorunlu | GOREV_ISLEM |
| 4 | Human Gate devre dışı | G-7 bypass edilemez — kod kilidi | GOREV_ISLEM |
| 5 | Self-Learning kirli veri alırsa | Sadece G-7 KABUL'ünden geçen görev G-8'e girer | GOREV_ISLEM |
| 6 | Sonsuz döngü | Sentinel: Max 60s → KILL + Hata Logu | GOREV_ISLEM |
| 7 | Beceri kartı olmayan ajan | G-3'te kart yoksa ajan görev ALAMAZ | ARGE |
| 8 | Eğitim döngüsü kırık | G-8 atlanamaz, görev KAPATILDI sayılmaz | ARGE |
| 9 | Öncelik tablosu olmadan sıra karışır | P0–P3 tablosu her görevde zorunlu | ARGE |
| 10 | İç kaynak sırası atlanırsa | §5.2 hiyerarşisi G-3'te zorunlu kontrol | ARGE |
| 11 | Self-learning DB dolunca yavaşlar | Periyodik arşiv temizleme kuralı | ARGE |
| 12 | Yeni ajan üretimi kontrolsüz büyürse | Her yeni ajan kart zorunlu + kullanıcı onayı | ARGE |

---

## 9. RİSK TABLOSU (BİRLEŞTİRİLMİŞ)

| Risk | Olasılık | Önlem | Kaynak |
|------|----------|-------|--------|
| Ajan halüsinasyon | YÜKSEK | L2 Validator katmanı | GOREV_ISLEM |
| Tek ajan tek karar | YÜKSEK | Min 3 katman zorunlu | GOREV_ISLEM |
| Onaysız kod deploy | ORTA | G-7 Human Gate kilidi | GOREV_ISLEM |
| Sonsuz döngü | ORTA | Sentinel: 60s → KILL | GOREV_ISLEM |
| Kapasite yokken ilerlemek | YÜKSEK | G-3 kapısı zorunlu | GOREV_ISLEM |
| Beceri boşluğunu görmezden gelmek | YÜKSEK | G-3 kapısı zorunlu | ARGE |
| İç kaynağı tüketmeden dışarıya gitmek | ORTA | §5.2 sırası zorunlu | ARGE |
| Ajan kart tanımı olmadan çalışmak | YÜKSEK | Kart olmayan ajan sistem dışı | ARGE |
| Ücretli işlem onaysız başlatmak | ORTA | rules.md §21 kilidi | ARGE |

---

## 10. SÜRDÜRÜLEBİLİRLİK KURALLARI

| Kural | Açıklama |
|-------|----------|
| Zaman baskısı hiçbir kuralı devre dışı bırakamaz | Acele işte yanlışlık kabul edilemez |
| Kısayol = sistem borcu | Her atlatılan kapı ileride iki hata üretir |
| Sıfır dış bağımlılık hedefi | Sistem bir gün tüm harici servisleri olmadan çalışabilmeli |
| Kullanıcı yorgunluğu sistem kuralını değiştirmez | 44 saat uyanık bile olsa kural geçerlidir |

---

## 11. SİSTEM SINIRLARI VE PROJE BAĞIMSIZLIĞI (MUTLAK KURAL)

Sistem Takip Paneli (STP), tüm projeleri yukarıdan izleyen, denetleyen ve görevi yürüten **ANA ORKESTRATÖR KONTROL MERKEZİDİR**.
*   **Kural 1:** STP'nin kodlarında, mimarisinde veya bilgi havuzunda hiçbir dış projenin (Mizanet vb.) ismi **hardcoded (sabitlenmiş)** olarak yer alamaz.
*   **Kural 2:** Mizanet veya diğer projeler, STP için sadece izlenecek bir *"Dış Hedef (External Target)"* veya *"Bağlı API"* statüsündedir.
*   **Kural 3:** Bu iki alan birbirine karıştırılamaz, hiçbir AI ajanı veya kullanıcı "STP = Mizanet" varsayımı yapamaz. Projeler arası bağ, sadece genel Bridge (Köprü) arayüzleri ile kurulur.

---

> **Mühür:** MİMARİ-PROTOKOL-KONSOLİDE-V2.0-STP  
> **Kaynak:** 5_KATMAN_PROTOKOLU + GOREV_ISLEM_MIMARISI_ARGE + ARGE_ARASTIRMA_SONUCLARI  
> **Tarih:** 13 Nisan 2026
