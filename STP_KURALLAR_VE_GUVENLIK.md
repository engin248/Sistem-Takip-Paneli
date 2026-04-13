# STP — KURALLAR VE GÜVENLİK REFERANSı
> **Versiyon:** 2.0 | **Tarih:** 13 Nisan 2026  
> **Kurucu:** Engin | **Doktrin:** THE ORDER / NİZAM  
> **Kaynak:** STP_KONSOLIDASYON + KALICI_HAFIZA + KARAR_ALGORITMASI_MUHUR + KRITIK_DOSYA_MUHUR konsolidasyonu  
> **Durum:** KONSOLİDE — TEK KAYNAK

---

## 1. DEĞİŞMEZ SİSTEM KURALLARI (IMMUTABLE)

Bu kurallar hiçbir koşulda devre dışı bırakılamaz, değiştirilemez veya bypass edilemez.

### 1.1 İşlem Kontrol Kuralları

| # | Kural | Kaynak | Uygulama Noktası |
|---|-------|--------|-----------------|
| 1 | Hiçbir işlem sırasından çıkarılamaz | 5_KATMAN | K1→K5 zorunlu sıra |
| 2 | Hiçbir katman atlanamaz | 5_KATMAN | Her kapı sırayla geçilir |
| 3 | 3 ajan onayı olmadan işlem kapanmaz | 5_KATMAN | AJAN-A + B + C onayı |
| 4 | Her onay kanıtlanır ve raporlanır | 5_KATMAN | audit_logs immutable kayıt |
| 5 | Protokol immutable — sadece katman EKLENEBİLİR, çıkarılamaz | 5_KATMAN | Mimari genişletme kuralı |

### 1.2 Güvenlik Kuralları

| # | Kural | Risk Seviyesi | Detay |
|---|-------|--------------|-------|
| 6 | `proxy.ts` tekil güvenlik katmanı | 🔴 HAYATI | Next.js 16+ mimarisi. **middleware.ts OLUŞTURMA** — proxy.ts tüm güvenlik trafiğini yönetir |
| 7 | `.env.local` gitignore'da | 🔴 HAYATI | Commit'e GİRMEZ. Runtime'da validateSupabaseConnection() ile doğrulanır |
| 8 | Hardcoded secret YASAK | 🔴 HAYATI | GitHub Push Protection aktif. Placeholder key'ler network çağrısından ÖNCE engellenir |
| 9 | `audit_logs` şeması DEĞİŞTİRİLEMEZ | 🟡 YÜKSEK | Eski 6 alan şeması. `toDbRow()/fromDbRow()` adaptör kullanır. Şemayı değiştirmek TÜM adaptörleri kırar |
| 10 | STP Supabase ≠ Mizanet Supabase | 🟡 YÜKSEK | İki proje ASLA aynı Supabase kaynağını paylaşamaz |

### 1.3 Ekonomi Kuralları

| # | Kural | Politika |
|---|-------|---------|
| 11 | Dış bağımlılık SIFIR politikası | Mevcut araçla çözülemeyen durumda, önce ücretsiz alternatif aranır |
| 12 | Harici API — ücretsiz kota aşılmadan ücretli API'ye geçilemez | Kota izleme zorunlu |
| 13 | Ücretli işlem onaysız başlatılamaz | rules.md §21 — Kullanıcıya NET uyarı, onay ile |
| 14 | İçeride çözüm varsa dışarıya gidilmez | İç kaynak hiyerarşisi: KI → rules → eğitim → klonlama → ücretsiz API → (onaylarsa) ücretli |

---

## 2. AI KARAR YETKİSİ

### 2.1 Temel Kural

> **AI SİSTEMDE TEK BAŞINA KESİN KARAR ALMA YETKİSİ YOKTUR.**

Tüm durum geçişleri (`beklemede` → `devam_ediyor` → `dogrulama` → `tamamlandi`) **OPERATÖR** tarafından tetiklenir. AI motoru (`aiManager.ts`) yalnızca öncelik analizi **ÖNERİSİ** üretir.

### 2.2 Güvence Katmanları (5 Katman — Canlı Doğrulanmış)

| Katman | Açıklama | Durum |
|--------|----------|-------|
| 1. Kod İzolasyonu | `aiManager.ts` hiçbir DB importu (`supabase`) içermez → fiziksel olarak veritabanına erişemez | ✅ |
| 2. Tek Giriş Noktası | DB mutasyonları yalnızca `taskService.ts` üzerinden geçer → AI bu servise bağlı değildir | ✅ |
| 3. Audit İzleme | Her statü değişikliği `audit_logs` tablosuna IMMUTABLE olarak yazılır → geri alınamaz | ✅ |
| 4. RLS Koruması | `audit_logs` tablosunda UPDATE/DELETE politikası YOKTUR → mühürlü kayıt | ✅ |
| 5. Doğrulama Statüsü | TaskStatus enum'unda `dogrulama` aşaması mevcut → kesinleşme öncesi operatör doğrulaması | ✅ |

### 2.3 Karar Akış Haritası

```
1. OPERATÖR → TaskForm.tsx'den görev başlığı girer
2. TaskForm.tsx → status: 'beklemede', priority: 'normal' olarak Supabase'e yazar
3. OPERATÖR → TaskCard.tsx üzerinden statü değiştirir
   (beklemede → devam_ediyor → dogrulama → tamamlandi)
4. taskService.ts → updateStatus() fonksiyonu veritabanını günceller
5. auditService.ts → Her değişiklik audit_logs'a IMMUTABLE olarak kaydedilir
```

**AI Konumu:** AI (`aiManager.ts`) mevcut akışta **PASİF** konumdadır. Kararları **uygulanmamaktadır**. Veritabanı mutasyonları **%100 operatör inisiyatifindedir**.

### 2.4 Gelecek Uyarıları

- AI motoruna DB yazma yetkisi verilmesi durumunda KARAR_ALGORITMASI mühürü **GEÇERSİZ** sayılır
- Gelecekte AI kararlarının uygulanması istenirse **OPERATÖR ONAY KAPISI** (approval gate) zorunludur
- Her mühür ihlali `audit_logs`'a **CRITICAL** seviyede kaydedilmelidir

---

## 3. KRİTİK DOSYA KORUMA

### 3.1 Korunan Dosyalar (SHA-256 ile mühürlü)

| # | Dosya | Rol | Kritiklik | Koruma |
|---|-------|-----|-----------|--------|
| 1 | `.env.local` | Supabase Bağlantısı | 🔴 HAYATI | DOKUNULMAZ — Patron (Engin) onayı gerektirir |
| 2 | `useTaskStore.ts` | Sistemin Hafızası | 🔴 HAYATI | DOKUNULMAZ — Task tipleri, interface, store |
| 3 | `supabase.ts` | Sistemin Kalbi | 🔴 HAYATI | DOKUNULMAZ — Singleton client, tüm servisler bağımlı |

### 3.2 Koruma Kuralları

1. Bu dosyalar hiçbir görev, temizlik veya optimizasyon sırasında **SİLİNEMEZ**
2. İçerik değişikliği yalnızca **Patron (Engin) onayıyla** yapılabilir
3. Her değişiklik öncesi **SHA-256 hash doğrulaması** yapılmalıdır
4. Mühür bütünlüğü ihlal edilirse sistem otomatik durdurulur

---

## 4. OPERATÖR ROLLERİ

### 4.1 Operatör Yetki Matrisi

| Rol | Yetki | Açıklama |
|-----|-------|----------|
| **ALBAY** | Tam yetki | Komuta — tüm işlemleri başlatabilir, durdurabilir, onaylayabilir |
| **BAŞMIMAR** | Teknik yetki | Mimari karar — kod değişikliği onayı, stack kararları |
| **MÜHÜRDAR** | Mühür yetkisi | Denetim mühürleme — fabrika çıkışı, hash doğrulama |
| **GÖZCÜ** | Okuma + rapor | İzleme + denetim — değişiklik yapamaz, raporlayabilir |

### 4.2 Workspace Ajan Görev Dağılımı

| Ajan | Görev | Kapsam Sınırı |
|------|-------|---------------|
| Agent A | Mizanet geliştirici | Sadece Mizanet dizini |
| Agent B | STP geliştirici | Sadece STP dizini |
| Agent C | Arşiv temizleyici | Rapor — silme yasak |
| Agent D | Dokümantasyon | Rapor — silme yasak |
| Agent E | Audit temizliği | Rapor — silme yasak |

---

## 5. THE ORDER / NİZAM v2.0 — TEMEL DİSİPLİN

Bu kurallar tüm operasyonlarda geçerlidir ve THE ORDER doktrininden alınmıştır.

### 5.1 Temel Disiplin

| # | Kural |
|---|-------|
| 1 | Sıfır inisiyatif: Komut dışına çıkılamaz, yorum yapılamaz, tahmin edilemez |
| 2 | Varsayım yasak: Eksik bilgi varsa dur, soru sor, tahminle devam etme |
| 3 | Kanıtlı rapor zorunlu: Her işlem sonrası ne yapıldı, nerede, çıktı ne raporlanır |
| 4 | Görev bütünlüğü: Parça iş yasak. Görev eksiksiz tamamlanmadan "bitti" denemez |
| 5 | Hata durdurur: Hata varsa dur, raporla, düzeltmeden devam etme |
| 6 | Canlı veri öncelikli: MD dosyaları referanstır, karar kaynağı değildir |
| 7 | Bu kurallar devre dışı bırakılamaz |

### 5.2 Analiz Disiplini

| # | Kural |
|---|-------|
| 8 | Her konu 5 eksenden analiz edilir: Stratejik, teknik, operasyonel, ekonomik, insan/sürdürülebilirlik |
| 9 | Analiz derinliği: Akademik seviye, mimari doğrulama, risk tespiti |
| 10 | Çıktı formatı: Problem → Varsayımlar → Kritik Sorular → Kör Noktalar → Riskler → Alternatifler → Sonuç |
| 11 | Mantık doğrulama: Tutarlılık, çelişki, eksik veri kontrolü yapılmadan sonuç üretilmez |

### 5.3 Kod ve Teknik

| # | Kural |
|---|-------|
| 12 | Kod istendiyse sadece kod verilir, gereksiz açıklama yapılmaz |
| 13 | Var olan dosya yapısı korunur, izinsiz değiştirilmez |
| 14 | Gereksiz bağımlılık eklenmez, sadece ilgili fonksiyon değiştirilir |
| 15 | Frontend ve backend uyumu kontrol edilmeden işlem tamamlanmış sayılmaz |
| 16 | Yazılan kod tamamı kontrol edilmeden bitmiş sayılmaz |

### 5.4 Güvenlik

| # | Kural |
|---|-------|
| 17 | Kritik sistem dosyaları izinsiz değiştirilmez |
| 18 | Veritabanı işlemleri doğrulanmadan önerilmez |
| 19 | Sistem mimarisi izinsiz değiştirilmez, güvenlik riskleri raporlanır |
| 20 | Halüsinasyon yasak: Bilinmeyen bilgi uydurulmaz, belirsizlik açıkça belirtilir |

### 5.5 Git Disiplini

| # | Kural |
|---|-------|
| 21 | Tamamlanmamış, test edilmemiş, kontrol edilmemiş kod push edilmez |
| 22 | Her commit açıklamalı, izlenebilir ve geri alınabilir olmalıdır |
| 23 | Buluta gönderilmeyen kod "tamamlanmış" sayılmaz |

### 5.6 Kalite ve Performans

| # | Kural |
|---|-------|
| 24 | Performans değerlendirmesi: Ölçeklenebilirlik, maliyet, bakım karmaşıklığı |
| 25 | Kalite filtresi: Doğruluk, tutarlılık, açıklık, mantıksal bütünlük |
| 26 | Gereksiz MD veya tekrar eden dosya oluşturulamaz |
| 27 | Sistem çoklu dosya kontrol kapasitesini kullanmak zorundadır |

### 5.7 Kullanıcı Otoritesi

| # | Kural |
|---|-------|
| 28 | Kullanıcı talimatı değiştirilmez, yorumlanmaz, yeniden yazılmaz — doğrudan uygulanır |
| 29 | Sistem yapabileceği işi kullanıcıya yaptırmaz |
| 30 | Verilen her adım nerede, nasıl, ne yazılacak net ve eksiksiz açıklanır |
| 31 | Her komut kopyala-yapıştır hazır şekilde verilir |

---

## 6. SÜRDÜRÜLEBILIRLIK KURALLARI

| Kural | Açıklama |
|-------|----------|
| Zaman baskısı hiçbir kuralı devre dışı bırakamaz | Acele işte yanlışlık kabul edilemez |
| Kısayol = sistem borcu | Her atlatılan kapı ileride iki hata üretir |
| Sıfır dış bağımlılık hedefi | Sistem tüm harici servisleri olmadan çalışabilmeli |
| Kullanıcı yorgunluğu sistem kuralını değiştirmez | Kural her koşulda geçerlidir |

---

> **Mühür:** KURALLAR-GUVENLIK-KONSOLİDE-V2.0-STP  
> **Tarih:** 13 Nisan 2026
