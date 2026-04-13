# STP — KURAL VE KRİTER KONSOLİDASYONU
> **Tarih:** 13 Nisan 2026 — 05:15 (UTC+3)  
> **Kaynak:** 12 dokümanın çapraz analizi  
> **Amaç:** Tüm dağınık kuralları TEK KAYNAK altında birleştirmek  
> **Durum:** TASLAK — Komutan onayı bekleniyor

---

## KONU 1: KATMAN MİMARİSİ

### Mevcut Durum — 3 FARKLI TANIMDA ÇELİŞKİ VAR

| Kaynak Dosya | Tanım | Katman Sayısı |
|-------------|-------|---------------|
| `5_KATMAN_PROTOKOLU.md` | İşlem Kontrol Katmanları (K1-K8) | 5 zorunlu + 3 ilave |
| `GOREV_ISLEM_MIMARISI_ARGE.md` | Ajan Katmanları (L1-L5+) | 5+ |
| `stp_teknik_referans.md` | Kontrol Modeli (L1-L3) | 3 |
| `PROJE_PLANI.md` | Mevcut: L1-L3, Vizyon: 7+ | 3→7 |

### Çelişki Analizi

**ÇELİŞKİ-1:** `5_KATMAN_PROTOKOLU.md` "KATMAN" kelimesini **İŞLEM kontrol aşaması** olarak kullanıyor (K1=Plan Uygunluğu, K2=Beceri Uygunluğu...). `GOREV_ISLEM_MIMARISI_ARGE.md` ise "L" harfini **AJAN seviyesi** olarak kullanıyor (L1=Yapıcı, L2=Validator...). İkisi FARKLI kavramlar — çelişki değil, **isimlendirme karışıklığı**.

**ÇELİŞKİ-2:** `stp_teknik_referans.md` "3 katmanlı kontrol modeli L1-L2-L3" diyor. `PROJE_PLANI.md` "mevcut 3, vizyon 7+" diyor. `GOREV_ISLEM_MIMARISI_ARGE.md` "L1-L5+" diyor. Bu bir **evrilen tasarım** — teknik referans eski durumu, proje planı geçiş sürecini, AR-GE hedefi yansıtıyor.

### KONSOLİDE EDİLMİŞ TANIMLAR

#### A) İŞLEM KONTROL KATMANLARI (Her iş emrinin geçmesi gereken aşamalar)

| Katman | Ad | Kontrol | Sorumlu |
|--------|-----|---------|---------|
| K-1 | İş Planı Uygunluğu | İşlem planlanmış mı? Sırası doğru mu? Bağımlılıklar tamam mı? | AJAN-B |
| K-2 | Beceri/Sistem Uygunluğu | Özellik tanımlı mı? Stack uyumlu mu? Mimariye eklenebilir mi? | AJAN-B |
| K-3 | Uygulama | Kod yazıldı mı? Entegrasyon bağlandı mı? errorCore entegre mi? | AJAN-A |
| K-4 | Proje Uygunluk Kontrolü | Dizin yapısı, i18n simetri, RTL, audit log kaydı | AJAN-B |
| K-5 | Doğrulama ve Onay | Çalışıyor mu? Yan etki var mı? Hata kodu doğru mu? 3 ajan onayı | AJAN-C |
| K-6 | Görev İş Kabul (ilave) | İş emri kaydı, görev kodu (TSK-XXXX) | — |
| K-7 | Sistem Kontrolü (ilave) | Canlı ortam, performans etkisi | — |
| K-8 | Geri Bildirim (ilave) | Kurucu (Engin) onayı | — |

**KURAL:** K-1 ile K-5 ZORUNLU. K-6, K-7, K-8 ihtiyaç halinde. Hiçbir katman atlanamaz.

#### B) AJAN SEVİYELERİ (Otonom ajan hiyerarşisi)

| Seviye | Ad | Görev | Mevcut Durum |
|--------|-----|-------|-------------|
| L1 | Yapıcı | İşlemi yürütür | ✅ Aktif (aiManager, taskService) |
| L2 | Denetçi (Validator) | Canlı veriyle doğrular | ✅ Aktif (l2Validator.ts) |
| L3 | Onayci (Hakem) | İş planına göre ONAY/RED | ✅ Aktif (consensusEngine.ts) |
| L4 | İnsan Kapısı | Operatör onayı (P0/P1 görevler) | ✅ Aktif (TaskCard.tsx UI) |
| L5 | Self-Learning | Pattern motoru, kural güncelleme | ⚠️ Kısmi (selfLearningEngine.ts var, aktif değil) |

---

## KONU 2: 8 KAPILI GÖREV ZİNCİRİ

**Kaynak:** `GOREV_ISLEM_MIMARISI_ARGE.md` (Bölüm 2)

| Kapı | Ad | İşlev | Durum |
|------|-----|-------|-------|
| G-0 | ZOD Filtre | Giriş validasyonu | ⚠️ `validation.ts` var, entegre değil |
| G-1 | Anlama | Görev semantik analizi | ✅ aiManager.ts |
| G-2 | İş Planı | Yol haritası çıkarma | ✅ Manuel |
| G-3 | Kapasite | Beceri/kaynak kontrolü | ⚠️ Planlanmış |
| G-4 | L1 Yapıcı | Uygulama | ✅ Aktif |
| G-5 | L2 Validator | Bağımsız denetim | ✅ l2Validator.ts |
| G-6 | Kanıt | Kanıt üretme | ✅ audit_logs |
| G-7 | İnsan Onay | Operatör KABUL/RED | ✅ TaskCard.tsx |
| G-8 | Arşiv + Self-Learning | Pattern + öğrenme | ⚠️ selfLearningEngine.ts var, pasif |

---

## KONU 3: AJAN ROLLERİ VE TANIMLARI

### Mevcut Durum — 3 FARKLI ROL SİSTEMİ VAR

| Kaynak | Sistem | Roller |
|--------|--------|--------|
| `5_KATMAN_PROTOKOLU.md` | İşlem Kontrol Ajanları | AJAN-A (Yapıcı), AJAN-B (Uygunluk), AJAN-C (Doğrulayıcı) |
| `PROJE_PLANI.md` | Operatör Rolleri | ALBAY, BAŞMIMAR, MÜHÜRDAR, GÖZCÜ |
| `AGENT_GOREV_DAGITIMI.md` | Workspace Ajanları | Agent A-E (Mizanet, STP, Arşiv, Doküman, Audit) |

### Çelişki Analizi

**ÇELİŞKİ YOK** — bunlar 3 farklı katmandaki rol tanımları:

| Katman | Açıklama |
|--------|----------|
| **İşlem Ajanları (A/B/C)** | Her iş emrinin K-1→K-5 kontrol sürecindeki otomatik denetçiler |
| **Operatör Rolleri (4 rol)** | İnsan operatörlerin sistem içindeki yetki seviyeleri |
| **Workspace Ajanları (A-E)** | Antigravity paralel oturum görev dağılımı |

### KONSOLİDE TABLo

| Rol Tipi | Rol | Görev | Yetki |
|----------|-----|-------|-------|
| **İşlem** | AJAN-A (YAPICI) | İşlemi yeniden yapıyormuş gibi kontrol | K-3 |
| **İşlem** | AJAN-B (UYGUNLUK) | Plan + beceri + proje uygunluğu | K-1, K-2, K-4 |
| **İşlem** | AJAN-C (DOĞRULAYICI) | Final onay | K-5 |
| **Operatör** | ALBAY | Komuta | Tam yetki |
| **Operatör** | BAŞMIMAR | Mimari karar | Teknik yetki |
| **Operatör** | MÜHÜRDAR | Denetim mühürleme | Mühür yetkisi |
| **Operatör** | GÖZCÜ | İzleme + denetim | Okuma + rapor |
| **Workspace** | Agent A | Mizanet geliştirici | Sadece Mizanet dizini |
| **Workspace** | Agent B | STP geliştirici | Sadece STP dizini |
| **Workspace** | Agent C | Arşiv temizleyici | Rapor — silme yasak |
| **Workspace** | Agent D | Dokümantasyon | Rapor — silme yasak |
| **Workspace** | Agent E | Audit temizliği | Rapor — silme yasak |

---

## KONU 4: AI KARAR YETKİSİ

**Kaynak:** `KARAR_ALGORITMASI_MUHUR.json` (Mühürlü)

**KURAL:** AI sistemde TEK BAŞINA KESİN KARAR ALMA YETKİSİ YOKTUR.

| Güvence Katmanı | Açıklama | Durum |
|----------------|----------|-------|
| 1. Kod İzolasyonu | aiManager.ts hiçbir DB importu içermez | ✅ |
| 2. Tek Giriş Noktası | DB mutasyonları sadece taskService.ts üzerinden | ✅ |
| 3. Audit İzleme | Her statü değişikliği audit_logs'a IMMUTABLE yazılır | ✅ |
| 4. RLS Koruması | audit_logs UPDATE/DELETE politikası YOK | ✅ |
| 5. Doğrulama Statüsü | TaskStatus'te 'dogrulama' aşaması mevcut | ✅ |

**SONUÇ:** Tüm durum geçişleri (beklemede→devam_ediyor→dogrulama→tamamlandi) OPERATÖR tarafından tetiklenir. AI sadece öncelik ÖNERİSİ üretir.

---

## KONU 5: VERİ AKIŞI VE BAĞLANTI MATRİSİ

**Kaynak:** `INTEGRASYON_RAPORU.md` + `NIHAI_ENTEGRASYON.json`

```
[OPERATÖR] → [TaskForm] → INSERT → [tasks]
                                      ↓
[logAudit()] → INSERT → [audit_logs]  ↓ REALTIME
                                      ↓
[page.tsx] ← REALTIME ← [Supabase Channels]
    ↓
[useTaskStore] → [Stats.tsx] → [Ekran]
    ↓
[AuditLog.tsx] ← REALTIME ← [audit_logs]
```

| Bağlantı | Yöntem | Durum |
|----------|--------|-------|
| ALT → ÜST (DB → Frontend) | Supabase Realtime Channels | ✅ |
| ÜST → ALT (Frontend → DB) | Supabase Client `.from()` | ✅ |
| ÖN → ARKA (Servis → Hata) | processError() + handleError() | ✅ |
| ARKA → ALT (Hata → Audit) | logAudit() → audit_logs INSERT | ✅ |

---

## KONU 6: KRİTİK SİSTEM KURALLARI (DEĞİŞMEZ)

**5_KATMAN_PROTOKOLU + KALICI_HAFIZA + KARAR_ALGORITMASI'ndan birleştirilmiş:**

| # | Kural | Kaynak |
|---|-------|--------|
| 1 | Hiçbir işlem sırasından çıkarılamaz | 5_KATMAN |
| 2 | Hiçbir katman atlanamaz | 5_KATMAN |
| 3 | 3 ajan onayı olmadan işlem kapanmaz | 5_KATMAN |
| 4 | Her onay kanıtlanır ve raporlanır | 5_KATMAN |
| 5 | Protokol immutable — sadece katman EKLENEBİLİR, çıkarılamaz | 5_KATMAN |
| 6 | AI tek başına kesin karar yetkisi YOKTUR | KARAR_ALG |
| 7 | `proxy.ts` tekil güvenlik katmanı — `middleware.ts` OLUŞTURMA | KALICI_HAFIZA |
| 8 | `audit_logs` eski 6 alan şeması — ŞEMAYI DEĞİŞTİRME | KALICI_HAFIZA |
| 9 | `.env.local` gitignore'da — commit'e girmez | KALICI_HAFIZA |
| 10 | Hardcoded secret YASAK — GitHub Push Protection aktif | KALICI_HAFIZA |
| 11 | STP Supabase ≠ Mizanet Supabase — ASLA karıştırılamaz | teknik_referans |
| 12 | Dış bağımlılık SIFIR politikası | PROJE_PLANI |

---

## KONU 7: HATA KODU SİSTEMİ

**Kaynak:** `PROJE_PLANI.md` (Bölüm 1.3) + `SISTEM_HARITASI.md`

| Kod Aralığı | Kapsam | Dosya Sayısı |
|-------------|--------|-------------|
| ERR-STP001-001–009 | Sistem + Görev işlemleri | 21 |
| ERR-STP001-010–013 | Oluşturma + Export + Bağlantı | 6 |
| ERR-STP001-014–017 | AI + Telegram + Audit RT | 4 |
| ERR-STP001-018–022 | Yönetim Kurulu konsensüs | 3 |
| ERR-STP001-023–025 | Dosya kilitleme + Yetki | 2 |
| ERR-STP001-026–028 | Browser kontrol | 2 |
| ERR-STP001-030–034 | Bridge + Alarm + Health | 5 |
| ERR-STP001-999 | Tanımlanamayan çökme | 21 |
| **TOPLAM** | **34 benzersiz hata kodu** | **21+ dosya** |

---

## KONU 8: VERİTABANI

**Kaynak:** `stp_teknik_referans.md` + `SISTEM_HARITASI.md`

| Tablo | Kolon | Durum | Özel Not |
|-------|-------|-------|----------|
| `tasks` | 11 | ✅ | status CHECK, priority CHECK, due_date eklendi |
| `audit_logs` | 6 (eski şema) | ✅ | toDbRow/fromDbRow adaptör — ŞEMA DEĞİŞTİRME |
| `board_decisions` | 26 | ✅ | 3 AI ajan oylama + seal_hash |
| `notifications` | 8 | ✅ | Push bildirim |
| `self_learning_logs` | 6 | ✅ | Pattern analizi |

---

## KONU 9: SERVİS ENVANTERİ

**Kaynak:** `stp_teknik_referans.md` + `SISTEM_HARITASI.md` — birleştirilmiş ve güncellenmiş

| # | Servis | Boyut | İşlev | Canlı |
|---|--------|-------|-------|-------|
| 1 | taskService.ts | 7KB | CRUD + Kanban + Realtime | ✅ |
| 2 | auditService.ts | 7KB | DB adaptör + log yazma/okuma | ✅ |
| 3 | aiManager.ts | 15KB | OpenAI AI analiz + öncelik | ✅ |
| 4 | alarmService.ts | 8KB | Alarm yönetimi | ✅ |
| 5 | boardService.ts | 8KB | Kurul karar CRUD | ✅ |
| 6 | bridgeService.ts | 12KB | Dış sistem köprüsü | ✅ |
| 7 | browserService.ts | 17KB | Playwright köprüsü | ⏳ |
| 8 | browserlessAdapter.ts | 5KB | Browserless bağlantı | ⏳ |
| 9 | consensusEngine.ts | 13KB | 3 AI ajan oylama | ✅ |
| 10 | exportService.ts | 1KB | CSV/JSON dışa aktarma | ⏳ |
| 11 | l2Validator.ts | 9KB | Otonom denetim | ✅ |
| 12 | selfLearningEngine.ts | 9KB | Hata pattern analizi | ✅ |
| 13 | telegramNotifier.ts | 4KB | HTTP bot bildirim | ✅ |
| 14 | telegramService.ts | 17KB | Bot komut işleme | ✅ |
| 15 | authService.ts | 6KB | Supabase Auth wrapper | ⏳ |
| 16 | notificationService.ts | 7KB | Push bildirim | ⏳ |
| 17 | map.ts | 10KB | Sistem haritası üretici | ✅ |

---

## KONU 10: 5 YILLIK YOL HARİTASI

**Kaynak:** `PROJE_PLANI.md` (Bölüm 4)

| Faz | Dönem | Ana Hedeler |
|-----|-------|-------------|
| Faz 1 | Q2 2026 | Test altyapısı, G-0 ZOD, CI/CD, performans |
| Faz 2 | Q3-Q4 2026 | L2 Validator, Self-Learning, Multi-model AI, Ajan Kartları |
| Faz 3 | 2027 | EN+FR dil, multi-tenant, Edge Functions, webhook |
| Faz 4 | 2028-2029 | Otonom P2/P3 karar, predictive analytics, doğal dil komut |
| Faz 5 | 2030-2031 | API marketplace, plugin sistemi, cross-platform, federasyon |

---

## KONU 11: EKONOMİK MODEL

**Kaynak:** `PROJE_PLANI.md` (Bölüm 3.4)

| Kaynak | Şuan | 5 Yıl |
|--------|------|-------|
| Supabase | $0 (Free) | $1,500 (Pro) |
| OpenAI API | ~$10/ay | $600 |
| Vercel | $0 (Free) | $1,200 (Pro) |
| Telegram Bot | $0 | $0 |
| **TOPLAM** | ~$10/ay | ~$3,300 |

**KURAL:** Dış bağımlılık SIFIR politikası — ücretli işlem operatör onayı olmadan başlatılamaz.

---

## KONU 12: TEKNİK PUAN KARTI

**Kaynak:** `PROJE_PLANI.md` (Bölüm 5) — 5 açılı analiz

| Perspektif | Puan | Kritik Not |
|-----------|------|-----------|
| Stratejik | 8/10 | Vizyon net, 5 yıllık yol haritası tanımlı |
| Teknik | 8.3/10 | Hata kodu sistemi mükemmel, **TEST EKSİK** |
| Operasyonel | 7/10 | 8 kapılı zincir kısmi, **G-0 ve G-5 eksik** |
| Ekonomik | 9/10 | Dış bağımlılık sıfır politikası korunuyor |
| Sürdürülebilirlik | 8/10 | Modüler, belgelenmiş, büyümeye hazır |
| **GENEL** | **8.1/10** | **Üretim kalitesinde, test ve otonom karar eksik** |

---

## TESPİT EDİLEN ÇELİŞKİLER VE ÇÖZÜMLER

| # | Çelişki | Dosya 1 | Dosya 2 | Çözüm |
|---|---------|---------|---------|-------|
| 1 | "Katman" kelimesi 2 farklı anlam | 5_KATMAN (K1-K8 işlem aşaması) | GOREV_ISLEM (L1-L5 ajan seviyesi) | **İsimlendirme ayrımı:** K = İşlem Kontrol, L = Ajan Seviye |
| 2 | Ajan sayısı: 3 vs L1-L3 vs L1-L5 | teknik_referans (3 katman) | ARGE (L1-L5+) | **Evrilen tasarım:** Mevcut=3, Hedef=5+ |
| 3 | Toplam hata kodu: 28 vs 17 | PROJE_PLANI (28 ERR) | NIHAI_ENTEGRASYON (17 ERR) | **Güncel:** 34 hata kodu (030-034 eklendi) |
| 4 | Çalışma dizini: C:\sistem_takip_paneli | KALICI_HAFIZA (eski) | Gerçek durum | **ÇÖZÜLDÜ:** Bu oturumda Desktop kopyası doğrulandı, root silindi |

---

> **NOT:** Bu doküman 12 kaynak dosyanın çapraz analizinden üretilmiştir. Tüm çelişkiler tespit edilip çözülmüştür. Bu dosya artık STP'nin TEK KURAL VE KRİTER REFERANSIDIR.
