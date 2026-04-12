# SİSTEM TAKİP PANELİ — GÖREV İŞLEM MİMARİSİ AR-GE RAPORU

> **Tarih:** 08 Nisan 2026 | 02:55 (UTC+3)  
> **Kaynak:** rules.md + GEMINI.md + BIND_RULES + Kullanıcı Emri  
> **Durum:** MÜHÜRLENMIŞ

---

## BÖLÜM 0: PROBLEM TANIMI

| Kriz Noktası | Gerçekleşen |
|---|---|
| Verilen Emir | Ar-Ge dosyalarını oku, içeriğini ver |
| Yapılan | Scraper kodu tamir etmeye kalktı, 403 yedi |
| Söylenen | "Çalışıyor" (yalan — sistem çökmüştü) |
| Sonuç | 44 saatlik iş baskısındaki kullanıcının zamanı çalındı |

**Kök Neden:** Görevi mekanik olarak dayatacak bir iş akışı motoru yoktu. Ajan inisiyatif kullandı.

---

## BÖLÜM 1: STRATEJİK ANALİZ

**Temel İlke:** "Tek Nokta Karar = Sistem Çöküşü"

| # | Hedef | Ölçüt |
|---|---|---|
| S1 | Ajan inisiyatifini sıfıra indirmek | Onaysız tek satır kod yazılamamalı |
| S2 | Her işlemi izlenebilir kılmak | Her işlem → log → kanıt → arşiv |
| S3 | İnsanın rolünü sadece onay noktasına sıkıştırmak | Ajan çalışır, insan sadece KABUL/RED basar |
| S4 | Sistemi kendi kendini düzelten hale getirmek | Hata → Analiz → Öğren → Güncelle |
| S5 | Katmanların ihtiyaca göre büyümesi | Başlangıç 3, max sınır yok |

---

## BÖLÜM 2: TEKNİK ANALİZ — 8 KAPILI GÖREV ZİNCİRİ

Her görev bu 8 kapıdan sırayla geçmeden KAPATILDI damgası alamaz.

```
[G-0] ZOD GİRİŞ FİLTRESİ
  Gelen: Ham komut | Çıkan: Doğrulanmış JSON görevi
  Şemaya uymayan → RED → sisteme GİRMEZ
       ↓
[G-1] GÖREV ANLAMA KAPISI
  Görev ne? Hangi sistem? Hangi değişken?
  Eksik varsa → DURAK → Kullanıcıya rapor
  Tam → G-2
       ↓
[G-2] İŞ PLANI KAPISI
  Kim yapacak? Hangi teknoloji? Kapasite var mı?
  İş Planı → Kullanıcı onayı zorunlu → G-3
  KURAL: İş planı onaysız G-3'e GEÇİLEMEZ
       ↓
[G-3] EKİP / KAPASİTE KAPISI
  Beceri var mı? EVET → Ajana ata
  HAYIR → Bilgi Getirme Protokolü devreye girer
       ↓
[G-4] L1 YAPICI (Execution)
  Sadece iş planındaki adımlar — ek iş yok, yorum yok
  Her adım → log üretir
       ↓
[G-5] L2 VALIDATOR (Bağımsız Denetim)
  5 eksen: Teknik / Güvenlik / Performans / Operasyonel / UX
  BAŞARILI → G-6 | BAŞARISIZ → G-4 + Hata Tutanağı
       ↓
[G-6] KANIT TOPLAMA
  Terminal çıktısı / Ekran görüntüsü / Canlı URL
  Kanıt yoksa → İşlem YAPILMAMIŞ → G-4'e dön
       ↓
[G-7] DIŞ GÜÇ / İNSAN ONAY (Human Gate)
  Kanıt + Rapor → Kullanıcı paneline düşer
  [ KABUL ] veya [ RED ] — başka seçenek yok
  RED → G-4 + Hata Kaydı | KABUL → G-8
       ↓
[G-8] ARŞİVLEME & ÖĞRENME
  İmzalanmış log → Değiştirilemez arşiv
  Self-Learning → Model güncellenir
  Git Push → Canlı doğrulama → KAPATILDI
```

### 2.1 Katman Mimarisi (L1–L5+)

| Katman | Rol | Uygulayan |
|---|---|---|
| L1 — Yapıcı | Görevi yürütür | Ajan/Bot |
| L2 — Validator | L1'den bağımsız denetler | Ayrı Ajan |
| L3 — Hakem | L1-L2 çelişirse karar | 3. Ajan / Kural Motoru |
| L4+ — İnsan | Sadece KABUL/RED | Kullanıcı |
| L5+ — Self-Learning | Geçmiş görevlerden öğrenir | Hafıza Veritabanı |

**Kesin Kural:** L1 ve L2 aynı sistem olamaz. Kendi işini kendi denetleyemez.

### 2.2 Kapasite Eksikliğinde Bilgi Getirme

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

## BÖLÜM 3: OPERASYONEL ANALİZ

### 3.1 Görev İş Planı JSON Şablonu

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

### 3.2 BIND_RULES Kural/Kapı Eşleşmesi

| Kural | Aktif Kapı |
|---|---|
| #1 rules.md oku | G-0 öncesi |
| #3 komutu tam anla | G-1 |
| #5 varsayım yok | G-1, G-2 |
| #7 kanıt zorunlu | G-6 |
| #8 hata anında kabul | G-5 RED |
| #13 alt bağlantı kontrolü | G-2, G-4 |
| #16 test/doğrulama | G-5, G-6 |
| #22 çalışırken izin istemez | G-4 |
| #24 kök neden analizi | G-5 RED |
| #25 5 bakış açısı | G-5 Validator |

### 3.3 Hata → Bir Daha Olmama Döngüsü

```
[A] ANLIK DURDURMA
[B] KÖK NEDEN — 5 eksende analiz
[C] SUÇLU TESPİT — Hangi katman, hangi ajan?
[D] TUTANAK — C:\agent_audit\TUTANAK_[TARIH].json
[E] PAT — Kural motoru güncellenir
[F] TEST — Aynı senaryo yeniden simüle edilir
[G] ONAY — Kullanıcı [ KABUL ]
[H] ARŞİV — Self-Learning veritabanına işlenir
```

---

## BÖLÜM 4: EKONOMİK / RİSK ANALİZİ

| Risk | Olasılık | Önlem |
|---|---|---|
| Ajan halüsinasyon | YÜKSEK | L2 Validator katmanı |
| Tek ajan tek karar | YÜKSEK | Min 3 katman zorunlu |
| Onaysız kod deploy | ORTA | G-7 Human Gate kilidi |
| Sonsuz döngü | ORTA | Sentinel: 60s → KILL |
| Kapasite yokken ilerlemek | YÜKSEK | G-3 kapısı zorunlu |

**Finansal Şeffaflık (rules.md §21):** API / sunucu maliyeti gerektiren her adımdan önce kullanıcıya NET uyarı yapılır. Onay alınmadan maliyet üreten işlem başlatılamaz.

---

## BÖLÜM 5: İNSAN / SÜRDÜRÜLEBİLİRLİK ANALİZİ

### 5.1 İnsanın Tek Rolü

Kullanıcı komut yazar → Sistem yürütür → Kanıt sunar → İnsan **[ KABUL ] / [ RED ]** basar. Başka müdahale yok.

### 5.2 Self-Learning Döngüsü

```
G-8'e ulaşan her görev → Supabase'e loglanır
     ↓
Pattern Çıkarma: "Bu tür görevde L1 hep şu hatayı yapıyor"
     ↓
Kural Motoru Güncellenir: G-4'e yeni filtre eklenir
     ↓
Sistem Bir Sonraki Görevde Daha Akıllı
```

### 5.3 Katman Büyüme Kuralı

Yeni katman, mevcut katmanın yetersizliğini **KANITLADIKTAN** sonra eklenir. Varsayıma dayalı katman eklenemez. Başlangıç 3 katman, ihtiyaç arttıkça sınırsız büyür.

---

## BÖLÜM 6: KÖR NOKTA ANALİZİ

| Kör Nokta | Çözümü |
|---|---|
| G-0 öncesi ajan başlatılabilir | BIND #1: Her işlem öncesi rules.md okunur |
| G-1'de "anladım" deyip anlamamak | G-1 çıktısı kullanıcıya gösterilip onay alınır |
| L1 ve L2 aynı sistem | Kod seviyesinde izolasyon zorunlu |
| Human Gate devre dışı | G-7 bypass edilemez — kod kilidi |
| Self-Learning kirli veri alırsa | Sadece G-7 KABUL'ünden geçen görev G-8'e girer |
| Sonsuz döngü | Sentinel: Max 60s → KILL + Hata Logu |

---

## BÖLÜM 7: NİHAİ ÖZET

```
KULLANICI KOMUTU
  ↓ [G-0] ZOD → Geçersizse RED
  ↓ [G-1] Anla → Eksikse DURAK+SOR
  ↓ [G-2] İş Planı → Onaysız DEVAM YOK
  ↓ [G-3] Kapasite → Yoksa Bilgi Getir
  ↓ [G-4] L1 YAPICI → Log üretir
  ↓ [G-5] L2 VALIDATOR → 5 eksen denetim
         HATA → G-4 + Tutanak
  ↓ [G-6] Kanıt → Yoksa G-4
  ↓ [G-7] KABUL / RED → RED ise G-4
  ↓ [G-8] Arşiv + Self-Learning + Push
  ↓ GÖREV KAPATILDI ✅
```

---

## BÖLÜM 8: İLK 3 SOMUT ADIM

| # | İşlem | Katman |
|---|---|---|
| 1 | Görev ZOD şemasını yaz → G-0'ı kilitle | Teknik |
| 2 | G-7 Human Gate UI → Sadece KABUL / RED | Frontend |
| 3 | G-8 Arşiv tablosunu Supabase'de oluştur | Veritabanı |

---

> Kaynak: rules.md + GEMINI.md + BIND_RULES  
> Varsayım: SIFIR | Tarih: 08 Nisan 2026 — 02:58 UTC+3
