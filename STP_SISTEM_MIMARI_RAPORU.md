# STP — SİSTEM TAKİP PANELİ TAM MİMARİ RAPORU

> **Versiyon:** 2.2 | **Tarih:** 17.04.2026 | **Kurucu:** Engin
> **Repo:** github.com/engin248/Sistem-Takip-Paneli
> **Son Commit:** 0356002 | **Kaynak:** Canlı dosya sistemi taraması

---

# BİRİNCİ KISIM: SİSTEM NEDİR

STP, 50 otonom ajanlı askeri-endüstriyel komuta paneli. Sıfır dış maliyet (No-OpenAI) politikasıyla çalışıyor. 9 katmanlı doğrulama pipeline'ı (K0-K9) var. Tam denetlenebilir bir otonom görev yönetim sistemi.

## Teknoloji Stack'i

| Katman | Teknoloji | Versiyon |
|--------|-----------|----------|
| Framework | Next.js (App Router) | 16.2.3 |
| UI | React | 19.2.4 |
| Styling | TailwindCSS + Vanilla CSS | 4.x |
| State | Zustand | 5.0.12 |
| Veritabanı | Supabase (PostgreSQL) | 2.102.1 |
| AI (Yerel) | Ollama | Lokal |
| Validasyon | Zod | 4.3.6 |
| Bot | grammY | 1.42.0 |
| WhatsApp | whatsapp-web.js | 1.34.6 |
| Test | Vitest + Playwright | 4.1.4 / 1.59.1 |
| Lint | ESLint + Husky | 9.x |
| TypeScript | TypeScript | 5.9.3 |
| Bildirim | Sonner | 2.0.7 |

## Dosya Yapısı

```
Sistem-Takip-Paneli/
├── .env.local                    # Ortam değişkenleri (Supabase, Telegram)
├── .husky/                       # Git pre-commit hooks
├── enforcer.js                   # Sistem kural denetçisi (36KB)
├── SISTEM_KURALLARI.md           # THE ORDER / NİZAM kuralları
├── STP_MIMARI_VE_PROTOKOL.md     # Mimari referans
├── STP_TEKNIK_REFERANS.md        # Teknik belge
├── STP_VIZYON_VE_YOLHARITASI.md  # Yol haritası
│
├── 01_komutlar/                  # Komut arşivi
├── 02_is_alani/                  # ★ ANA UYGULAMA
│   ├── package.json              # Next.js 16.2.3
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── page.tsx          # 16 Ekranlı Dashboard
│   │   │   ├── layout.tsx        # Root layout
│   │   │   ├── globals.css       # Askeri tema CSS
│   │   │   └── api/              # 28 API ROUTE
│   │   ├── components/           # 27 React bileşeni
│   │   ├── core/                 # K0-K9 PIPELINE (26 dosya)
│   │   ├── services/             # İş mantığı servisleri (28 dosya)
│   │   ├── lib/                  # Yardımcı kütüphaneler (18 dosya)
│   │   ├── store/                # Zustand state (5 dosya)
│   │   ├── bot/                  # Telegram handler
│   │   └── proxy.ts              # Rate-limiting + güvenlik
│   └── public/                   # Statik dosyalar
│
├── 03_denetim_kanit/             # Denetim kanıtları arşivi
└── 04_arsiv_muhur/               # Mühürlenmiş arşiv
```

---

# İKİNCİ KISIM: KOMUT GELDİĞİNDE NE OLUYOR (ADIM ADIM)

Kullanıcı bir komut girer (Panel veya Telegram).

## ADIM 1 — proxy.ts (Kapı Nöbetçisi)
- Gelen her HTTP isteğini yakalar.
- Dakikada 300'den fazla istek gelirse → 429 hata kodu döner, istek reddedilir.
- İstek sınırın altındaysa → isteği API katmanına iletir.

## ADIM 2 — permissionGuard.ts (Yetki Kontrolü)
- İsteğin arkasındaki operatörü kontrol eder.
- Rol bilgisi (admin/viewer) Supabase'deki user tablosundan alınır.
- Yetkisiz → 403 dönülür.
- Yetkili → devam.

## ADIM 3 — validation.ts (Girdi Doğrulama)
- İsteğin body'sini Zod şemasıyla doğrular.
- Eksik alan, yanlış tip, çok kısa metin → 400 hata kodu.
- Geçerli → devam.

## ADIM 4 — K1 Gatekeeper (control_engine.ts — 264 satır)
Bu fonksiyon 9 alt adım çalıştırır:

1. **Zod context doğrulama** — userId, channel, nonce alanlarını kontrol eder.
2. **Rate limit** — Bu kullanıcı son 1 dakikada 10'dan fazla komut gönderdi mi? Gönderdiyse → ERR-STP008: Rate limit aşıldı.
3. **Hata blokajı** — Bu kullanıcı 3 ardışık hata yaptı mı? Yaptıysa → 5 dakika boyunca bloklanır. ERR-STP010.
4. **Null/boş/kısa kontrol** — Komut metni 3 karakterden kısa mı? → ERR-STP001.
5. **Sanitization** — `<script>` tagları, tek tırnak, çift tırnak, noktalı virgül temizlenir.
6. **Yetki kontrolü** — context.isAuthorized false ise → ERR-STP002.
7. **Replay koruması** — Bu nonce daha önce kullanıldı mı? Supabase commands tablosunda aranır. Bulunduysa → ERR-STP006: Replay tespit.
8. **Concurrent lock** — Bu kullanıcının zaten devam eden bir işlemi var mı? Varsa → ERR-STP009: Aktif işlem var.
9. **SHA-256 hash üretimi** — DB kayıt — immutable_log yazma — local disk audit yazma.

Çıktı: commandId + hash + timestamp

## ADIM 5 — K2.1 HermAI Analiz (hermAI/analysisEngine.ts — 144 satır)
- Komutu alır.
- Ollama AI'a (veya local kurallara) gönderir.
- AI'dan şu JSON alanlarını ister:
  - reasoning: Neden/nasıl analizi (5 eksen: stratejik, teknik, operasyonel, ekonomik, sürdürülebilirlik)
  - methodology: Adım adım teknik yöntem
  - alternatives: En az 2 alternatif çözüm
  - risks: Risk analizi
  - refutation: Bu karar neden yanlış olabilir?
  - constraints: Mantıksal kısıtlamalar
  - confidence: 0-1 arası güven skoru
  - questions: En az 3 eleştirel soru
- Entropy hesaplar (Shannon bilgi entropisi).
- Sonucu hermai_outputs tablosuna yazar.
- AI timeout olursa (10 saniye) → fallback moduna düşer: confidence=0.3, entropy=0.9.

## ADIM 6 — K2.3 Kriter Motoru (hermAI/criteriaEngine.ts — 17.4KB)
- 92 kriter üzerinden puanlar.
- Kategoriler: güvenlik, tutarlılık, performans, uyumluluk, sürdürülebilirlik.
- Her kriter 0-100 arası puan verir.
- Ağırlıklı toplam hesaplanır.
- Skor >= 75 → GEÇER, devam eder.
- Skor < 75 → REJECTED. Pipeline durur. commands tablosunda status = "failed".

## ADIM 7 — K3 Formal Spec (formalSpec.ts — 102 satır)
- HermAI analizinden ön koşullar (pre-conditions) çıkarır:
  - input_length >= 3
  - input_length <= 4096
  - confidence >= 0.15
  - Analizdeki tüm constraints eklenir.
- Son koşullar (post-conditions) çıkarır:
  - Methodology'deki adımlar tek tek step_X_completed olarak eklenir.
- Değişmezler (invariants) çıkarır:
  - system_integrity: preserved
  - data_consistency: maintained
  - no_unauthorized_access: true
  - Risk yüksekse → high_risk_guard: active
  - Güven düşükse → low_confidence_guard: active
- Z3/SMT-LIB formatında matematiksel spec üretir.
- formal_specs tablosuna yazar.

## ADIM 8 — K5.1 Proof Solve (proof/proofEngine.ts — 143 satır)
- Kısıtlamaları (constraints) alır.
- Önce cache'e bakar (proof_cache tablosu). Varsa cache'ten döner.
- Cache yoksa → Zod tabanlı SAT solver çalıştırır (Z3 olmadığı için degraded mod).
- Her constraint'i kontrol eder: UNSAT, false, contradiction içeriyorsa → ERR-STP037: UNSAT.
- SHA-256 hash üretir.
- Sonucu proofs tablosuna, cache'e ve varsa fmea_records tablosuna yazar.
- Çıktı: status=SAT, proofHash=STP_V1_xxx, solved=true.

## ADIM 9 — K5.2 Proof Verify (proof/verifier.ts — 102 satır)
- Çift doğrulayıcı sistemi:
  - V1 Kural Motoru: logicHash var mı, preCondition var mı, postCondition var mı, input >= 3 karakter mi, preCondition != postCondition mu kontrol eder.
  - V2 AI Doğrulama: Ollama'ya "Bu ön koşul ve son koşul arasında mantıksal tutarlılık var mı? TRUE veya FALSE" diye sorar.
- Her iki doğrulayıcı da TRUE dönmeden → REJECTED.
- AI erişilemezse → V1 kural motoruna güvenir.

## ADIM 10 — K4 Red Team (redTeam.ts — 126 satır)
12 saldırı testi uygular:

| ID | Test | Ne Kontrol Eder |
|----|------|----------------|
| RT-001 | Çelişki testi | reasoning ve refutation birbirini yalanlıyor mu |
| RT-002 | Döngüsel mantık | methodology ve reasoning aynı metin mi |
| RT-003 | Aşırı güven | confidence > 0.95 ama alternatif < 2 mi |
| RT-004 | Girdi manipülasyonu | < > { } vb. şüpheli karakterler var mı |
| RT-005 | Prompt injection | ignore, forget, override, system kelimeleri var mı |
| RT-006 | Sınır değer | confidence=0 veya 1 mi, entropy < 0 mu |
| RT-007 | Boş alternatif | Alternatiflerden herhangi biri 5 karakterden kısa mı |
| RT-008 | Büyük payload | Toplam boyut 20KB'ı aşıyor mu |
| RT-009 | Zaman tutarlılığı | Kriter sonucu 30 saniyeden eski mi |
| RT-010 | Kriter-analiz uyumu | Yüksek güven ama düşük kriter skoru mu |
| RT-011 | Entropy-confidence | Yüksek güven + yüksek entropy çelişkisi |
| RT-012 | Risk-alternatif oranı | Yüksek risk ama 2'den az alternatif mi |

- Monte Carlo skoru = geçen test sayısı / 12 × 100
- Skor >= 70% → SURVIVED.
- Skor < 70% → BAŞARISIZ.
- Sonuç refutations tablosuna yazılır.

## ADIM 11 — K6 Konsensüs (consensus.ts — 147 satır)
3 yargıç oy kullanır:

| Yargıç | Approve Koşulu | Weight | Veto Koşulu |
|--------|---------------|--------|-------------|
| Kriter | Skor >= 85 → w:2, >= 75 → w:1 | 2 | Skor < 50 → reject w:3 (VETO) |
| Proof | SAT + verified → w:3 | 3 | Proof başarısız → reject w:3 (VETO) |
| RedTeam | Monte Carlo >= 80% → w:2 | 2 | Monte Carlo < 50% → reject w:2 |

Karar mekanizması:
- Herhangi bir yargıç weight >= 3 ile RED → VETO → HALT (pipeline durur)
- 2/3 APPROVE → PROCEED (devam)
- 2/3 REJECT → HALT
- Kararsız → ESCALATE (insan müdahalesi istenir)

## ADIM 12 — K7 Gate Check (gateCheck.ts — 101 satır)
9 kapı kontrol edilir:

| Kapı | Kontrol | Geçme Koşulu |
|------|---------|-------------|
| G1 | Girdi temiz mi | L0 Gatekeeper geçti |
| G2 | Analiz kaliteli mi | reasoning >= 20 karakter + en az 1 alternatif |
| G3 | Kriter eşiği | score >= 75 ve passed=true |
| G4 | Formal spec tutarlı mı | preConditions > 0 ve invariants > 0 |
| G5 | Proof geçerli mi | status=SAT ve solved=true |
| G6 | Red Team sağkalım | survived=true |
| G7 | Konsensüs onay mı | decision=PROCEED |
| G8 | Kaynak limiti | Aşılmadı |
| G9 | İnsan onayı | STRICT modda false, NORMAL/SAFE modda true |

Tek kapı bile FAIL → REJECTED. Pipeline durur.

## ADIM 13 — K8 Execution (executionEngine.ts — 99 satır)
1. commands tablosundan mevcut durumun snapshot'ını alır.
2. Snapshot'ı snapshots tablosuna yazar.
3. handler() fonksiyonunu çalıştırır (bu, görevin gerçek iş mantığıdır).
4. Başarılıysa: executions tablosuna status=success yazar.
5. Hata olursa: Snapshot'tan geri yükleme (ROLLBACK) yapar. immutable_logs'a hata kaydı yazar.

## ADIM 14 — K9 Post-Execution (postExec.ts — 154 satır)
1. Invariant kontrolü: execution başarılı mı?
2. Merkle hash zinciri güncellenir: önceki proof_hash + yeni proof_hash + commandId → SHA-256 → yeni merkle_root. proof_chain tablosuna yazılır.
3. Health status belirlenir: healthy / degraded / down. health_status tablosuna yazılır.
4. Traceability: K8→K9 bağlantısı traceability tablosuna yazılır.
5. Performance metric: toplam süre performance_metrics tablosuna yazılır.
6. Yerel diske rapor yazılır (localAuditWriter).
7. Başarısız → problem_reports tablosuna kayıt eklenir.
8. immutable_logs'a son kayıt yazılır.

## ADIM 15 — Sonuç
- Pipeline status: APPROVED / REJECTED / ESCALATED / ERROR
- Kullanıcıya panel'de toast bildirimi gösterilir.
- Telegram'a bildirim gider.
- commands tablosunda status: completed veya failed.

---

# ÜÇÜNCÜ KISIM: AJAN GÖREVLENDİRME SİSTEMİ

## Orchestrator (orchestrator.ts — 204 satır)
Görev geldiğinde anahtar kelime eşleştirmesi yapar:

| Anahtar Kelimeler | Atanan Ajan | Yedek Ajan |
|-------------------|-------------|------------|
| karar, onayla, reddet, strateji, komut, acil, kriz | K-1 KOMUTAN | K-2 |
| plan, sprint, öncelik, yol haritası, kaynak, dağıt | K-2 KURMAY | K-1 |
| araştır, trend, analiz, pazar, rakip, istihbarat | K-3 İSTİHBARAT | D-03 |
| güvenlik, izole, yetki, rls, şifre, saldırı | K-4 MUHAFIZ | A-06 |
| frontend, react, bileşen, arayüz, ui, css, panel, buton | A-01 İCRACI-FE | — |
| backend, api, endpoint, route, servis, http | A-02 İCRACI-BE | — |
| veritabanı, supabase, sql, tablo, migration | A-03 İCRACI-DB | — |
| telegram, bot, bildirim, webhook, mesaj, whatsapp | A-04 İCRACI-BOT | D-08 |
| test, vitest, playwright, unit, e2e, coverage | A-05 İCRACI-TEST | — |
| penetrasyon, owasp, token, jwt, kriptografi | A-06 İCRACI-SEC | K-4 |
| ollama, llm, prompt, embedding, rag, yapay zeka | A-07 İCRACI-AI | — |
| veri analiz, etl, grafik, istatistik, rapor | A-08 İCRACI-DATA | D-09 |
| deploy, vercel, docker, ci/cd, environment | A-09 İCRACI-INFRA | D-02 |
| otomasyon, pipeline, cron, event, tetikleyici | A-10 İCRACI-AKIŞ | — |
| denetle, kod incele, review, standart | B-01 DENETÇİ-KOD | — |
| doğrula, kalite kontrol, validasyon | B-02 DENETÇİ-DOĞRULA | — |
| performans ölç, latency, yavaş, benchmark | B-04 DENETÇİ-PERF | — |
| log, sha, mühür, arşivle, audit | D-01 MÜHÜRDAR | — |
| dokümantasyon, readme, wiki, changelog | D-06 DÖKÜMANTER | — |
| izle, monitor, alarm, uyarı, anomali | D-05 NÖBETÇİ | — |

Hiçbir anahtar kelime eşleşmezse → K-1 KOMUTAN'a atanır.

## agentWorker.ts (673 satır) — ReAct Döngüsü
Ajan görevi aldığında:

1. **Ön kontrol**: Görev içeriği kurallarla uyumlu mu? (ruleGuard.ts)
2. **Idempotency**: Aynı ajan+görev 30 saniye içinde tekrar çalışmaz (cache kontrolü).
3. **RAG sorgulama**: Bilgi tabanında ilgili döküman aranır.
4. **Bellek sorgulama**: Ajanın geçmiş görevleri ve öğrendikleri okunur.
5. **ReAct döngüsü** (max 5 iterasyon):
   - Ajan "düşünür" (AI çağrısı veya kural tabanlı mantık)
   - Araç gerekiyorsa `ARAÇ: <ad> PARAMS: <json>` formatında yazar
   - Sistem aracı çalıştırır (dosyaOku, dosyaYaz, dizinListele, webAra, ragSorgula, apiCagir)
   - Sonuç ajana döner
   - Ajan tekrar düşünür
   - "GÖREVTAMAM" yazdığında döngü biter
6. **Çıktı kontrolü**: yanıtKontrol (ruleGuard.ts) ile çıktı doğrulanır.
7. **Öğrenim kaydı**: Ajan bellekte görev sonucunu saklar.
8. **Audit log**: Denetim kaydı oluşturulur.

## AI Çağrı Sırası (aiProvider.ts)
Her ajan çağrısında:
1. Ajanın profili okunur → ai_provider alanına bakılır.
2. forceDisableOpenAI = true → OpenAI her durumda kapalı.
3. Provider "ollama" ise → Ollama'ya HTTP isteği gider (localhost:11434/api/chat).
4. Provider "local" ise → Ollama çağrılmaz, kural tabanlı yanıt üretilir (0₺).
5. Provider "auto" ise → Önce Ollama denenir, başarısız olursa local'e düşer.
6. Hata olursa → exponential backoff retry (1s, 3s, max 2 deneme).

---

# DÖRDÜNCÜ KISIM: TAM AJAN LİSTESİ (50 AJAN)

## KOMUTA — 4 Ajan

| ID | Kod Adı | Rol | AI | Mod | İzinli Araçlar | Çıktı Formatı |
|----|---------|-----|-----|-----|---------------|---------------|
| K-1 | KOMUTAN | Görevi analiz et, uygun katmana yönlendir | ollama | ai | ragSorgula, apiCagir | DURUM → HEDEF_AJAN → GEREKÇE → ÖNCELİK |
| K-2 | KURMAY | Karmaşık görevleri alt-görevlere böl | ollama | ai | ragSorgula | PLAN_ID → ADIMLAR → BAĞIMLILIK → RİSK |
| K-3 | İSTİHBARAT | Sistem durumunu izle, tehdit tespiti | auto | hibrit | ragSorgula, apiCagir, dosyaOku | SİSTEM_DURUMU → BULGULAR → TEHDİTLER → ÖNERİ |
| K-4 | MUHAFIZ | Güvenlik denetimi, erişim kontrolü | local | kural | ragSorgula, apiCagir, dosyaOku | GÜVENLİK_SEVİYESİ → İHLALLER → DOĞRULAMALAR → EYLEM |

## L1 İCRAATÇILAR — 10 Ajan

| ID | Kod Adı | Rol | AI | Mod | İzinli Araçlar |
|----|---------|-----|-----|-----|---------------|
| A-01 | İCRACI-FE | React/Next.js/TypeScript bileşenleri yaz | ollama | ai | dosyaOku, dosyaYaz, dizinListele, ragSorgula |
| A-02 | İCRACI-BE | Next.js API route ve servisler yaz | ollama | ai | dosyaOku, dosyaYaz, dizinListele, ragSorgula |
| A-03 | İCRACI-DB | Supabase sorguları, migration, RLS | auto | hibrit | dosyaOku, dosyaYaz, ragSorgula, apiCagir |
| A-04 | İCRACI-BOT | Telegram bot komutları, webhook | auto | hibrit | dosyaOku, dosyaYaz, apiCagir, ragSorgula |
| A-05 | İCRACI-TEST | Vitest/Jest test yaz | local | kural | dosyaOku, dosyaYaz, dizinListele, ragSorgula |
| A-06 | İCRACI-SEC | Güvenlik açığı tarat, RLS yaz | local | kural | dosyaOku, dosyaYaz, ragSorgula |
| A-07 | İCRACI-AI | Ollama, prompt mühendisliği, AI entegrasyon | ollama | ai | dosyaOku, dosyaYaz, apiCagir, ragSorgula |
| A-08 | İCRACI-DATA | Veri dönüşümü, analiz, raporlama | auto | hibrit | dosyaOku, dosyaYaz, apiCagir, ragSorgula |
| A-09 | İCRACI-INFRA | Next.js config, env, deployment | local | kural | dosyaOku, dosyaYaz, dizinListele, ragSorgula |
| A-10 | İCRACI-AKIŞ | Süreç otomasyonu, pipeline, cron | local | kural | dosyaOku, dosyaYaz, apiCagir, ragSorgula |

## L2 DENETÇİLER — 6 Ajan

| ID | Kod Adı | Rol | AI | Mod | İzinli Araçlar |
|----|---------|-----|-----|-----|---------------|
| B-01 | DENETÇİ-KOD | L1 tarafından yazılan kodu 5 eksenden denetle | ollama | ai | dosyaOku, ragSorgula |
| B-02 | DENETÇİ-DOĞRULA | Fonksiyonel doğrulama — çalışıyor mu | auto | hibrit | dosyaOku, apiCagir, ragSorgula |
| B-03 | DENETÇİ-GÜVENLİK | OWASP Top 10, injection, XSS, auth bypass | local | kural | dosyaOku, ragSorgula |
| B-04 | DENETÇİ-PERF | Response time, bundle size, DB sorgu sayısı | local | kural | dosyaOku, apiCagir, ragSorgula |
| B-05 | DENETÇİ-VERİ | Null değerler, tip tutarlılığı, duplicate kayıt | local | kural | dosyaOku, apiCagir, ragSorgula |
| B-06 | DENETÇİ-UX | Erişilebilirlik, mobil uyum, hata mesajları | auto | hibrit | dosyaOku, ragSorgula |

## L3 HAKEMLER — 2 Ajan

| ID | Kod Adı | Rol | AI | Mod |
|----|---------|-----|-----|-----|
| C-01 | BAŞ-HAKEM | L1-L2 çelişkilerini çöz, nihai karar ver | ollama | ai |
| C-02 | TEMYİZ-HAKEM | Mimari kararlar için son söz hakkı | ollama | ai |

## DESTEK — 28 Ajan

| ID | Kod Adı | Rol | AI | Mod |
|----|---------|-----|-----|-----|
| D-01 | MÜHÜRDAR | SHA-256 audit zinciri, imzalama, doğrulama | local | kural |
| D-02 | OTOMASYON | Tekrarlayan görevleri otomasyona bağla | local | kural |
| D-09 | ANALİST | İş verisi analizi, trend, KPI | ollama | ai |
| D-10 | PLANLAYICI | Proje planı, timeline, önceliklendirme | auto | hibrit |
| D-03..D-08, D-11..D-28 | Çeşitli Uzmanlar | agentRegistry.ts'de tanımlı | karma | karma |

---

# BEŞİNCİ KISIM: 28 API ENDPOINT

| # | Endpoint | Boyut | Ne İş Yapıyor |
|---|----------|-------|---------------|
| 1 | GET /api/health | 197B | Sunucunun ayakta olup olmadığını kontrol eder |
| 2 | GET /api/health-check | 6.5KB | Supabase bağlantısı, tablo durumları, Ollama health, detaylı sağlık raporu |
| 3 | GET /api/agents | 1.1KB | 50 ajan listesini ve istatistiklerini döner |
| 4 | POST /api/agents/[id]/task | 3.5KB | Belirli bir ajana görev atar, agentWorker'ı çalıştırır |
| 5 | GET/POST /api/agent-memory | 2.2KB | Ajan belleğini okur veya yazar |
| 6 | GET/POST/PATCH/DELETE /api/tasks | 915B | Görev CRUD (oluştur, oku, güncelle, sil) |
| 7 | GET /api/queue | 1.0KB | Ajan aktivite kuyruğunu listeler |
| 8 | GET /api/jobs | 426B | Çalışan/tamamlanan iş listesini döner |
| 9 | POST /api/pipeline | 2.4KB | K0-K9 pipeline'ı tam çalıştırır |
| 10 | POST /api/orchestrate | 1.4KB | Görevi analiz edip uygun ajana atar |
| 11 | POST /api/ollama | 7.6KB | Ollama AI'a doğrudan chat/completion isteği gönderir |
| 12 | POST /api/rag | 1.3KB | Bilgi tabanından arama yapar (RAG) |
| 13 | POST /api/tools | 2.1KB | dosyaOku, dosyaYaz, dizinListele, webAra, apiCagir araçlarını çalıştırır |
| 14 | POST /api/decompose | 2.4KB | Karmaşık görevi alt-görevlere parçalar |
| 15 | POST /api/validate | 1.1KB | Girdi doğrulama (Zod şema kontrolü) |
| 16 | POST /api/telegram | 4.3KB | Telegram webhook handler, gelen mesajları işler |
| 17 | POST /api/bridge | 1.1KB | Çoklu platform mesaj köprüsü (Telegram ve Panel) |
| 18 | POST /api/notify | 2.4KB | Bildirim gönderir (Telegram, Panel) |
| 19 | POST /api/browser | 5.7KB | Browserless ile tarayıcı otomasyon (screenshot, navigate) |
| 20 | GET /api/rules | 1.2KB | NİZAMNAME kurallarını döner |
| 21 | POST /api/board/decide | 3.1KB | Yönetim kurulu kararı oluşturur/oylar |
| 22 | GET/POST /api/alarms | 1.1KB | Alarm oluştur veya listele |
| 23 | GET /api/alerts | 2.0KB | Kritik uyarıları listeler |
| 24 | GET /api/logs | 1.5KB | Sistem loglarını döner |
| 25 | GET /api/audit-chain | 906B | SHA-256 denetim zincirini döner |
| 26 | GET/POST /api/circuit-breaker | 878B | Devre kesici durumunu sorgula veya ayarla |
| 27 | POST /api/learn | 1.8KB | G-8 öğrenme motorunu tetikler |
| 28 | POST /api/bootstrap | 735B | Sistem başlatma (K0) çalıştırır |

---

# ALTINCI KISIM: 16 EKRAN

| # | Ekran | Bileşen | Boyut | Ne Gösteriyor |
|---|-------|---------|-------|---------------|
| 1 | SİSTEM SAĞLIK | HealthDashboard.tsx | 7.4KB | Supabase bağlantısı, API durumu, tablo sayıları, son kontrol zamanı |
| 2 | OPS İSTATİSTİK | Stats.tsx | 4.4KB | Toplam görev, beklemede, devam eden, tamamlanan sayıları |
| 3 | GÖREV PANOSU | TaskBoard.tsx | 22.1KB | Kanban tahtası (YAPILACAK → YAPILIYOR → DENETİMDE → MÜHÜRLENDİ), görev arama, filtre |
| 4 | YÖNETİM KURULU | BoardPanel.tsx | 17.0KB | Konsensüs kararları, oylamalar, quorum durumu |
| 5 | L2 DENETİM | L2Panel.tsx | 6.0KB | Denetçi ajanların verdikleri ONAY/RED sonuçları |
| 6 | G-8 ÖĞRENME | SelfLearningPanel.tsx | 7.3KB | Pattern öğrenme geçmişi, öğrenilen kurallar |
| 7 | ALARM MERKEZİ | AlarmPanel.tsx | 6.1KB | Kritik, yüksek, orta, düşük alarmlar listesi |
| 8 | TELEGRAM KÖPRÜSÜ | TelegramSender.tsx | 5.1KB | Telegram'a doğrudan mesaj gönderme formu |
| 9 | DENETİM GÜNLÜĞÜ | AuditLog.tsx | 5.1KB | SHA-256 immutable_logs zinciri, modül, olay tipi, zaman |
| 10 | AJAN KADROSU | AgentPanel.tsx | 24.0KB | 50 ajanın listesi, durumları, görev sayıları, OTO GÖREV butonu |
| 11 | BİLGİ TABANI | KnowledgeBasePanel.tsx | 8.2KB | 15 kategori RAG bilgi tabanı arama |
| 12 | AKTİVİTE AKIŞI | ActivityFeed.tsx | 8.8KB | Son ajan aktiviteleri, canlı akış |
| 13 | CANLI METRİKLER | LiveMetrics.tsx | 7.7KB | Radial gauge ile CPU, bellek, istek/saniye metrikleri |
| 14 | SİSTEM KALKAN | ShieldPanel.tsx | 8.6KB | Circuit breaker durumu, audit zinciri bütünlüğü |
| 15 | NİZAMNAME | NizamnamePaneli.tsx | 9.0KB | 35 kural listesi, arama, kategori filtresi |
| 16 | JOB MONITOR | JobMonitorPanel.tsx | 11.7KB | Çalışan/bekleyen/tamamlanan işlerin listesi ve süresi |

---

# YEDİNCİ KISIM: CORE ENGINE — 26 DOSYA

| Dosya | Boyut | Ne İş Yapıyor |
|-------|-------|---------------|
| agentWorker.ts | 30.1KB | ReAct döngüsü (plan→act→observe), AI çağrı, provider-aware icra motoru |
| agentProfiles.ts | 24.8KB | 50 ajan profili — her ajana özel prompt, araç seti, AI provider ataması |
| agentRules.ts | 21.5KB | 35+ ajan kuralı — ne yapabilir ne yapamaz |
| pipeline.ts | 10.2KB | K0-K9 tam zincir orkestratörü — tüm katmanları sırayla çalıştırır |
| control_engine.ts | 9.4KB | K1 L0 Gatekeeper — girdi doğrulama, rate limit, replay koruması |
| toolRunner.ts | 8.9KB | dosyaOku, dosyaYaz, dizinListele, webAra, ragSorgula, apiCagir araçlarını çalıştırır |
| agentMemory.ts | 7.8KB | Ajan bellek yönetimi — geçmiş görevler, öğrenilenler |
| orchestrator.ts | 7.2KB | Görev atama — anahtar kelime eşleştirmesiyle uygun ajanı bulur |
| redTeam.ts | 6.7KB | 12 saldırı testi — Monte Carlo çürütme motoru |
| ruleGuard.ts | 6.7KB | Ajan girdi/çıktı kural koruyucu |
| taskDecomposer.ts | 6.2KB | Karmaşık görevi alt-görevlere parçalar |
| consensus.ts | 6.1KB | 3 yargıç oyu — Quorum 2/3 + veto mekanizması |
| bootstrap.ts | 5.7KB | Sistem başlatma — Supabase bağlantı, tablo kontrolü, Telegram webhook auto-register |
| localAudit.ts | 5.3KB | Yerel denetim yazıcı |
| postExec.ts | 4.8KB | K9 — Merkle hash zinciri, invariant kontrolü, health status, rapor |
| circuitBreaker.ts | 4.6KB | Hata eşiği aşılınca tüm sistemi durdurur |
| hermAI/analysisEngine.ts | 4.7KB | K2.1 — Ollama/local AI ile 5 eksen analizi |
| hermAI/criteriaEngine.ts | 17.4KB | K2.3 — 92 kriter motoru |
| proof/proofEngine.ts | 4.9KB | K5.1 — SAT solver, kanıt üretimi |
| proof/verifier.ts | 3.6KB | K5.2 — Çift doğrulayıcı (kural + AI) |
| gateCheck.ts | 3.4KB | K7 — 9 kapı kontrol (G1-G9) |
| taskQueue.ts | 3.2KB | Görev kuyruğu yönetimi |
| formalSpec.ts | 3.2KB | K3 — Pre/post condition, invariant, Z3/SMT-LIB formatı |
| executionEngine.ts | 3.0KB | K8 — Snapshot alma, handler çalıştırma, rollback |
| types.ts | 2.5KB | Ortak tip tanımları (CommandContext, HermAIAnalysis, vb.) |
| watchdog.ts | 1.9KB | Sistem izleme servisi |

---

# SEKİZİNCİ KISIM: SERVİS KATMANI — 23 DOSYA

| Servis | Boyut | Ne İş Yapıyor |
|--------|-------|---------------|
| agentRegistry.ts | 44.6KB | 50 ajan yönetimi — kayıt, güncelleme, silme, sorgulama, istatistik |
| browserService.ts | 18.7KB | Browserless tarayıcı otomasyon |
| aiManager.ts | 15.9KB | AI çağrı yönlendirme ve yönetim |
| agentCloner.ts | 13.1KB | Mevcut ajandan yeni ajan çoğaltma (şablon sistemi) |
| bridgeService.ts | 12.9KB | Çoklu platform mesajlaşma köprüsü |
| consensusEngine.ts | 11.8KB | Yönetim kurulu konsensüs mekanizması |
| selfLearningEngine.ts | 11.3KB | Pattern öğrenme motoru (G-8) |
| alarmService.ts | 10.7KB | Alarm oluşturma, takip, kapatma |
| map.ts | 10.5KB | Sistem haritası (modüller arası bağlantılar) |
| l2Validator.ts | 9.3KB | L2 otonom kod denetimi |
| commandArchiveService.ts | 8.5KB | Komut arşivleme ve geçmiş sorgusu |
| boardService.ts | 8.4KB | Yönetim kurulu kararları CRUD |
| auditService.ts | 7.3KB | SHA-256 chain-linked denetim zinciri |
| notificationService.ts | 7.4KB | Push bildirim yönetimi |
| taskService.ts | 7.0KB | Supabase görev CRUD (oluştur, oku, güncelle, sil, arşivle) |
| authService.ts | 6.6KB | Kullanıcı oturum yönetimi |
| browserlessAdapter.ts | 5.2KB | Browserless API adaptörü |
| ollamaBridge.ts | 4.9KB | Ollama API adaptörü |
| ragService.ts | 4.3KB | RAG bilgi tabanı arama servisi |
| telegramNotifier.ts | 4.2KB | Telegram'a bildirim gönderme |
| exportService.ts | 3.4KB | Sistem JSON exportu (mühürleme) |
| webSearch.ts | 3.2KB | İnternet arama servisi |
| telegramService.ts | 1.9KB | Telegram mesaj gönderim wrapper |

---

# DOKUZUNCU KISIM: LİB KATMANI — 18 DOSYA

| Dosya | Boyut | Ne İş Yapıyor |
|-------|-------|---------------|
| i18n.ts | 19.1KB | Çoklu dil desteği — Türkçe ve Arapça çevirileri |
| errorCore.ts | 15.1KB | Merkezi hata yönetimi — ERR-STP001..ERR-STP099 kodları, processError fonksiyonu |
| aiProvider.ts | 14.7KB | AI sağlayıcı seçimi (ollama/local), health check, cache |
| database.types.ts | 7.5KB | Supabase veritabanı TypeScript tip tanımları |
| validation.ts | 7.2KB | Zod şema doğrulama — görev, komut, config şemaları |
| permissionGuard.ts | 5.2KB | Operatör bazlı yetki kontrolü |
| supabase.ts | 3.5KB | Supabase client factory — bağlantı oluşturma |
| supabaseExternal.ts | 2.9KB | Harici Supabase bağlantıları |
| localAuditWriter.ts | 2.4KB | Yerel diske JSON denetim dosyası yazma |
| i18n.test.ts | 2.4KB | Dil testi (7 test) |
| errorHandler.ts | 2.0KB | Hata işleme wrapper |
| swRegister.ts | 2.1KB | Service Worker kayıt (PWA) |
| rateLimiter.ts | 1.6KB | Rate limiting mekanizması |
| fetchWithTimeout.ts | 1.5KB | Timeout destekli fetch wrapper |
| validation.test.ts | 4.3KB | Validasyon testi (12 test) |
| permissionGuard.test.ts | 3.0KB | Yetki testi (8 test) |
| errorCore.test.ts | 2.6KB | Hata yönetimi testi (8 test) |
| aiProvider.test.ts | 3.7KB | AI provider testi (8 test) |

---

# ONUNCU KISIM: STATE YÖNETİMİ (Zustand)

| Store | Boyut | Ne İş Yapıyor |
|-------|-------|---------------|
| useTaskStore.ts | 5.6KB | Görev listesi, filtreler, hata durumu, yükleniyor durumu |
| useAuthStore.ts | 1.5KB | Oturum bilgisi (giriş yapılmış mı, kullanıcı kim) |
| useOperatorStore.ts | 2.4KB | Aktif operatör bilgisi ve seçimi |
| useLanguageStore.ts | 517B | Dil seçimi (TR veya AR) |

---

# ON BİRİNCİ KISIM: VERİTABANI TABLOLARI

Pipeline boyunca şu Supabase tablolarına yazılır:

| Tablo | Yazan Katman | İçerik |
|-------|-------------|--------|
| commands | K1 | Gelen komutlar (raw_text, hash, nonce, status) |
| immutable_logs | K1, K6, K8, K9 | Değiştirilemez denetim zinciri (hash + prev_hash) |
| hermai_outputs | K2.1 | AI analiz sonuçları (reasoning, alternatives, confidence) |
| formal_specs | K3 | Ön koşullar, son koşullar, invariantlar, Z3 spec |
| proofs | K5 | Kanıt sonuçları (SAT/UNSAT, hash) |
| proof_cache | K5 | Kanıt cache'i (1 saat TTL) |
| fmea_records | K5 | UNSAT durumunda hata modu analizi |
| refutations | K4, K6 | Red team sonuçları + konsensüs kararı |
| gate_results | K7 | 9 kapı kontrol sonuçları |
| snapshots | K8 | İcra öncesi durum yedeği (rollback için) |
| executions | K8 | İcra sonuçları (success/failed/rolled_back) |
| proof_chain | K9 | Merkle hash zinciri |
| traceability | K9 | Modüller arası izleme bağlantısı |
| performance_metrics | K9 | Toplam süre, kriter skoru, konsensüs güveni |
| health_status | K9 | Sistem sağlık durumu |
| problem_reports | K9 | Başarısız işlem raporları |
| alerts | Pipeline | Kritik hata uyarıları |
| operator_certs | Pipeline | Başarılı işlem operatör sertifikası |
| tasks | Görev CRUD | Kullanıcı görevleri (panel'den oluşturulan) |

---

# ON İKİNCİ KISIM: GÜVENLİK KATMANLARI (SIRASIYLA)

1. proxy.ts → 300 istek/dk limiti
2. permissionGuard.ts → Operatör rolü kontrolü
3. validation.ts → Zod şema doğrulama
4. K1 control_engine.ts → Rate limit (10/dk), replay koruması (nonce), concurrent lock, sanitization
5. ruleGuard.ts → 35+ kural kontrolü
6. circuitBreaker.ts → Hata eşiği aşılınca tüm sistemi durdurur
7. K4 redTeam.ts → 12 saldırı testi
8. K6 consensus.ts → Veto mekanizması (weight >= 3 red = durdur)
9. K7 gateCheck.ts → 9 kapı kontrol (tek fail = durdur)
10. K8 executionEngine.ts → Snapshot + rollback
11. auditService.ts → SHA-256 chain-linked denetim zinciri
12. localAuditWriter.ts → Disk'e JSON dosya
13. aiProvider.ts → forceDisableOpenAI = true (OpenAI tamamen kapalı)

---

# ON ÜÇÜNCÜ KISIM: BİLDİRİM KANALLARI

| Kanal | Servis | Nasıl Çalışıyor |
|-------|--------|----------------|
| Panel Toast | sonner kütüphanesi | Ekrandaki küçük bildirim kutusu |
| Panel Çan | NotificationBell.tsx | Navbar'daki bildirim çanı, tıklanınca liste açılır |
| Telegram | telegramNotifier.ts → grammY | Bot token ile chat_id'ye mesaj gönderir |
| immutable_logs | auditService.ts | Supabase'e değiştirilemez kayıt yazar |
| Disk | localAuditWriter.ts | JSON dosyasını yerel diske yazar |

---

# ON DÖRDÜNCÜ KISIM: TEST ALT YAPISI

| Dosya | Test Sayısı | Sonuç |
|-------|------------|-------|
| agentRegistry.test.ts | 20 | 20/20 GEÇTI |
| useTaskStore.test.ts | 13 | 13/13 GEÇTI |
| validation.test.ts | 12 | 12/12 GEÇTI |
| auditService.test.ts | 8 | 8/8 GEÇTI |
| errorCore.test.ts | 8 | 8/8 GEÇTI |
| aiProvider.test.ts | 8 | 8/8 GEÇTI |
| permissionGuard.test.ts | 8 | 8/8 GEÇTI |
| i18n.test.ts | 7 | 7/7 GEÇTI |
| consensusEngine.test.ts | 7 | 7/7 GEÇTI |
| taskService.test.ts | 5 | 5/5 GEÇTI |
| TOPLAM | 96 | 96/96 GEÇTI |

Pre-commit hook: Her commit öncesi TypeScript kontrolü + 96 unit test çalıştırılır. Başarısız olursa commit engellenir.

---

# ON BEŞİNCİ KISIM: SAYISAL TABLO

| Ne | Kaç Tane |
|----|---------|
| Pipeline katmanı | 9 (K1-K9) |
| API endpoint | 28 |
| Ajan | 50 (50/50 aktif) |
| Dashboard ekranı | 16 |
| React bileşeni | 27 |
| Servis dosyası | 23 |
| Core dosyası | 26 |
| Lib dosyası | 18 |
| Store dosyası | 5 |
| Unit test | 96 (96/96 geçti) |
| Veritabanı tablosu | 19 |
| Red Team saldırı testi | 12 |
| Kriter motoru | 92 kriter |
| Gate Check kapı | 9 (G1-G9) |
| Güvenlik katmanı | 13 |
| Bildirim kanalı | 5 |
| Veritabanı | Supabase PostgreSQL |
| AI | Ollama (yerel) + kural tabanlı |
| Maliyet | 0₺ |
| Dil | Türkçe + Arapça |
| PWA | Aktif |
