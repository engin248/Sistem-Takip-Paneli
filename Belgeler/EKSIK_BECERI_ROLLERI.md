# EKSİK BECERİ ROL HARİTASI
Tarih: 2026-04-25 | Hazırlayan: NİZAM Sistemi | Versiyon: 1.0

> Bu belge, 32 mevcut takımda tespit edilen 56 eksik uzmanlık alanını listeler
> ve her birini mevcut takımlara RUL (Rol Uygulama Lisansı) olarak atar.

---

## ÖZET

| Küme | Eksik Alan Sayısı | Öneri |
|:---|:---:|:---|
| AI / LLM / ML | 10 | Yeni Takim: **AI** (Yapay Zeka Mühendisliği) |
| Mobil Geliştirme | 7 | Yeni Takım: **MB** (Mobil) |
| E-Ticaret / Pazaryeri | 6 | Yeni Takım: **ET** (E-Ticaret) |
| Veri Bilimi / Analitik | 5 | **VM** ve **VA** takımlarına RUL ekle |
| Mesajlaşma / Bot / Ses | 5 | **EN** takımına RUL ekle |
| Web Scraping / Otomasyon | 5 | **DO** takımına RUL ekle |
| Fintech / Muhasebe | 4 | **MK** takımına RUL ekle |
| IoT / Donanım | 4 | **AT** takımına RUL ekle |
| Pazarlama / SEO | 5 | Yeni Takım: **PZ** (Pazarlama) |
| Hukuk Ekstra | 3 | **HU** takımına RUL ekle |

---

## BÖLÜM 1 — MEVCUT TAKIMLARA EKLENECEK ROLLER (RUL)

### HU — Hukuk ve Uyumluluk (Mevcut: KVKK, GDPR)
**Eklenecek Beceriler:**
- `ticaret_hukuku` — Ticari sözleşmeler, ticaret kanunu uygulaması
- `is_hukuku` — İş sözleşmeleri, işe alım/çıkarma mevzuatı
- `sozlesme_analizi` — Sözleşme maddeleri risk tespiti ve müzakere desteği

**RUL:** HU ajanları artık ticaret ve iş hukuku sorularını yanıtlayabilir.
Tetikleyici kelimeler: `sözleşme`, `personel`, `ticaret kanunu`, `fesih`

---

### MK — Maliyet ve Kaynak (Mevcut: ROI, Bütçe)
**Eklenecek Beceriler:**
- `odeme_sistemi` — Ödeme gateway entegrasyonu (iyzico, Stripe, PayTR)
- `fatura_otomasyonu` — e-Fatura, e-Arşiv sistemleri
- `muhasebe_entegrasyonu` — ERP bağlantısı, Luca/Logo/Netsis entegrasyonu

**RUL:** MK ajanları ödeme akışı ve muhasebe bağlantısı analizi yapabilir.
Tetikleyici kelimeler: `fatura`, `ödeme`, `muhasebe`, `ERP`, `iyzico`

---

### AT — Altyapı Tasarımı (Mevcut: AWS, Docker, Cloud)
**Eklenecek Beceriler:**
- `iot` — IoT cihaz yönetimi, protokoller (MQTT, CoAP)
- `raspberry_pi` — Edge donanım konfigürasyonu
- `sensor_entegrasyonu` — Sensör veri alımı ve işleme
- `edge_computing` — Uç bilişim mimarisi, yerel işlem

**RUL:** AT ajanları IoT projelerinde donanım-yazılım köprüsü kurabilir.
Tetikleyici kelimeler: `IoT`, `sensör`, `raspberry`, `edge`, `MQTT`

---

### VM — Veri Modelleme + VA — Veri Akışı (Veri Bilimi RUL)
**Eklenecek Beceriler:**
- `pandas` — Python tabanlı veri manipülasyonu
- `numpy` — Sayısal analiz ve matris işlemleri
- `istatistik_analizi` — Temel istatistik, dağılım, korelasyon
- `a_b_testi` — Kontrollü deney tasarımı ve analizi
- `predictive_analytics` — Tahminsel model kurma ve değerlendirme
- `nlp` — Doğal dil işleme: metin sınıflandırma, token analizi

**RUL:** VM/VA ajanları veri bilimi projelerinde analiz ve model destek verebilir.
Tetikleyici kelimeler: `analiz`, `istatistik`, `tahmin`, `metin analizi`, `nlp`

---

### EN — Entegrasyon (Mevcut: Webhook, Mesaj Kuyrukları)
**Eklenecek Beceriler:**
- `whatsapp_api` — WhatsApp Business API, webhook yönetimi
- `ses_tanima` — STT/TTS entegrasyonu (Whisper, Google STT)
- `stt` — Konuşmadan metne dönüşüm pipeline'ı
- `tts` — Metinden sese dönüşüm ve ses kalitesi yönetimi
- `discord_bot` — Discord bot geliştirme ve slash komutlar

**RUL:** EN ajanları iletişim kanalı entegrasyonlarında tam destek verebilir.
Tetikleyici kelimeler: `WhatsApp API`, `ses`, `STT`, `TTS`, `Discord`

---

### DO — DevOps / CI-CD (Mevcut: Docker, GitHub Actions)
**Eklenecek Beceriler:**
- `web_kazima` — Strukturlü web scraping mimarisi
- `puppeteer` — Headless browser otomasyon
- `playwright` — Cross-browser test ve scraping
- `selenium` — Web otomasyon ve E2E test
- `veri_madenciligi` — Veri toplama pipeline'ı, veri temizleme

**RUL:** DO ajanları web scraping ve otomasyon altyapısı kurabilir.
Tetikleyici kelimeler: `scraping`, `puppeteer`, `playwright`, `veri topla`

---

## BÖLÜM 2 — YENİ TAKIM ÖNERİLERİ

### YENİ TAKIM: AI — Yapay Zeka Mühendisliği
**Kod:** `AI` | **Öncelik:** 🔴 KRİTİK

**Beceriler:**
- `llm` — Büyük dil modeli seçimi, karşılaştırma, değerlendirme
- `prompt_engineering` — Sistem promptu tasarımı, few-shot, chain-of-thought
- `rag` — Retrieval-Augmented Generation mimarisi kurma
- `fine_tuning` — Model ince ayarı (LoRA, PEFT, QLoRA)
- `embedding` — Vektör embedding üretimi ve yönetimi
- `vektör_veritabani` — Pinecone, Qdrant, ChromaDB entegrasyonu
- `model_deployment` — Ollama, vLLM, TGI ile model dağıtımı
- `ai_pipeline` — AI iş akışı tasarımı (LangChain, LlamaIndex)
- `makine_ogrenimi` — Temel ML: regresyon, sınıflandırma, kümeleme
- `derin_ogrenme` — PyTorch/TensorFlow temelleri

**Neden Kritik:** Sistemin temeli AI ama bu beceriler hiçbir takımda yok.
Tetikleyici: `model`, `LLM`, `prompt`, `RAG`, `fine-tune`, `embedding`, `Ollama`

---

### YENİ TAKIM: MB — Mobil Uygulama Geliştirme
**Kod:** `MB` | **Öncelik:** 🟠 YÜKSEK

**Beceriler:**
- `react_native` — Cross-platform mobil (iOS + Android)
- `flutter` — Dart tabanlı native performanslı mobil
- `android_sdk` — Native Android (Kotlin/Java)
- `ios_swift` — Native iOS (Swift/SwiftUI)
- `push_notification` — FCM, APNs bildirim sistemi
- `mobil_test` — XCTest, Espresso, Detox
- `app_store_deploy` — Google Play ve App Store yayın süreci

Tetikleyici: `mobil`, `android`, `ios`, `uygulama`, `flutter`, `react native`

---

### YENİ TAKIM: ET — E-Ticaret / Pazaryeri
**Kod:** `ET` | **Öncelik:** 🟠 YÜKSEK

**Beceriler:**
- `trendyol_api` — Trendyol Seller API (ürün, sipariş, kargo)
- `n11_api` — N11 Marketplace API entegrasyonu
- `hepsiburada_api` — Hepsiburada API yönetimi
- `pazaryeri_entegrasyon` — Çoklu kanal yönetimi
- `fiyat_optimizasyon` — Rekabet analizi, dinamik fiyatlama
- `stok_yonetimi` — Gerçek zamanlı stok senkronizasyonu
- `siparis_yonetimi` — Sipariş akışı, iade yönetimi

Tetikleyici: `Trendyol`, `N11`, `sipariş`, `stok`, `ürün`, `pazaryeri`

---

### YENİ TAKIM: PZ — Pazarlama ve Büyüme
**Kod:** `PZ` | **Öncelik:** 🟡 ORTA

**Beceriler:**
- `seo` — Arama motoru optimizasyonu, keyword analizi
- `sosyal_medya` — Platform stratejisi, içerik takvimi
- `email_pazarlama` — Campaign tasarımı, A/B testi
- `reklam_yonetimi` — Google Ads, Meta Ads entegrasyonu
- `musteri_segmentasyonu` — RFM analizi, kohort segmentasyonu

Tetikleyici: `SEO`, `reklam`, `e-posta`, `pazarlama`, `kampanya`, `müşteri`

---

## BÖLÜM 3 — ÖNCELİK SIRASI VE UYGULAMA PLANI

| # | Aksiyon | Takım | Öncelik | Tahmini Etki |
|:--|:---|:---:|:---:|:---|
| 1 | Yeni AI takımı oluştur (10 beceri, 5 ajan) | AI | 🔴 | Sistemin AI motoru güçlenir |
| 2 | ET takımı (Trendyol/pazaryeri) | ET | 🔴 | E-ticaret geliri artışı |
| 3 | VM + VA'ya veri bilimi RUL | VM/VA | 🟠 | Analitik kapasite |
| 4 | EN'e ses/iletişim RUL | EN | 🟠 | WhatsApp/ses pipeline'ı |
| 5 | Yeni MB takımı (mobil) | MB | 🟠 | Sahadan mobil yönetim |
| 6 | DO'ya scraping RUL | DO | 🟡 | Veri toplama özerkliği |
| 7 | AT'ye IoT RUL | AT | 🟡 | Üretim sensör entegrasyonu |
| 8 | MK'ya fintech RUL | MK | 🟡 | Ödeme pipeline'ı |
| 9 | Yeni PZ takımı (pazarlama) | PZ | 🟡 | Büyüme metrikleri |
| 10 | HU'ya iş/ticaret hukuku RUL | HU | 🟢 | Sözleşme analizi |

---

## SONUÇ

**Mevcut durum:** 32 takım, 223 ajan — yazılım mühendisliği eksiksiz
**Kritik boşluk:** Sistemin kendi AI motorunu yönetecek takım yok (AI)
**Acil boşluk:** Trendyol/e-ticaret operasyonu için özel takım yok (ET)

> Öneri: Aksiyon 1 (AI takımı) ve Aksiyon 2 (ET takımı) bu hafta hayata geçirilmeli.
