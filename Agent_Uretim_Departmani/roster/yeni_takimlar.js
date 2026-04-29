/**
 * yeni_takimlar.js — AI, MB, ET, PZ Takımları (4 × 5 = 20 Ajan)
 *
 * RUL (Rol Uygulama Lisansı): Bu takımlar sisteme yeni uzmanlık kazandırır.
 * Mevcut 32 takımda BULUNMAYAN 56 beceriyi kapsar.
 *
 * MODÜL HATA KODLARI (YTK-xxx):
 *   YTK-001 : Ajan tanımı eksik — zorunlu alan boş
 *   YTK-002 : Takım kodu çakışması — types.js ile uyumsuz
 */

// ── YENİ TAKIM 1: AI — Yapay Zeka Mühendisliği ────────────────
// KRİTİK: Kendi AI motorunu yönetecek takım sistemde yoktu.
// Bu takım; LLM seçimi, RAG mimarisi, prompt mühendisliği ve
// model dağıtımını otonom olarak yönetir.
const AI_TAKIMI = [
    {
        id: 'AI-01', kod_adi: 'SIGMA',
        uzmanlik_alani: 'Yapay Zeka Mühendisliği',
        asama: 'TASARIM',
        takim_kodu: 'AI',
        gorev_tanimi: 'LLM seçimi, prompt mühendisliği ve RAG mimarisi tasarlar',
        beceriler: ['llm', 'prompt_engineering', 'rag', 'chain_of_thought', 'few_shot_learning', 'sistem_prompt_tasarimi', 'model_degerlendirme', 'benchmark'],
        kapsam_siniri: ['donanim', 'muhasebe', 'hukuk'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'AI-02', kod_adi: 'NEXUS',
        uzmanlik_alani: 'Yapay Zeka Mühendisliği',
        asama: 'TASARIM',
        takim_kodu: 'AI',
        gorev_tanimi: 'Vektör embedding, vektör veritabanı ve semantik arama denetler',
        beceriler: ['embedding', 'vektör_veritabani', 'pinecone', 'qdrant', 'chromadb', 'semantik_arama', 'benzerlik_skoru', 'chunking_stratejisi'],
        kapsam_siniri: ['frontend', 'donanim', 'muhasebe'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'AI-03', kod_adi: 'ATLAS',
        uzmanlik_alani: 'Yapay Zeka Mühendisliği',
        asama: 'TASARIM',
        takim_kodu: 'AI',
        gorev_tanimi: 'Model fine-tuning, LoRA/PEFT ve yerel model dağıtımı yönetir',
        beceriler: ['fine_tuning', 'lora', 'peft', 'qlora', 'ollama_deploy', 'vllm', 'tgi', 'model_quantizasyon'],
        kapsam_siniri: ['is_hukuku', 'pazarlama', 'muhasebe'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'AI-04', kod_adi: 'VERTEX',
        uzmanlik_alani: 'Yapay Zeka Mühendisliği',
        asama: 'TASARIM',
        takim_kodu: 'AI',
        gorev_tanimi: 'AI pipeline, makine öğrenimi ve derin öğrenme modelleri geliştirir',
        beceriler: ['ai_pipeline', 'langchain', 'llamaindex', 'makine_ogrenimi', 'derin_ogrenme', 'pytorch', 'tensorflow', 'scikit_learn'],
        kapsam_siniri: ['donanim', 'hukuk', 'muhasebe'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'AI-05', kod_adi: 'ORACLE',
        uzmanlik_alani: 'Yapay Zeka Mühendisliği',
        asama: 'TASARIM',
        takim_kodu: 'AI',
        gorev_tanimi: 'NLP, metin sınıflandırma ve AI güvenlik denetimi yapar',
        beceriler: ['nlp', 'metin_siniflandirma', 'entity_recognition', 'sentiment_analizi', 'ai_guvenlik', 'hallucination_tespiti', 'ai_etik', 'bias_analizi'],
        kapsam_siniri: ['donanim', 'muhasebe', 'hukuk'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
];

// ── YENİ TAKIM 2: MB — Mobil Uygulama Geliştirme ──────────────
const MB_TAKIMI = [
    {
        id: 'MB-01', kod_adi: 'NOMAD',
        uzmanlik_alani: 'Mobil Uygulama Geliştirme',
        asama: 'INSA',
        takim_kodu: 'MB',
        gorev_tanimi: 'React Native ile cross-platform mobil uygulama geliştirir',
        beceriler: ['react_native', 'expo', 'mobil_navigasyon', 'state_yonetimi', 'native_modul', 'mobil_animasyon', 'offline_first', 'push_notification'],
        kapsam_siniri: ['backend', 'veritabani', 'guvenlik_mimarisi'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'MB-02', kod_adi: 'SWIFT',
        uzmanlik_alani: 'Mobil Uygulama Geliştirme',
        asama: 'INSA',
        takim_kodu: 'MB',
        gorev_tanimi: 'iOS Swift/SwiftUI ve App Store dağıtımını denetler',
        beceriler: ['ios_swift', 'swiftui', 'xcode', 'app_store_deploy', 'ios_test', 'apns', 'core_data', 'ios_guvenlik'],
        kapsam_siniri: ['android', 'backend', 'veritabani'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'MB-03', kod_adi: 'DROID',
        uzmanlik_alani: 'Mobil Uygulama Geliştirme',
        asama: 'INSA',
        takim_kodu: 'MB',
        gorev_tanimi: 'Native Android (Kotlin) ve Google Play dağıtımını yönetir',
        beceriler: ['android_sdk', 'kotlin', 'android_studio', 'google_play_deploy', 'fcm', 'room_db', 'jetpack_compose', 'android_test'],
        kapsam_siniri: ['ios', 'backend', 'veritabani'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'MB-04', kod_adi: 'FLUTTER',
        uzmanlik_alani: 'Mobil Uygulama Geliştirme',
        asama: 'INSA',
        takim_kodu: 'MB',
        gorev_tanimi: 'Flutter/Dart ile yüksek performanslı cross-platform uygulama üretir',
        beceriler: ['flutter', 'dart', 'bloc_pattern', 'flutter_test', 'flutter_web', 'platform_channel', 'flutter_animation', 'pub_dev'],
        kapsam_siniri: ['backend', 'donanim', 'veritabani'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'MB-05', kod_adi: 'SENSOR',
        uzmanlik_alani: 'Mobil Uygulama Geliştirme',
        asama: 'INSA',
        takim_kodu: 'MB',
        gorev_tanimi: 'Mobil test stratejisi, CI/CD ve uygulama güvenliğini denetler',
        beceriler: ['mobil_test', 'detox', 'appium', 'mobil_ci_cd', 'mobil_guvenlik', 'certificate_pinning', 'biometrik_kimlik', 'mobil_performans'],
        kapsam_siniri: ['backend', 'veritabani', 'altyapi'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
];

// ── YENİ TAKIM 3: ET — E-Ticaret ve Pazaryeri ─────────────────
// KRİTİK: Trendyol/N11 operasyonu için özel takım yoktu.
const ET_TAKIMI = [
    {
        id: 'ET-01', kod_adi: 'MERCHANT',
        uzmanlik_alani: 'E-Ticaret ve Pazaryeri',
        asama: 'INSA',
        takim_kodu: 'ET',
        gorev_tanimi: 'Trendyol Seller API entegrasyonu ve ürün yönetimini yürütür',
        beceriler: ['trendyol_api', 'trendyol_urun_yonetimi', 'trendyol_siparis', 'trendyol_kargo', 'trendyol_reklam', 'pazaryeri_webhook', 'urun_katalogu', 'barkod_yonetimi'],
        kapsam_siniri: ['frontend_tasarim', 'altyapi', 'guvenlik_mimarisi'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'ET-02', kod_adi: 'BAZAAR',
        uzmanlik_alani: 'E-Ticaret ve Pazaryeri',
        asama: 'INSA',
        takim_kodu: 'ET',
        gorev_tanimi: 'N11, Hepsiburada ve çoklu pazaryeri senkronizasyonunu denetler',
        beceriler: ['n11_api', 'hepsiburada_api', 'pazaryeri_entegrasyon', 'coklu_kanal_yonetimi', 'fiyat_senkronizasyon', 'stok_senkronizasyon', 'siparis_yonetimi', 'iade_yonetimi'],
        kapsam_siniri: ['frontend_tasarim', 'altyapi', 'hukuk'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'ET-03', kod_adi: 'PRICER',
        uzmanlik_alani: 'E-Ticaret ve Pazaryeri',
        asama: 'INSA',
        takim_kodu: 'ET',
        gorev_tanimi: 'Dinamik fiyatlama ve rakip analizi stratejisi üretir',
        beceriler: ['fiyat_optimizasyon', 'dinamik_fiyatlama', 'rakip_analizi', 'rezervasyon_fiyati', 'kampanya_yonetimi', 'marj_hesaplama', 'fiyat_elastikiyeti', 'otomatik_indirim'],
        kapsam_siniri: ['frontend_tasarim', 'altyapi', 'guvenlik'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'ET-04', kod_adi: 'STOCKAR',
        uzmanlik_alani: 'E-Ticaret ve Pazaryeri',
        asama: 'INSA',
        takim_kodu: 'ET',
        gorev_tanimi: 'Gerçek zamanlı stok yönetimi ve tedarik zinciri optimizasyonu yapar',
        beceriler: ['stok_yonetimi', 'gercek_zamanli_stok', 'tedarik_zinciri', 'depo_yonetimi', 'min_maks_stok', 'stok_uyari', 'barkod_takip', 'sevkiyat_yonetimi'],
        kapsam_siniri: ['frontend_tasarim', 'hukuk', 'guvenlik'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'ET-05', kod_adi: 'REVIEW',
        uzmanlik_alani: 'E-Ticaret ve Pazaryeri',
        asama: 'DOGRULAMA',
        takim_kodu: 'ET',
        gorev_tanimi: 'Müşteri yorumları, iade analizi ve satıcı performansını denetler',
        beceriler: ['musteri_yorumlari', 'satis_analizi', 'iade_analizi', 'satici_puani', 'kampanya_etkinligi', 'musteri_memnuniyeti', 'chargeback_yonetimi', 'pazaryeri_kurallar'],
        kapsam_siniri: ['altyapi', 'guvenlik', 'frontend_tasarim'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
];

// ── YENİ TAKIM 4: PZ — Pazarlama ve Büyüme ────────────────────
const PZ_TAKIMI = [
    {
        id: 'PZ-01', kod_adi: 'RANK',
        uzmanlik_alani: 'Pazarlama ve Büyüme',
        asama: 'YASATMA',
        takim_kodu: 'PZ',
        gorev_tanimi: 'SEO stratejisi, keyword analizi ve organik büyümeyi yönetir',
        beceriler: ['seo', 'keyword_analizi', 'teknik_seo', 'backlink_stratejisi', 'sayfa_hizi_optimizasyon', 'schema_markup', 'google_search_console', 'seo_audit'],
        kapsam_siniri: ['altyapi', 'guvenlik', 'veritabani'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'PZ-02', kod_adi: 'CAMP',
        uzmanlik_alani: 'Pazarlama ve Büyüme',
        asama: 'YASATMA',
        takim_kodu: 'PZ',
        gorev_tanimi: 'Dijital reklam kampanyaları (Google Ads, Meta Ads) yönetir',
        beceriler: ['reklam_yonetimi', 'google_ads', 'meta_ads', 'reklam_butcesi', 'a_b_testi', 'conversion_optimizasyon', 'remarketing', 'roas_hesaplama'],
        kapsam_siniri: ['altyapi', 'guvenlik', 'kod_yazma'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'PZ-03', kod_adi: 'ENGAGE',
        uzmanlik_alani: 'Pazarlama ve Büyüme',
        asama: 'YASATMA',
        takim_kodu: 'PZ',
        gorev_tanimi: 'Email pazarlama, sosyal medya ve içerik stratejisi üretir',
        beceriler: ['email_pazarlama', 'sosyal_medya', 'icerik_takvimi', 'newsletter', 'mailchimp', 'klaviyo', 'icerik_uretimi', 'engagement_metrikleri'],
        kapsam_siniri: ['altyapi', 'guvenlik', 'veritabani'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'PZ-04', kod_adi: 'SEGMENT',
        uzmanlik_alani: 'Pazarlama ve Büyüme',
        asama: 'YASATMA',
        takim_kodu: 'PZ',
        gorev_tanimi: 'Müşteri segmentasyonu, RFM analizi ve CLV hesaplama yapar',
        beceriler: ['musteri_segmentasyonu', 'rfm_analizi', 'clv_hesaplama', 'cohort_analizi', 'churn_tespiti', 'kisisellestime', 'davranis_analizi', 'musteri_yolculugu'],
        kapsam_siniri: ['altyapi', 'guvenlik', 'kod_yazma'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
    {
        id: 'PZ-05', kod_adi: 'GROWTH',
        uzmanlik_alani: 'Pazarlama ve Büyüme',
        asama: 'YASATMA',
        takim_kodu: 'PZ',
        gorev_tanimi: 'Growth hacking, büyüme deneyleri ve funnel optimizasyonunu denetler',
        beceriler: ['growth_hacking', 'funnel_analizi', 'product_led_growth', 'viral_dongu', 'retensiyon_metrikleri', 'pirate_metrics', 'onboarding_optimizasyon', 'referral_programi'],
        kapsam_siniri: ['altyapi', 'guvenlik', 'veritabani'],
        durum: 'HAZIR', tamamlanan_gorev: 0, hata_sayisi: 0,
    },
];

// ── MEVCUT TAKIMLARA RUL (Beceri Genişletme) ──────────────────
// Not: Bu beceriler mevcut takım ajanlarına enjekte edilmek üzere
// burada tanımlanır. discipline_injector.js okuyarak sisteme ekler.
const MEVCUT_TAKIM_RULLERI = {
    HU: ['ticaret_hukuku', 'is_hukuku', 'sozlesme_analizi'],
    MK: ['odeme_sistemi', 'fatura_otomasyonu', 'muhasebe_entegrasyonu'],
    AT: ['iot', 'raspberry_pi', 'sensor_entegrasyonu', 'edge_computing'],
    VM: ['pandas', 'numpy', 'istatistik_analizi', 'a_b_testi', 'predictive_analytics'],
    VA: ['nlp', 'metin_analizi', 'veri_madenciligi'],
    EN: ['whatsapp_api', 'ses_tanima', 'stt', 'tts', 'discord_bot'],
    DO: ['web_kazima', 'puppeteer', 'playwright', 'selenium'],
};

// ── BİRLEŞİK YENİ KADRO ─────────────────────────────────────
const YENI_TAKIMLAR = [
    ...AI_TAKIMI,   // 5 ajan
    ...MB_TAKIMI,   // 5 ajan
    ...ET_TAKIMI,   // 5 ajan
    ...PZ_TAKIMI,   // 5 ajan
];

module.exports = { YENI_TAKIMLAR, AI_TAKIMI, MB_TAKIMI, ET_TAKIMI, PZ_TAKIMI, MEVCUT_TAKIM_RULLERI };
