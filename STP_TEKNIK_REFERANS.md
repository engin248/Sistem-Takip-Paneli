# STP — TEKNİK REFERANS VE SİSTEM HARİTASI
> **Versiyon:** 2.0 | **Tarih:** 13 Nisan 2026  
> **Kurucu:** Engin | **Doktrin:** Sistem Takip Paneli  
> **Kaynak:** PROJE_PLANI + SISTEM_HARITASI + INTEGRASYON_RAPORU + KALICI_HAFIZA + STP_KONSOLIDASYON konsolidasyonu  
> **Durum:** KONSOLİDE — TEK KAYNAK

---

## 1. PROJE KİMLİĞİ

| Özellik | Değer |
|---------|-------|
| **Proje Adı** | Sistem Takip Paneli (STP) |
| **Sistem Kodu** | STP-001-VSF |
| **Çalışma Dizini** | `C:\Users\Esisya\Desktop\Sistem-Takip-Paneli\02_is_alani` |
| **Git Repo** | `engin248/Sistem-Takip-Paneli` |
| **Canlı URL** | https://sistem-takip-paneli.vercel.app |
| **Son Commit** | `5f37f27` (main) |
| **DB Proje Ref** | Supabase `tesxmqhkegotxenoljzl` |
| **Bot** | @Lumora_47bot geçici paylaşımlı (STP'ye özel bot oluşturulacak) |
| **AI** | Ollama llama3.2:1b (lokal, 0 maliyet) + OpenAI GPT-4o-mini (yedek) |

---

## 2. TEKNOLOJİ STACK

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| Framework | Next.js | 16.2.2 |
| Runtime | React | 19.2.4 |
| Language | TypeScript | 5.x (strict mode) |
| Database | Supabase | ^2.102.1 |
| State | Zustand | ^5.0.12 |
| CSS | TailwindCSS | ^4 |
| Notifications | Sonner | ^2.0.7 |
| AI Integration | OpenAI | ^6.33.0 |
| AI Local | Ollama | llama3.2:1b |
| Bot | Grammy (Telegram) | ^1.42.0 |
| Browser | Playwright | ^1.59.1 |
| Validation | Zod | ^4.3.6 |
| Unit Test | Vitest | ^4.1.4 |
| E2E Test | Playwright Test | ^1.59.1 |
| Güvenlik | proxy.ts (Next.js 16+ — middleware.ts YOK) | — |

---

## 3. DİZİN MİMARİSİ (4 KATMAN)

```
Sistem-Takip-Paneli/
├── 01_komutlar/          → SQL şemaları, RLS politikaları, operasyon kılavuzu
├── 02_is_alani/          → Next.js 16 uygulaması (kaynak kod)
│   ├── src/app/          → Sayfalar + API route'lar
│   ├── src/components/   → UI bileşenleri
│   ├── src/services/     → İş mantığı servisleri
│   ├── src/lib/          → Altyapı kütüphaneleri
│   ├── src/store/        → Zustand state yönetimi
│   ├── e2e/              → Playwright E2E testleri
│   ├── vitest.config.ts  → Unit test konfigürasyonu
│   └── playwright.config.ts → E2E test konfigürasyonu
├── 03_denetim_kanit/     → Denetim belgeleri ve kanıtlar
└── 04_arsiv_muhur/       → Arşiv ve mühür kayıtları (IMMUTABLE)
```

---

## 4. DOSYA ENVANTERİ — GÜNCEL

### 4.1 Lib (12 dosya)

| # | Dosya | İşlev | Kritiklik |
|---|-------|-------|-----------|
| 1 | `supabase.ts` | Singleton client + bağlantı doğrulama | 🔴 HAYATI |
| 2 | `errorCore.ts` | Merkezi hata motoru (34 ERR kodu + UID) | 🔴 HAYATI |
| 3 | `errorHandler.ts` | Hata işleme orkestratörü → audit + toast | YÜKSEK |
| 4 | `permissionGuard.ts` | Dosya seviyesi kilitleme | YÜKSEK |
| 5 | `i18n.ts` | TR/AR çeviri sözlüğü | YÜKSEK |
| 6 | `validation.ts` | ZOD G-0 giriş filtresi (7 şema) | YÜKSEK |
| 7 | `constants.ts` | Hata kodu sabitleri | NORMAL |
| 8 | `proxy.ts` | Güvenlik katmanı (middleware.ts yerine) | 🔴 HAYATI |
| 9 | `swRegister.ts` | Service Worker kayıt | NORMAL |
| 10 | `errorCore.test.ts` | errorCore birim testleri (6 test) | NORMAL |
| 11 | `validation.test.ts` | validation birim testleri (9 test) | NORMAL |
| 12 | `types.ts` | Tip tanımları | NORMAL |

### 4.2 Servisler (17 dosya)

| # | Dosya | Boyut | İşlev | Tablo | Durum |
|---|-------|-------|-------|-------|-------|
| 1 | `taskService.ts` | 7KB | CRUD + Kanban + Realtime | tasks | ✅ |
| 2 | `auditService.ts` | 7KB | DB adaptör + log yazma/okuma | audit_logs | ✅ |
| 3 | `aiManager.ts` | 15KB | OpenAI + Ollama AI analiz | — | ✅ |
| 4 | `alarmService.ts` | 8KB | Alarm yönetimi | — | ✅ |
| 5 | `boardService.ts` | 8KB | Kurul karar CRUD | board_decisions | ✅ |
| 6 | `bridgeService.ts` | 12KB | Dış sistem köprüsü | — | ✅ |
| 7 | `browserService.ts` | 17KB | Playwright köprüsü | — | ⏳ |
| 8 | `browserlessAdapter.ts` | 5KB | Browserless bağlantı | — | ⏳ |
| 9 | `consensusEngine.ts` | 13KB | 3 AI ajan oylama | board_decisions | ✅ |
| 10 | `exportService.ts` | 1KB | CSV/JSON dışa aktarma | — | ⏳ |
| 11 | `l2Validator.ts` | 9KB | Otonom L2 denetim | — | ✅ |
| 12 | `selfLearningEngine.ts` | 9KB | Hata pattern analizi | self_learning_logs | ✅ |
| 13 | `telegramNotifier.ts` | 4KB | HTTP bot bildirim | — | ✅ |
| 14 | `telegramService.ts` | 17KB | Bot komut işleme | — | ✅ |
| 15 | `authService.ts` | 6KB | Supabase Auth wrapper | — | ⏳ |
| 16 | `notificationService.ts` | 7KB | Push bildirim | notifications | ⏳ |
| 17 | `map.ts` | 10KB | Sistem haritası üretici | — | ✅ |

### 4.3 Bileşenler (19 dosya)

| # | Dosya | İşlev |
|---|-------|-------|
| 1 | `TaskForm.tsx` | Görev oluşturma (ZOD entegre) |
| 2 | `TaskCard.tsx` | Görev kartı + durum yönetimi |
| 3 | `TaskBoard.tsx` | Kanban sürükle-bırak |
| 4 | `AuditLog.tsx` | Denetim günlüğü |
| 5 | `BoardPanel.tsx` | Kurul kararları paneli |
| 6 | `Stats.tsx` | 7 kartlı istatistik |
| 7 | `NavBar.tsx` | Navigasyon + Auth çıkış |
| 8 | `NotificationBell.tsx` | Bildirim zili |
| 9 | `PwaInstallPrompt.tsx` | PWA kurulum istemi |
| 10 | `DirProvider.tsx` | RTL/LTR senkronizasyonu |
| 11 | `SwInit.tsx` | Service Worker başlatma |
| 12 | `LoginPage.tsx` | Giriş/Kayıt sayfası |
| 13 | `AuthProvider.tsx` | Oturum koruma katmanı |
| 14-19 | Diğer yardımcı bileşenler | — |

### 4.4 Sayfalar + API (11 API route)

| Dosya | İşlev |
|-------|-------|
| `page.tsx` | Dashboard ana sayfa |
| `layout.tsx` | Root layout + AuthProvider |
| `error.tsx` | Global hata sınırı |
| `loading.tsx` | Yükleme göstergesi |
| `not-found.tsx` | 404 sayfası |
| `api/alarms/route.ts` | Alarm API |
| `api/board/decide/route.ts` | Kurul karar API |
| `api/bridge/route.ts` | Bridge API |
| `api/browser/route.ts` | Tarayıcı API |
| `api/health-check/route.ts` | Sağlık kontrolü |
| `api/learn/route.ts` | Self-Learning API |
| `api/notify/route.ts` | Bildirim API |
| `api/ollama/route.ts` | Ollama AI API |
| `api/tasks/route.ts` | Görev CRUD API |
| `api/telegram/route.ts` | Telegram webhook |
| `api/validate/route.ts` | L2 Validator API |

### 4.5 Store (4 dosya)

| Dosya | İşlev |
|-------|-------|
| `useTaskStore.ts` | Görev durumu yönetimi (🔴 HAYATI) |
| `useLanguageStore.ts` | Dil tercihi (persist) |
| `useOperatorStore.ts` | Operatör/Rol yönetimi |
| `useAuthStore.ts` | Oturum durumu |

### 4.6 Test Dosyaları (5 dosya — 36 test case)

| # | Dosya | Tür | Test Sayısı | Kapsam |
|---|-------|-----|-------------|--------|
| 1 | `src/lib/errorCore.test.ts` | Unit (Vitest) | 6 | UID, ERR sabitleri, processError |
| 2 | `src/lib/validation.test.ts` | Unit (Vitest) | 9 | CreateTask, UpdateStatus, BoardDecision, validateInput |
| 3 | `e2e/01-dashboard.spec.ts` | E2E (Playwright) | 6 | Sayfa yükle, kilit, Kanban, Stats |
| 4 | `e2e/02-api-endpoints.spec.ts` | E2E (Playwright) | 8 | health-check, validate, learn, notify, board, telegram |
| 5 | `e2e/03-navigation.spec.ts` | E2E (Playwright) | 7 | NavBar, /logs, 404, responsive, erişilebilirlik |

### 4.7 Dosya Sayı Özeti

| Dizin | Adet |
|-------|------|
| services/ | 20 |
| components/ | 19 |
| lib/ | 12 |
| store/ | 4 |
| API routes | 11 |
| **Toplam src/** | **76** |

---

## 5. VERİTABANI

### 5.1 STP Tabloları

| Tablo | Kolon Sayısı | Erişen Dosyalar | Özel Not |
|-------|-------------|-----------------|----------|
| `tasks` | 11 | taskService, TaskForm, TaskCard, page, useTaskStore, exportService, Stats | status CHECK, priority CHECK, due_date |
| `audit_logs` | 6 (eski şema) | auditService, AuditLog, taskService, errorHandler, TaskForm, exportService, page | ⚠️ toDbRow/fromDbRow adaptör — **ŞEMA DEĞİŞTİRME** |
| `board_decisions` | 26 | boardService, consensusEngine, BoardPanel | 3 AI ajan oylama + seal_hash |
| `notifications` | 8 | notificationService, NotificationBell | Push bildirim |
| `self_learning_logs` | 6 | selfLearningEngine | Pattern analizi |

### 5.2 Constraint'ler

| Tablo.Kolon | İzin Verilen Değerler |
|-------------|----------------------|
| `tasks.status` | `beklemede`, `devam_ediyor`, `tamamlandi`, `iptal` |
| `tasks.priority` | `dusuk`, `normal`, `yuksek`, `kritik` |

### 5.3 Audit Logs Uyarısı

> ⚠️ `auditService.ts` → `toDbRow()/fromDbRow()` adaptör kullanıyor. Tablo ESKİ 6 alan şemasını kullanıyor. **ŞEMAYI DEĞİŞTİRME.**

---

## 6. HATA KODU SİSTEMİ

| Kod | Sabit Adı | Açıklama | Seviye |
|-----|-----------|----------|--------|
| ERR-STP001-001 | SYSTEM_GENERAL | Genel sistem hatası | ERROR |
| ERR-STP001-002 | DB_CONNECTION | Veritabanı bağlantı hatası | CRITICAL |
| ERR-STP001-003 | TASK_FETCH | Görev listesi çekilemedi | ERROR |
| ERR-STP001-004 | TASK_UPDATE | Görev durumu güncellenemedi | ERROR |
| ERR-STP001-005 | TASK_DELETE | Görev silinemedi | ERROR |
| ERR-STP001-006 | AUDIT_WRITE | Audit log yazılamadı | ERROR |
| ERR-STP001-007 | AUDIT_READ | Audit log okunamadı | ERROR |
| ERR-STP001-008 | TASK_ARCHIVE | Görev arşivlenemedi | ERROR |
| ERR-STP001-009 | TASK_REALTIME | Realtime kanal açılamadı | CRITICAL |
| ERR-STP001-010 | TASK_CREATE | Görev oluşturulamadı — Supabase | ERROR |
| ERR-STP001-011 | TASK_CREATE_GENERAL | Görev oluşturulamadı — Genel | ERROR |
| ERR-STP001-012 | SYSTEM_EXPORT | Sistem verisi dışa aktarılamadı | ERROR |
| ERR-STP001-013 | CONNECTION_INVALID | Bağlantı bilgileri geçersiz | CRITICAL |
| ERR-STP001-014 | AI_ANALYSIS | AI analiz hatası | ERROR |
| ERR-STP001-015 | AI_CONNECTION | AI bağlantı hatası | ERROR |
| ERR-STP001-016 | TELEGRAM_SEND | Telegram mesaj gönderilemedi | ERROR |
| ERR-STP001-017 | AUDIT_REALTIME | Audit realtime bağlantı hatası | ERROR |
| ERR-STP001-018 | BOARD_CREATE | Kurul kararı oluşturulamadı | ERROR |
| ERR-STP001-019 | BOARD_FETCH | Kurul kararları çekilemedi | ERROR |
| ERR-STP001-020 | BOARD_UPDATE | Kurul kararı güncellenemedi | ERROR |
| ERR-STP001-021 | CONSENSUS_ENGINE | Konsensüs motoru hatası | ERROR |
| ERR-STP001-022 | BOARD_SEAL | Kurul mühürleme hatası | ERROR |
| ERR-STP001-023 | FILE_LOCK | Dosya kilitleme hatası | ERROR |
| ERR-STP001-024 | FILE_PERMISSION | Dosya yetki hatası | ERROR |
| ERR-STP001-025 | FILE_UNLOCK | Dosya kilit açma hatası | ERROR |
| ERR-STP001-026 | BROWSER_LAUNCH | Tarayıcı başlatılamadı | ERROR |
| ERR-STP001-027 | BROWSER_NAVIGATION | Tarayıcı navigasyon hatası | ERROR |
| ERR-STP001-028 | BROWSER_EXTRACTION | Tarayıcı veri çıkarma hatası | ERROR |
| ERR-STP001-030 | BRIDGE_CONNECTION | Bridge bağlantı hatası | ERROR |
| ERR-STP001-031 | BRIDGE_TIMEOUT | Bridge zaman aşımı | ERROR |
| ERR-STP001-032 | ALARM_CREATE | Alarm oluşturulamadı | ERROR |
| ERR-STP001-033 | ALARM_RESOLVE | Alarm çözülemedi | ERROR |
| ERR-STP001-034 | HEALTH_CHECK | Sağlık kontrolü hatası | ERROR |
| ERR-STP001-999 | UNIDENTIFIED_COLLAPSE | Tablo çökmesi | FATAL |

**Toplam: 34 benzersiz hata kodu | 21+ entegre dosya**  
**Format:** `ERR-STP001-XXX` | **UID Sistemi:** Her hata oluşumuna `UID-YYYYMMDD-HHMMSS-XXXX` atanır

---

## 7. VERİ AKIŞI VE ENTEGRASYON

### 7.1 Veri Akış Diyagramı

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

**Her ok bir denetim noktasıdır. Denetimsiz veri akışı YOKTUR.**

### 7.2 Bağlantı Matrisi

| Kaynak → Hedef | Yöntem | Denetim | Durum |
|----------------|--------|---------|-------|
| ALT → ÜST (DB → Frontend) | Supabase Realtime Channels | subscribeToTasks | ✅ |
| ÜST → ALT (Frontend → DB) | Supabase Client `.from()` | taskService, auditService | ✅ |
| ÖN → ARKA (Servis → Hata) | processError() + handleError() | UID + source | ✅ |
| ARKA → ALT (Hata → Audit) | logAudit() → audit_logs INSERT | Immutable | ✅ |
| ÜST → ÖN (UI → State) | Zustand Store | useTaskStore.getState() | ✅ |
| ÖN → ÜST (Hata → Toast) | Toast (sonner) | toast.error() | ✅ |

### 7.3 Veri Güvenlik Kontrolleri

| Kontrol | Sonuç |
|---------|-------|
| Console'a ham veri basılmıyor — sadece ERR kodları + UID | ✅ |
| Toast'ta hassas veri yok — sadece hata kodu + kaynak dosya | ✅ |
| LocalStorage/SessionStorage'a veri yazılmıyor | ✅ |
| `.from()` çağrıları sadece tanımlı servis dosyalarından | ✅ |
| Doğrudan component→DB erişimi: Sadece TaskForm.tsx (INSERT, denetim altında) | ✅ |
| `.env.local` runtime'da doğrulanıyor (validateSupabaseConnection) | ✅ |
| Placeholder key'ler network çağrısından ÖNCE engelleniyor | ✅ |
| Audit log yazma hatası bile loglanıyor (son çare: console) | ✅ |

### 7.4 Entegrasyon Katmanları

| Katman | Ad | Bileşenler | Durum |
|--------|-----|-----------|-------|
| ALT | Veritabanı (Supabase) | tasks, audit_logs, board_decisions, notifications, self_learning_logs | ✅ |
| ÜST | Frontend (Next.js App Router) | page.tsx, layout.tsx, NavBar, TaskForm, TaskCard, AuditLog, Stats, DirProvider | ✅ |
| ÖN | Servis Katmanı (İş Mantığı) | taskService, auditService, aiManager, boardService, consensusEngine + 12 diğer | ✅ |
| ARKA | Hata Yönetimi + Denetim Zinciri | errorCore, errorHandler, constants, supabase | ✅ |

---

## 8. DOĞRULAMA SONUÇLARI (13 Nisan 2026)

| Kontrol | Sonuç |
|---------|-------|
| Build | ✅ 13 route, exit 0 |
| TypeScript | ✅ 0 hata |
| Vitest (Unit) | ✅ 20/20 |
| Playwright (E2E) | ✅ 36 test case |
| Vercel Health | ✅ healthy |
| Telegram Bot | ✅ @Lumora_47bot çalışıyor |
| Ollama | ✅ llama3.2:1b, 19ms latency |
| Git Status | ✅ Temiz |

---

## 9. VERİTABANI İZOLASYON KURALI

> **KURAL:** Her proje kendi Supabase kaynağını kullanır — projeler arası veritabanı paylaşımı YASAKTIR. STP tabloları yalnızca STP servis dosyaları tarafından erişilir.

---

## 10. SQL DOSYALARI (01_komutlar/)

| Dosya | Boyut | İşlev |
|-------|-------|-------|
| `supabase_schema.sql` | 10.6KB | Veritabanı tablo şeması |
| `rls_policies.sql` | 7.4KB | Row Level Security kuralları |
| `rls_politikalari.sql` | 2.7KB | RLS politikaları (Türkçe) |
| `board_decisions_migration.sql` | 3.7KB | Kurul tablosu migration |
| `file_level_locking_rls.sql` | 3.1KB | Dosya kilitleme RLS |
| `migration_fix_20260410.sql` | 9.1KB | Migration düzeltme |

---

> **Mühür:** TEKNIK-REFERANS-KONSOLİDE-V2.0-STP  
> **Tarih:** 13 Nisan 2026
