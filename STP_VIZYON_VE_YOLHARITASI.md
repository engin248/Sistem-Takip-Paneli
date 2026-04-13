# STP — VİZYON VE YOL HARİTASI (2026–2031)
> **Versiyon:** 2.0 | **Tarih:** 13 Nisan 2026  
> **Kurucu:** Engin | **Doktrin:** THE ORDER / NİZAM  
> **Kaynak:** PROJE_PLANI (bölüm 3-5) + STP_KONSOLIDASYON (konu 10,11,12) konsolidasyonu  
> **Durum:** KONSOLİDE — TEK KAYNAK

---

## 1. STRATEJİK ANALİZ (2026–2031)

### 1.1 Stratejik Hedefler

| # | Hedef | Mevcut Durum | 2031 Vizyonu |
|---|-------|-------------|-------------|
| ST-1 | Otonom Karar | G-7 İnsan Onayı zorunlu | G-7 sadece P0/P1 için — P2/P3 otonom |
| ST-2 | Dil Desteği | TR + AR | TR + AR + EN + FR (çoklu pazar) |
| ST-3 | Ajan Sayısı | 3 katman (L1+L2+L3) | 7+ katman (uzmanlaşmış ajanlar) |
| ST-4 | Kapasite | Tekil Supabase proje | Multi-region federasyonu |
| ST-5 | AI Motor | Ollama + OpenAI tek model | Çoklu LLM orkestrasyon (GPT + Gemini + Claude) |
| ST-6 | Dış Bağımlılık | Sıfır politikası korunuyor | Tam otonom çekirdek |
| ST-7 | Beceri Haritası | Her görev için harita tutulacak | Otomatik kapasite analizi |

### 1.2 Stratejik Riskler

| Risk | Açıklama | Çözüm |
|------|----------|-------|
| Tek-model AI bağımlılığı | 5 yıl içinde tek model yetersiz kalır | `aiManager.ts` → multi-model adapter pattern |
| Supabase Free Plan sınırı | Büyüdükçe Pro Plan gerekecek | Bütçe planlaması (§3 ekonomik model) |
| Tek kullanıcı yönetimi | Organizasyon büyürse yetersiz | Multi-tenant mimari (Faz 3) |

---

## 2. TEKNİK PUAN KARTI (5 AÇILI ANALİZ)

### 2.1 Detaylı Kriter Analizi

| Kriter | Durum | Puan | Detay |
|--------|-------|------|-------|
| **TypeScript Strict Mode** | ✅ Aktif | 10/10 | Tüm dosyalarda strict mode zorunlu |
| **Merkezi Hata Motoru** | ✅ 34 ERR kodu, UID, kaynak izleme | 10/10 | errorCore.ts + errorHandler.ts tam entegre |
| **Her dosya = bir sorumluluk** | ✅ 76 dosya, tek sorumluluk prensibi | 9/10 | Birkaç dosya fazla büyük (aiManager 15KB) |
| **Realtime** | ✅ Supabase postgres_changes | 8/10 | Channels aktif, performans <200ms |
| **Audit Trail** | ✅ Immutable audit_logs, 6 alan | 10/10 | UPDATE/DELETE trigger ile engelli |
| **Dosya Kilitleme** | ✅ permissionGuard + RLS | 8/10 | 3 kritik dosya SHA-256 ile mühürlü |
| **Konsensüs** | ✅ 3 AI ajan oylama | 9/10 | consensusEngine.ts + board_decisions |
| **PWA** | ✅ Service Worker + manifest | 7/10 | Temel destek mevcut |
| **I18n RTL** | ✅ TR LTR + AR RTL | 9/10 | DirProvider + tüm bileşenler RTL hazır |
| **Test Coverage** | ✅ Vitest + Playwright | 7/10 | 36 test case (15 unit + 21 E2E), coverage genişletilebilir |
| **ORTALAMA** | | **8.7/10** | |

### 2.2 Perspektif Bazında Özet

| Perspektif | Puan | Kritik Not |
|-----------|------|------------|
| **Stratejik** | 8/10 | Vizyon net, 5 yıllık yol haritası tanımlı |
| **Teknik** | 8.7/10 | Hata kodu sistemi mükemmel, test altyapısı kurulu |
| **Operasyonel** | 7.5/10 | 8 kapılı zincir çoğunluğu aktif, G-3 planlanmış |
| **Ekonomik** | 9/10 | Dış bağımlılık sıfır politikası korunuyor |
| **Sürdürülebilirlik** | 8/10 | Modüler, belgelenmiş, büyümeye hazır |
| **GENEL** | **8.2/10** | **Üretim kalitesinde, coverage genişletilmeli** |

---

## 3. EKONOMİK MODEL

### 3.1 Mevcut Maliyet Analizi

| Kaynak | Şuan | Plan | 5 Yıl Projeksiyonu |
|--------|------|------|-------------------|
| **Supabase** | $0 (Free Plan) | Pro Plan gerekecek | $1,500 ($25/ay × 60 ay) |
| **OpenAI API** | ~$0 (Ollama birincil) | Usage-based yedek | $600 (~$10/ay) |
| **Vercel** | $0 (Free Plan) | Pro Plan geçiş | $1,200 ($20/ay × 60 ay) |
| **Telegram Bot** | $0 | $0 | $0 (ücretsiz) |
| **Playwright** | $0 | $0 | $0 (açık kaynak) |
| **Ollama (Lokal)** | $0 | $0 | $0 (lokal çalışır) |
| **TOPLAM** | ~$0/ay | ~$55/ay (Pro'ya geçişte) | ~$3,300/5yıl |

### 3.2 Dış Bağımlılık Sıfır Politikası

| Kategori | Kural |
|----------|-------|
| Harici API | Ücretsiz kota aşılmadan ücretli API'ye geçilemez |
| Dış Servis | İçeride çözüm varsa dışarıya gidilmez |
| Yeni Araç | Mevcut araçla çözülemeyen → önce ücretsiz alternatif |
| Maliyet Uyarısı | Ücretli işlem başlatılmadan Kullanıcıya NET uyarı |
| Onay Olmadan | Ücret doğuran hiçbir işlem başlatılamaz |

---

## 4. 5 YILLIK YOL HARİTASI (2026–2031)

### Faz 1: TEMELİ SAĞLAMLAŞTIR (Q2 2026 — Mevcut)

| # | İşlem | Durum | Detay |
|---|-------|-------|-------|
| 1 | Otomatik Test Altyapısı | ✅ Tamamlandı | Vitest (15 unit) + Playwright E2E (21 test) |
| 2 | G-0 ZOD Giriş Filtresi | ✅ Tamamlandı | validation.ts — 7 ZOD şeması |
| 3 | CI/CD Pipeline (GitHub Actions) | ⬜ Bekliyor | github/workflows/ henüz yok |
| 4 | Performance monitoring (Web Vitals) | ⬜ Bekliyor | — |
| 5 | L2 Validator | ✅ Tamamlandı | l2Validator.ts aktif |

### Faz 2: ZEKA SEVİYESİNİ YÜKSELT (Q3–Q4 2026)

| # | İşlem | Durum | Detay |
|---|-------|-------|-------|
| 1 | Self-Learning (G-8) — Pattern motoru | ⚠️ Kısmi | selfLearningEngine.ts var, tam aktif değil |
| 2 | Multi-model AI adapter (GPT + Gemini + Claude) | ⬜ Bekliyor | aiManager.ts multi-model'e dönüşmeli |
| 3 | Ajan Beceri Kartları — DB'ye işleme | ⬜ Bekliyor | JSON kartlar tanımlı, DB tablosu yok |
| 4 | Kapasite analiz otomasyonu (G-3) | ⬜ Bekliyor | Planlanmış |

### Faz 3: ÖLÇEKLE (2027)

| # | İşlem | Detay |
|---|-------|-------|
| 1 | EN + FR dil desteği | i18n.ts genişletme |
| 2 | Multi-tenant mimari | Organizasyon bazlı veri izolasyonu |
| 3 | Edge Functions (Supabase) | Serverless fonksiyonlar |
| 4 | Webhook sistemi | 3. parti entegrasyonlar |

### Faz 4: OTONOM HALE GETİR (2028–2029)

| # | İşlem | Detay |
|---|-------|-------|
| 1 | P2/P3 görevlerde otonom karar | G-7'yi sadece P0/P1'e sıkıştır |
| 2 | Predictive analytics (trend tahmini) | Geçmiş veriden gelecek tahmini |
| 3 | Anomali tespiti (otomatik hata önleme) | Self-learning pattern motoru ile |
| 4 | Doğal dil komut arayüzü | Chat tabanlı görev oluşturma |

### Faz 5: EKOSİSTEM OL (2030–2031)

| # | İşlem | Detay |
|---|-------|-------|
| 1 | API marketplace | Dış geliştiricilere açık API |
| 2 | Plugin sistemi | 3. parti modüller |
| 3 | Cross-platform (iOS/Android native) | React Native veya Flutter |
| 4 | Federasyon (multi-organizasyon) | Çoklu organizasyon desteği |

---

## 5. OPERASYONEL DURUM ANALİZİ

### 5.1 Görev Yaşam Döngüsü

| Parametre | Mevcut Durum |
|-----------|-------------|
| Durum Sayısı | 6: beklemede, devam_ediyor, dogrulama, tamamlandi, reddedildi, iptal |
| Öncelik Sayısı | 4: dusuk, normal, yuksek, kritik |
| İş Planı | Manuel (kullanıcı onayı ile) |
| Kanban | ✅ Aktif, sürükle-bırak |

### 5.2 8 Kapılı Zincir Durumu

| Kapı | Durum | Dosya |
|------|-------|-------|
| G-0 ZOD Filtre | ✅ Aktif | validation.ts |
| G-1 Anlama | ✅ Aktif | aiManager.ts |
| G-2 İş Planı | ✅ Manuel | — |
| G-3 Kapasite | ⚠️ Planlanmış | — |
| G-4 L1 Yapıcı | ✅ Aktif | — |
| G-5 L2 Validator | ✅ Aktif | l2Validator.ts |
| G-6 Kanıt | ✅ Aktif | audit_logs |
| G-7 İnsan Onay | ✅ Aktif | TaskCard.tsx |
| G-8 Self-Learning | ⚠️ Kısmi | selfLearningEngine.ts |

### 5.3 İnsan/Sürdürülebilirlik

| Kriter | Durum |
|--------|-------|
| İnsan Müdahalesi | Sadece KABUL/RED noktaları — doğru |
| Öğrenme Kapasitesi | Self-Learning dosyada mevcut, tam aktif değil |
| Hata Tekrarı Önleme | errorCore + audit_logs — UID izlenebilirlik var |
| Büyüme Kapasitesi | Modüler mimari — yeni servis ekleme kolay |
| Bakım Karmaşıklığı | 76 dosya, 4 katman — yönetilebilir |
| Bilgi Transferi | Konsolide dokümantasyon tamamlandı |

---

## 6. BEKLEYEN İŞLEMLER (AKSİYON LİSTESİ)

| # | İşlem | Öncelik | Faz |
|---|-------|---------|-----|
| 1 | CI/CD Pipeline (GitHub Actions) kurulumu | P2 | Faz 1 |
| 2 | Web Vitals performans izleme | P3 | Faz 1 |
| 3 | Self-Learning motorunu tam aktif hale getir | P2 | Faz 2 |
| 4 | Multi-model AI adapter | P2 | Faz 2 |
| 5 | Ajan beceri kartlarını DB tablosuna işle | P2 | Faz 2 |
| 6 | G-3 Kapasite kapısını otomatize et | P3 | Faz 2 |
| 7 | STP'ye özel Telegram bot oluştur | P2 | Faz 1 |
| 8 | Test coverage'ı genişlet | P2 | Faz 1 |

---

> **Mühür:** VIZYON-YOLHARITASI-KONSOLİDE-V2.0-STP  
> **Tarih:** 13 Nisan 2026
