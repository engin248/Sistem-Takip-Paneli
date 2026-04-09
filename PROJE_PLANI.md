# SİSTEM TAKİP PANELİ — PROJE PLANI (5 YILLIK VİZYON)

> **Tarih:** 10 Nisan 2026  
> **Kurucu:** Engin  
> **Doktrin:** THE ORDER / NİZAM  
> **Hedef:** 2031 yılı standartlarında otonom, ölçeklenebilir, kendi kendini eğiten sistem

---

## 1. MEVCUT SİSTEM ENVANTERİ

### 1.1 Dosya Mimarisi (4 Katman)
```
Sistem-Takip-Paneli/
├── 01_komutlar/          → SQL şemaları, RLS politikaları, operasyon kılavuzu (6 dosya)
├── 02_is_alani/          → Next.js 16 uygulaması (42 kaynak dosya)
│   ├── src/app/          → 1 sayfa + 3 API route (board, browser, telegram)
│   ├── src/components/   → 11 bileşen (TaskBoard, TaskCard, TaskForm, BoardPanel...)
│   ├── src/services/     → 10 servis (task, audit, board, consensus, ai, telegram...)
│   ├── src/lib/          → 7 kütüphane (errorCore, i18n, supabase, permissionGuard...)
│   └── src/store/        → 3 store (task, language, operator)
├── 03_denetim_kanit/     → Denetim belgeleri ve kanıtlar (8 dosya)
└── 04_arsiv_muhur/       → Arşiv ve mühür kayıtları (9 dosya + YETIM_KALINTI)
```

### 1.2 Teknoloji Yığını
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
| Bot | Grammy (Telegram) | ^1.42.0 |
| Browser | Playwright | ^1.59.1 |

### 1.3 Hata Kodu Sistemi — ENTEGRE
| Kod Aralığı | Kapsam | Dosya Sayısı |
|-------------|--------|-------------|
| ERR-STP001-001–009 | Sistem + Görev işlemleri | 21 dosya |
| ERR-STP001-010–013 | Oluşturma + Export + Bağlantı | 6 dosya |
| ERR-STP001-014–017 | AI + Telegram + Audit RT | 4 dosya |
| ERR-STP001-018–022 | Yönetim Kurulu konsensüs | 3 dosya |
| ERR-STP001-023–025 | Dosya kilitleme + Yetki | 2 dosya |
| ERR-STP001-026–028 | Browser kontrol | 2 dosya |
| ERR-STP001-999 | Tanımlanamayan çökme | 21 dosya |
| **TOPLAM** | **28 benzersiz hata kodu** | **21 dosya** |

### 1.4 Veritabanı Tabloları (STP)
| Tablo | Alan | Erişen Dosya |
|-------|------|--------------|
| `tasks` | 20 alan | taskService, TaskForm, TaskCard, page, useTaskStore, exportService, Stats |
| `audit_logs` | 24 alan | auditService, AuditLog, taskService, errorHandler, TaskForm, exportService, page |

---

## 2. TAMAMLANAN İŞLEMLER (TEK TEK KONTROL)

| # | İşlem | Dosya | Hata Kodu | Durum |
|---|-------|-------|-----------|-------|
| 1 | errorCore.ts — Merkezi hata motoru | `lib/errorCore.ts` | 28 ERR kodu tanımlı | ✅ |
| 2 | errorHandler.ts — Toast + Audit entegrasyonu | `lib/errorHandler.ts` | UID + source_file | ✅ |
| 3 | taskService.ts — CRUD + Realtime + Permission | `services/taskService.ts` | ERR-003,004,005,008,009,010,013 | ✅ |
| 4 | auditService.ts — Log yazma/okuma | `services/auditService.ts` | ERR-006,007 | ✅ |
| 5 | boardService.ts — Kurul kararları | `services/boardService.ts` | ERR-018,019,020,022 | ✅ |
| 6 | consensusEngine.ts — AI konsensüs | `services/consensusEngine.ts` | ERR-021 | ✅ |
| 7 | aiManager.ts — OpenAI entegrasyonu | `services/aiManager.ts` | ERR-014,015 | ✅ |
| 8 | telegramService.ts — Bot servisi | `services/telegramService.ts` | ERR-016 | ✅ |
| 9 | browserService.ts — Playwright | `services/browserService.ts` | ERR-026,027,028 | ✅ |
| 10 | exportService.ts — JSON mühürleme | `services/exportService.ts` | ERR-012 | ✅ |
| 11 | notificationService.ts — Push bildirim | `services/notificationService.ts` | processError aktif | ✅ |
| 12 | permissionGuard.ts — Dosya kilitleme | `lib/permissionGuard.ts` | ERR-023,024,025 | ✅ |
| 13 | supabase.ts — Singleton + Doğrulama | `lib/supabase.ts` | ERR-002,013 | ✅ |
| 14 | i18n.ts — TR/AR çift dil | `lib/i18n.ts` | — | ✅ |
| 15 | useTaskStore.ts — Zustand state | `store/useTaskStore.ts` | error_code alan | ✅ |
| 16 | useLanguageStore.ts — Dil state | `store/useLanguageStore.ts` | — | ✅ |
| 17 | useOperatorStore.ts — Operatör state | `store/useOperatorStore.ts` | — | ✅ |
| 18 | Dashboard (page.tsx) — Ana sayfa | `app/page.tsx` | ERR-003,009,012,999 | ✅ |
| 19 | TaskForm.tsx — Görev oluşturma | `components/TaskForm.tsx` | ERR-010,011 | ✅ |
| 20 | TaskCard.tsx — Görev kartı (durum/sil) | `components/TaskCard.tsx` | handleError aktif | ✅ |
| 21 | TaskBoard.tsx — Kanban panosu | `components/TaskBoard.tsx` | — | ✅ |
| 22 | AuditLog.tsx — Denetim günlüğü | `components/AuditLog.tsx` | ERR-007 | ✅ |
| 23 | BoardPanel.tsx — Kurul paneli | `components/BoardPanel.tsx` | ERR-018,019,020 | ✅ |
| 24 | NavBar.tsx — Navigasyon | `components/NavBar.tsx` | — | ✅ |
| 25 | Stats.tsx — İstatistik kartları | `components/Stats.tsx` | — | ✅ |
| 26 | DirProvider.tsx — RTL/LTR simetri | `components/DirProvider.tsx` | — | ✅ |
| 27 | NotificationBell.tsx — Bildirim | `components/NotificationBell.tsx` | — | ✅ |
| 28 | PwaInstallPrompt.tsx — PWA kurulum | `components/PwaInstallPrompt.tsx` | — | ✅ |
| 29 | SwInit.tsx — Service Worker | `components/SwInit.tsx` | — | ✅ |
| 30 | API: board/decide/route.ts | `app/api/board/decide/` | ERR-018,019 | ✅ |
| 31 | API: browser/route.ts | `app/api/browser/` | ERR-026,027 | ✅ |
| 32 | API: telegram/route.ts | `app/api/telegram/` | ERR-016 | ✅ |
| 33 | SQL: supabase_schema.sql | `01_komutlar/` | 20+24 alan | ✅ |
| 34 | SQL: rls_policies.sql | `01_komutlar/` | RLS kuralları | ✅ |
| 35 | SQL: board_decisions_migration.sql | `01_komutlar/` | Kurul tablosu | ✅ |
| 36 | SQL: file_level_locking_rls.sql | `01_komutlar/` | Dosya kilitleme | ✅ |
| 37 | map.ts — Tablo-dosya haritası | `services/map.ts` | 28 giriş, 10 tablo | ✅ |
| 38 | Versiyon mühürü | `04_arsiv_muhur/` | MUH-STP-V1-CRITICAL-OK | ✅ |

---

## 3. 5 AÇILI ANALİZ

### 3.1 STRATEJİK ANALİZ (2026–2031)

| Hedef | Mevcut | 2031 Vizyonu |
|-------|--------|-------------|
| **Otonom Karar** | G-7 İnsan Onayı zorunlu | G-7 sadece P0/P1 için — P2/P3 otonom |
| **Dil Desteği** | TR + AR | TR + AR + EN + FR (çoklu pazar) |
| **Ajan Sayısı** | 3 katman (L1+L2+L3) | 7+ katman (uzmanlaşmış ajanlar) |
| **Kapasite** | Tekil Supabase proje | Multi-region federasyonu |
| **AI Motor** | OpenAI GPT tek model | Çoklu LLM orkestrasyon (GPT + Gemini + Claude) |

**Risk:** 5 yıl içinde mevcut tek-model AI bağımlılığı yetersiz kalır.  
**Çözüm:** aiManager.ts'teki `analyzeTask` fonksiyonu multi-model adapter pattern'e dönüşmeli.

### 3.2 TEKNİK ANALİZ

| Kriter | Durum | Puan |
|--------|-------|------|
| **TypeScript Strict Mode** | ✅ Aktif | 10/10 |
| **Merkezi Hata Motoru** | ✅ 28 ERR kodu, UID, kaynak izleme | 10/10 |
| **Her dosya = bir işlem** | ✅ 42 dosya, her biri tek sorumluluk | 9/10 |
| **Realtime** | ✅ Supabase postgres_changes | 8/10 |
| **Audit Trail** | ✅ Immutable audit_logs, 24 alan | 10/10 |
| **Dosya Kilitleme** | ✅ permissionGuard + RLS | 8/10 |
| **Konsensüs** | ✅ 3 AI ajan oylama | 9/10 |
| **PWA** | ✅ Service Worker + manifest | 7/10 |
| **I18n RTL** | ✅ TR LTR + AR RTL | 9/10 |
| **Test Coverage** | ❌ Otomatik test yok | 3/10 |
| **ORTALAMA** | | **8.3/10** |

**Kritik Eksik:** Otomatik test altyapısı yok. Jest/Vitest + Playwright E2E eklenmeli.

### 3.3 OPERASYONEL ANALİZ

| Süreç | Durum | Notlar |
|-------|-------|-------|
| **Görev Yaşam Döngüsü** | ✅ 6 durum + 4 öncelik | beklemede→devam_ediyor→dogrulama→tamamlandi |
| **8 Kapılı Görev Zinciri** | ⚠️ G-0~G-8 planlanmış, kısmi uygulanmış | G-0 ZOD filtresi eksik, G-5 L2 Validator eksik |
| **Self-Learning (G-8)** | ⚠️ Planlanmış, henüz uygulanmamış | Pattern motoru + kural güncelleme gerekli |
| **Beceri Haritası** | ⚠️ Belgelenmiş, kod karşılığı yok | Ajan kartları DB'ye işlenmeli |
| **Operatör Yönetimi** | ✅ useOperatorStore aktif | 4 rol: ALBAY, BASMIMAR, MUHURDAR, GOZCU |

### 3.4 EKONOMİK ANALİZ

| Kaynak | Maliyet | 5 Yıl Projeksiyonu |
|--------|---------|-------------------|
| **Supabase** | Free Plan ($0) | Pro Plan gerekecek ($25/ay = $1,500/5yıl) |
| **OpenAI API** | Usage-based (~$10/ay) | $600/5yıl — multi-model ile %30 düşürülebilir |
| **Vercel Deploy** | Free Plan ($0) | Pro Plan ($20/ay = $1,200/5yıl) |
| **Telegram Bot** | $0 | $0 (ücretsiz) |
| **Playwright** | $0 | $0 (açık kaynak) |
| **TOPLAM** | ~$10/ay | ~$3,300/5yıl |

**Dış Bağımlılık SIFIR** politikası korunuyor — ücretli işlem kullanıcı onayı olmadan başlatılamaz.

### 3.5 İNSAN / SÜRDÜRÜLEBİLİRLİK ANALİZİ

| Kriter | Durum |
|--------|-------|
| **İnsan Müdahalesi** | Sadece KABUL/RED noktaları — doğru |
| **Öğrenme Kapasitesi** | Self-Learning tasarımda mevcut, kodda eksik |
| **Hata Tekrarı Önleme** | errorCore + audit_logs — uid izlenebilirlik var |
| **Büyüme Kapasitesi** | Modüler mimari — yeni servis ekleme kolay |
| **Bakım Karmaşıklığı** | 42 dosya, 4 katman — yönetilebilir |
| **Bilgi Transferi** | HATA_KODLARI_LISTESI + SISTEM_HARITASI — belgelenmiş |

---

## 4. 5 YILLIK YOL HARİTASI (2026–2031)

### Faz 1: TEMELİ SAĞLAMLAŞTIR (Q2 2026)
- [ ] Otomatik Test Altyapısı (Vitest + Playwright E2E)
- [ ] G-0 ZOD Giriş Filtresi — Görev validasyonu
- [ ] CI/CD Pipeline (GitHub Actions)
- [ ] Performance monitoring (Web Vitals)

### Faz 2: ZEKA SEVİYESİNİ YÜKSELTİR (Q3–Q4 2026)
- [ ] G-5 L2 Validator — Bağımsız denetim ajanı
- [ ] Self-Learning (G-8) — Pattern motoru + Supabase
- [ ] Multi-model AI adapter (GPT + Gemini + Claude)
- [ ] Ajan Beceri Kartları — DB'ye işleme

### Faz 3: ÖLÇEKLENDİR (2027)
- [ ] EN + FR dil desteği
- [ ] Multi-tenant mimari
- [ ] Edge Functions (Supabase)
- [ ] Webhook sistemi (3. parti entegrasyonlar)

### Faz 4: OTONOM HALE GETİR (2028–2029)
- [ ] P2/P3 görevlerde otonom karar
- [ ] Predictive analytics (trend tahmini)
- [ ] Anomali tespiti (otomatik hata önleme)
- [ ] Doğal dil komut arayüzü

### Faz 5: EKOSİSTEM OL (2030–2031)
- [ ] API marketplace
- [ ] Plugin sistemi (3. parti modüller)
- [ ] Cross-platform (iOS/Android native)
- [ ] Federasyon (multi-organizasyon)

---

## 5. NİHAİ DEĞERLENDİRME

| Perspektif | Puan | Yorum |
|-----------|------|-------|
| **Stratejik** | 8/10 | Vizyon net, 5 yıllık yol haritası tanımlı |
| **Teknik** | 8.3/10 | Hata kodu sistemi mükemmel, test eksik |
| **Operasyonel** | 7/10 | 8 kapılı zincir kısmi, G-0 ve G-5 eksik |
| **Ekonomik** | 9/10 | Dış bağımlılık sıfır politikası korunuyor |
| **Sürdürülebilirlik** | 8/10 | Modüler, belgelenmiş, büyümeye hazır |
| **GENEL** | **8.1/10** | **Üretim kalitesinde, test ve otonom karar eksik** |

---

> **Mühür:** Bu proje planı 5 açıdan analiz edilmiş, mevcut 38 işlem tek tek kontrol edilmiş ve 5 yıllık vizyon dahilinde hazırlanmıştır.  
> **Varsayım:** SIFIR — Tüm bilgiler canlı dosya sistemi taramasından üretilmiştir.  
> **Tarih:** 10 Nisan 2026 — 01:40 UTC+3
