/**
 * uzman_kadro_genisletilmis.js — 28 Konu × 10 Ajan = 280 Uzman Birim
 *
 * KURAL: Her konuda minimum 3 FARKLI Ollama modeli zorunludur.
 * Tek noktaya bağlama yasak. Ajan-model dağılımı rotasyonla yapılır.
 * Model düşerse bir sonraki devreye girer — insan onayı gerekmez.
 *
 * MODÜL HATA KODLARI (UKG-xxx):
 *   UKG-001 : Model yanıt vermedi — failover tetiklendi
 *   UKG-002 : Tüm modeller yanıtsız — görev bekletmeye alındı
 *   UKG-003 : Kapsam ihlali — ajan uzmanlık dışı istek aldı
 *   UKG-004 : Minimum 3 model şartı sağlanamadı
 */

// ──────────────────────────────────────────────────────────────────
// MEVCUT OLLAMA MODELLERİ (60 model — 30 orijinal + 30 klon)
// Güç sıralaması: 5=çok güçlü, 1=hafif/hızlı
// ──────────────────────────────────────────────────────────────────
const MODELLER = {
  // Büyük / Derin
  GPT_OSS_20B:      { isim: 'gpt-oss:20b',               guc: 5, vram: '13GB', tur: 'genel' },
  COMMAND_R:        { isim: 'command-r:latest',           guc: 5, vram: '18GB', tur: 'genel' },
  PHI4:             { isim: 'phi4:latest',                guc: 5, vram: '9.1GB', tur: 'akil' },
  DEEPSEEK_CODER:   { isim: 'deepseek-coder-v2:latest',  guc: 5, vram: '8.9GB', tur: 'kod' },
  MISTRAL_NEMO:     { isim: 'mistral-nemo:latest',        guc: 4, vram: '7.1GB', tur: 'genel' },
  LLAMA_VISION:     { isim: 'llama3.2-vision:11b',        guc: 4, vram: '7.8GB', tur: 'vizyon' },
  MINICPM_V:        { isim: 'minicpm-v:latest',           guc: 4, vram: '5.5GB', tur: 'vizyon' },
  DEEPSEEK_R1:      { isim: 'deepseek-r1:7b',             guc: 4, vram: '4.7GB', tur: 'akil' },
  LLAMA31:          { isim: 'llama3.1:8b',                guc: 4, vram: '4.9GB', tur: 'genel' },
  LLAMA3:           { isim: 'llama3:8b',                  guc: 4, vram: '4.7GB', tur: 'genel' },
  GEMMA2:           { isim: 'gemma2:9b',                  guc: 4, vram: '5.4GB', tur: 'genel' },
  GEMMA_7B:         { isim: 'gemma:7b',                   guc: 4, vram: '5.0GB', tur: 'genel' },
  QWEN35:           { isim: 'qwen3.5:latest',             guc: 4, vram: '6.6GB', tur: 'genel' },
  LLAVA:            { isim: 'llava:latest',               guc: 3, vram: '4.7GB', tur: 'vizyon' },
  LLAVA_15_7B:      { isim: 'llava-1.5-7b-hf-q4_k_m:latest', guc: 3, vram: '4.1GB', tur: 'vizyon' },
  QWEN25:           { isim: 'qwen2.5:latest',             guc: 4, vram: '4.7GB', tur: 'genel' },
  MISTRAL:          { isim: 'mistral:latest',             guc: 3, vram: '4.4GB', tur: 'genel' },
  CODELLAMA:        { isim: 'codellama:latest',           guc: 3, vram: '3.8GB', tur: 'kod' },
  CODELLAMA_7B:     { isim: 'codellama-7b-instruct.q4_k_m:latest', guc: 3, vram: '4.1GB', tur: 'kod' },
  STARCODER2:       { isim: 'starcoder2:latest',          guc: 3, vram: '1.7GB', tur: 'kod' },
  GEMMA3_4B:        { isim: 'gemma3:4b',                  guc: 3, vram: '3.3GB', tur: 'genel' },
  QWEN35_4B:        { isim: 'qwen3.5:4b',                 guc: 3, vram: '3.4GB', tur: 'genel' },
  QWEN25_CODER:     { isim: 'qwen2.5-coder:3b',           guc: 3, vram: '1.9GB', tur: 'kod' },
  PHI4_MINI:        { isim: 'phi4-mini:latest',           guc: 2, vram: '2.5GB', tur: 'hafif' },
  PHI35_MINI:       { isim: 'phi-3.5-mini-instruct-q4_k_m:latest', guc: 2, vram: '2.4GB', tur: 'hafif' },
  PHI3:             { isim: 'phi3:latest',                guc: 2, vram: '2.2GB', tur: 'hafif' },
  LLAMA32_1B:       { isim: 'llama3.2:1b',               guc: 1, vram: '1.3GB', tur: 'hafif' },
  GEMMA3_1B:        { isim: 'gemma3:1b',                  guc: 1, vram: '815MB', tur: 'hafif' },
  QWEN3_06B:        { isim: 'qwen3:0.6b',                guc: 1, vram: '522MB', tur: 'hafif' },
  QWEN2_05B:        { isim: 'qwen2:0.5b',                guc: 1, vram: '352MB', tur: 'hafif' },
  TINYLLAMA:        { isim: 'tinyllama:latest',           guc: 1, vram: '637MB', tur: 'hafif' },
  NOMIC_EMBED:      { isim: 'nomic-embed-text:latest',    guc: 2, vram: '274MB', tur: 'embed' },
};

// ──────────────────────────────────────────────────────────────────
// AJAN ÜRETME FONKSİYONU — MİNİMUM 3 MODEL ZORUNLU
// Ajanlar modeller arasında dağıtılır (rotasyonla)
// ──────────────────────────────────────────────────────────────────
function _ajanUret(konuKodu, konuAdi, modeller, beceriler) {
  if (modeller.length < 3) throw new Error(`[UKG-004] ${konuKodu}: Minimum 3 model gerekli, ${modeller.length} verildi.`);

  const kodAdlari = ['ALFA','BRAVO','CHARLIE','DELTA','ECHO','FOXTROT','GOLF','HOTEL','INDIA','JULIET'];
  const roller    = { 0:'YAPICI', 1:'DENETÇİ', 2:'UZMAN-A', 3:'UZMAN-B', 4:'UZMAN-C', 5:'UZMAN-D', 6:'UZMAN-E', 7:'UZMAN-F', 8:'UZMAN-G', 9:'UZMAN-H' };

  return Array.from({ length: 10 }, (_, i) => {
    const modelIdx  = i % modeller.length;            // rotasyonla dağıt
    const model     = modeller[modelIdx];
    const yedekIdx1 = (modelIdx + 1) % modeller.length;
    const yedekIdx2 = (modelIdx + 2) % modeller.length;

    return {
      id:             `${konuKodu}-${String(i + 1).padStart(2, '0')}`,
      kod_adi:        kodAdlari[i],
      uzmanlik_alani: konuAdi,
      asama:          roller[i],
      takim_kodu:     konuKodu,
      gorev_tanimi:   `${konuAdi} — ${roller[i]} rolü`,
      // Her ajan kendi modeli + 2 yedek biliyor
      atanan_model:   model.isim,
      failover_zinciri: [
        model.isim,
        modeller[yedekIdx1].isim,
        modeller[yedekIdx2].isim,
      ],
      beceriler,
      kapsam_siniri:  [`${konuKodu} dışı her konu`],
      durum:          'HAZIR',
      tamamlanan_gorev: 0,
      hata_sayisi:    0,
      rul_versiyonu:  '2.0',
      kayit_tarihi:   '2026-04-25',
    };
  });
}

// ──────────────────────────────────────────────────────────────────
// 28 UZMAN KONU TANIMI
// Her konu: min 3 farklı Ollama modeli + 10 ajan
// ──────────────────────────────────────────────────────────────────
const UZMAN_KONULAR = [

  // ─── GRUP 1: KOD & TEKNİK ─────────────────────────────────────
  {
    konu_kodu: 'PY', konu_adi: 'Python Geliştirme',
    modeller: [MODELLER.DEEPSEEK_CODER, MODELLER.QWEN25_CODER, MODELLER.CODELLAMA],
    ajanlar: _ajanUret('PY', 'Python Geliştirme',
      [MODELLER.DEEPSEEK_CODER, MODELLER.QWEN25_CODER, MODELLER.CODELLAMA],
      ['python', 'pip', 'venv', 'pytest', 'pandas', 'fastapi', 'django', 'asyncio', 'type_hints', 'pydantic']),
  },
  {
    konu_kodu: 'JS', konu_adi: 'JavaScript / Node.js',
    modeller: [MODELLER.CODELLAMA, MODELLER.CODELLAMA_7B, MODELLER.QWEN25_CODER],
    ajanlar: _ajanUret('JS', 'JavaScript / Node.js',
      [MODELLER.CODELLAMA, MODELLER.CODELLAMA_7B, MODELLER.QWEN25_CODER],
      ['javascript', 'nodejs', 'typescript', 'express', 'nextjs', 'npm', 'async_await', 'jest', 'webpack', 'esmodule']),
  },
  {
    konu_kodu: 'SC', konu_adi: 'Kaynak Kod Kalitesi',
    modeller: [MODELLER.STARCODER2, MODELLER.DEEPSEEK_CODER, MODELLER.CODELLAMA],
    ajanlar: _ajanUret('SC', 'Kaynak Kod Kalitesi',
      [MODELLER.STARCODER2, MODELLER.DEEPSEEK_CODER, MODELLER.CODELLAMA],
      ['code_review', 'refactoring', 'solid', 'design_patterns', 'clean_code', 'linting', 'complexity', 'duplication', 'tech_debt', 'sonarqube']),
  },
  {
    konu_kodu: 'VT', konu_adi: 'Veritabanı ve SQL',
    modeller: [MODELLER.DEEPSEEK_CODER, MODELLER.QWEN25_CODER, MODELLER.LLAMA31],
    ajanlar: _ajanUret('VT', 'Veritabanı ve SQL',
      [MODELLER.DEEPSEEK_CODER, MODELLER.QWEN25_CODER, MODELLER.LLAMA31],
      ['sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'schema_tasarimi', 'indeks', 'query_optim', 'migration', 'supabase']),
  },

  // ─── GRUP 2: AI & VERİ BİLİMİ ────────────────────────────────
  {
    konu_kodu: 'LP', konu_adi: 'LLM ve Prompt Mühendisliği',
    modeller: [MODELLER.PHI4, MODELLER.QWEN35, MODELLER.GPT_OSS_20B],
    ajanlar: _ajanUret('LP', 'LLM ve Prompt Mühendisliği',
      [MODELLER.PHI4, MODELLER.QWEN35, MODELLER.GPT_OSS_20B],
      ['prompt_engineering', 'system_prompt', 'few_shot', 'chain_of_thought', 'llm_secimi', 'temperature', 'token', 'benchmark', 'rag_prompt', 'model_degerlendirme']),
  },
  {
    konu_kodu: 'RE', konu_adi: 'RAG ve Embedding',
    modeller: [MODELLER.NOMIC_EMBED, MODELLER.PHI4, MODELLER.DEEPSEEK_R1],
    ajanlar: _ajanUret('RE', 'RAG ve Embedding',
      [MODELLER.NOMIC_EMBED, MODELLER.PHI4, MODELLER.DEEPSEEK_R1],
      ['rag', 'embedding', 'vektör_db', 'chromadb', 'qdrant', 'chunking', 'retrieval', 'reranking', 'hybrid_search', 'semantic']),
  },
  {
    konu_kodu: 'ML', konu_adi: 'Makine Öğrenimi',
    modeller: [MODELLER.DEEPSEEK_R1, MODELLER.PHI4, MODELLER.GEMMA2],
    ajanlar: _ajanUret('ML', 'Makine Öğrenimi',
      [MODELLER.DEEPSEEK_R1, MODELLER.PHI4, MODELLER.GEMMA2],
      ['scikit_learn', 'regresyon', 'siniflandirma', 'kumeleme', 'feature_eng', 'cross_validation', 'hiperparametre', 'model_deploy', 'drift', 'a_b_testi']),
  },
  {
    konu_kodu: 'NL', konu_adi: 'Doğal Dil İşleme (NLP)',
    modeller: [MODELLER.MISTRAL_NEMO, MODELLER.COMMAND_R, MODELLER.QWEN25],
    ajanlar: _ajanUret('NL', 'Doğal Dil İşleme',
      [MODELLER.MISTRAL_NEMO, MODELLER.COMMAND_R, MODELLER.QWEN25],
      ['nlp', 'sentiment', 'ner', 'metin_sinif', 'tokenizasyon', 'pos_tagging', 'ozet', 'ceviri', 'soru_cevap', 'turkish_nlp']),
  },

  // ─── GRUP 3: VİZYON ──────────────────────────────────────────
  {
    konu_kodu: 'VI', konu_adi: 'Görüntü Analizi ve Vizyon',
    modeller: [MODELLER.LLAMA_VISION, MODELLER.LLAVA, MODELLER.MINICPM_V],
    ajanlar: _ajanUret('VI', 'Görüntü Analizi',
      [MODELLER.LLAMA_VISION, MODELLER.LLAVA, MODELLER.MINICPM_V],
      ['goruntu_tanima', 'ocr', 'nesne_tespiti', 'yuz_tanima', 'mediapipe', 'opencv', 'segmentasyon', 'gorsel_soru', 'kamera', 'video_analiz']),
  },
  {
    konu_kodu: 'MM', konu_adi: 'Multimodal AI',
    modeller: [MODELLER.MINICPM_V, MODELLER.LLAVA_15_7B, MODELLER.LLAMA_VISION],
    ajanlar: _ajanUret('MM', 'Multimodal AI',
      [MODELLER.MINICPM_V, MODELLER.LLAVA_15_7B, MODELLER.LLAMA_VISION],
      ['multimodal', 'gorsel_anlama', 'caption', 'vqa', 'chart_analiz', 'belge_anlama', 'pdf_analiz', 'tablo_okuma', 'form_anlama', 'medya_analiz']),
  },

  // ─── GRUP 4: E-TİCARET ───────────────────────────────────────
  {
    konu_kodu: 'ET', konu_adi: 'Trendyol ve Pazaryeri API',
    modeller: [MODELLER.QWEN25_CODER, MODELLER.CODELLAMA, MODELLER.DEEPSEEK_CODER],
    ajanlar: _ajanUret('ET', 'Trendyol ve Pazaryeri',
      [MODELLER.QWEN25_CODER, MODELLER.CODELLAMA, MODELLER.DEEPSEEK_CODER],
      ['trendyol_api', 'siparis', 'urun_yonetimi', 'stok', 'kargo', 'n11_api', 'hepsiburada_api', 'webhook', 'kategori', 'barkod']),
  },
  {
    konu_kodu: 'FY', konu_adi: 'Fiyatlandırma Optimizasyonu',
    modeller: [MODELLER.DEEPSEEK_R1, MODELLER.PHI4, MODELLER.QWEN25],
    ajanlar: _ajanUret('FY', 'Fiyatlandırma',
      [MODELLER.DEEPSEEK_R1, MODELLER.PHI4, MODELLER.QWEN25],
      ['dinamik_fiyat', 'rakip_analiz', 'marj', 'kampanya', 'roi', 'elastisite', 'bundle', 'kar_analiz', 'otomatik_indirim', 'rezervasyon_fiyat']),
  },
  {
    konu_kodu: 'CR', konu_adi: 'Müşteri İlişkileri (CRM)',
    modeller: [MODELLER.COMMAND_R, MODELLER.MISTRAL_NEMO, MODELLER.LLAMA31],
    ajanlar: _ajanUret('CR', 'Müşteri İlişkileri',
      [MODELLER.COMMAND_R, MODELLER.MISTRAL_NEMO, MODELLER.LLAMA31],
      ['crm', 'segmentasyon', 'rfm', 'churn', 'clv', 'memnuniyet', 'iade', 'sadakat', 'kisisellestime', 'musteri_yolculugu']),
  },

  // ─── GRUP 5: GÜVENLİK & ALTYAPI ──────────────────────────────
  {
    konu_kodu: 'GV', konu_adi: 'Siber Güvenlik',
    modeller: [MODELLER.PHI4, MODELLER.DEEPSEEK_R1, MODELLER.LLAMA31],
    ajanlar: _ajanUret('GV', 'Siber Güvenlik',
      [MODELLER.PHI4, MODELLER.DEEPSEEK_R1, MODELLER.LLAMA31],
      ['owasp', 'pentest', 'zaafiyet', 'jwt', 'sql_injection', 'xss', 'csrf', 'sifreleme', 'soc', 'threat_model']),
  },
  {
    konu_kodu: 'DC', konu_adi: 'Bulut ve DevOps',
    modeller: [MODELLER.LLAMA31, MODELLER.MISTRAL, MODELLER.GEMMA2],
    ajanlar: _ajanUret('DC', 'Bulut ve DevOps',
      [MODELLER.LLAMA31, MODELLER.MISTRAL, MODELLER.GEMMA2],
      ['docker', 'kubernetes', 'aws', 'gcp', 'terraform', 'github_actions', 'ci_cd', 'serverless', 'load_balancer', 'monitoring']),
  },
  {
    konu_kodu: 'AP', konu_adi: 'API Tasarımı ve Entegrasyon',
    modeller: [MODELLER.QWEN25, MODELLER.CODELLAMA, MODELLER.LLAMA31],
    ajanlar: _ajanUret('AP', 'API Tasarımı',
      [MODELLER.QWEN25, MODELLER.CODELLAMA, MODELLER.LLAMA31],
      ['rest', 'graphql', 'grpc', 'api_guvenlik', 'rate_limit', 'versiyonlama', 'swagger', 'postman', 'gateway', 'webhook']),
  },

  // ─── GRUP 6: MOBİL & FRONTEND ────────────────────────────────
  {
    konu_kodu: 'MO', konu_adi: 'Mobil Geliştirme',
    modeller: [MODELLER.GEMMA3_4B, MODELLER.PHI4_MINI, MODELLER.LLAMA32_1B],
    ajanlar: _ajanUret('MO', 'Mobil Geliştirme',
      [MODELLER.GEMMA3_4B, MODELLER.PHI4_MINI, MODELLER.LLAMA32_1B],
      ['react_native', 'flutter', 'ios_swift', 'android_kotlin', 'push_notif', 'app_store', 'mobil_test', 'offline', 'biometrik', 'mobil_perf']),
  },
  {
    konu_kodu: 'FE', konu_adi: 'Frontend ve UI/UX',
    modeller: [MODELLER.QWEN35, MODELLER.GEMMA2, MODELLER.MISTRAL_NEMO],
    ajanlar: _ajanUret('FE', 'Frontend ve UI/UX',
      [MODELLER.QWEN35, MODELLER.GEMMA2, MODELLER.MISTRAL_NEMO],
      ['react', 'nextjs', 'tailwind', 'css_animasyon', 'responsive', 'wcag', 'figma', 'storybook', 'vite', 'perf_audit']),
  },

  // ─── GRUP 7: VERİ TOPLAMA & OTOMASYON ────────────────────────
  {
    konu_kodu: 'WS', konu_adi: 'Web Scraping ve Otomasyon',
    modeller: [MODELLER.DEEPSEEK_CODER, MODELLER.QWEN25_CODER, MODELLER.STARCODER2],
    ajanlar: _ajanUret('WS', 'Web Scraping',
      [MODELLER.DEEPSEEK_CODER, MODELLER.QWEN25_CODER, MODELLER.STARCODER2],
      ['puppeteer', 'playwright', 'selenium', 'cheerio', 'scrapy', 'proxy', 'rate_limit', 'veri_temizle', 'pipeline', 'zamanlama']),
  },
  {
    konu_kodu: 'OT', konu_adi: 'İş Süreci Otomasyonu (RPA)',
    modeller: [MODELLER.PHI3, MODELLER.PHI4_MINI, MODELLER.GEMMA3_1B],
    ajanlar: _ajanUret('OT', 'İş Süreci Otomasyonu',
      [MODELLER.PHI3, MODELLER.PHI4_MINI, MODELLER.GEMMA3_1B],
      ['rpa', 'workflow', 'cron', 'n8n', 'zapier', 'excel_otomasyon', 'email_otomasyon', 'form_doldurma', 'rapor_uretimi', 'trigger']),
  },

  // ─── GRUP 8: İLETİŞİM & BOT ──────────────────────────────────
  {
    konu_kodu: 'WA', konu_adi: 'WhatsApp ve Mesajlaşma Botları',
    modeller: [MODELLER.LLAMA32_1B, MODELLER.GEMMA3_1B, MODELLER.PHI4_MINI],
    ajanlar: _ajanUret('WA', 'WhatsApp Bot',
      [MODELLER.LLAMA32_1B, MODELLER.GEMMA3_1B, MODELLER.PHI4_MINI],
      ['whatsapp_api', 'bot_tasarim', 'komut_isleme', 'niyet_tespiti', 'stt', 'tts', 'qr_yonetimi', 'sablon', 'grup_yonetim', 'bot_test']),
  },
  {
    konu_kodu: 'SS', konu_adi: 'Ses Tanıma ve Sentezi',
    modeller: [MODELLER.LLAMA32_1B, MODELLER.PHI35_MINI, MODELLER.TINYLLAMA],
    ajanlar: _ajanUret('SS', 'Ses Tanıma ve Sentezi',
      [MODELLER.LLAMA32_1B, MODELLER.PHI35_MINI, MODELLER.TINYLLAMA],
      ['stt', 'tts', 'whisper', 'ses_pipeline', 'diarization', 'noise_reduction', 'gtts', 'azure_stt', 'google_stt', 'ses_kalite']),
  },

  // ─── GRUP 9: PAZARLama & SEO ──────────────────────────────────
  {
    konu_kodu: 'SE', konu_adi: 'SEO ve Dijital Pazarlama',
    modeller: [MODELLER.COMMAND_R, MODELLER.MISTRAL, MODELLER.QWEN25],
    ajanlar: _ajanUret('SE', 'SEO ve Dijital Pazarlama',
      [MODELLER.COMMAND_R, MODELLER.MISTRAL, MODELLER.QWEN25],
      ['seo', 'keyword', 'teknik_seo', 'google_ads', 'meta_ads', 'butce', 'conversion', 'backlink', 'site_hizi', 'schema_markup']),
  },
  {
    konu_kodu: 'IC', konu_adi: 'İçerik Üretimi ve Pazarlama',
    modeller: [MODELLER.MISTRAL, MODELLER.GEMMA_7B, MODELLER.LLAMA3],
    ajanlar: _ajanUret('IC', 'İçerik Üretimi',
      [MODELLER.MISTRAL, MODELLER.GEMMA_7B, MODELLER.LLAMA3],
      ['icerik_takvimi', 'sosyal_medya', 'email_kampanya', 'kopya_yazimi', 'urun_aciklama', 'seo_icerik', 'newsletter', 'blog', 'hashtag', 'viral']),
  },

  // ─── GRUP 10: HUKUK & FİNANS ─────────────────────────────────
  {
    konu_kodu: 'HK', konu_adi: 'Hukuk ve Sözleşme Analizi',
    modeller: [MODELLER.PHI4, MODELLER.COMMAND_R, MODELLER.LLAMA31],
    ajanlar: _ajanUret('HK', 'Hukuk ve Sözleşme',
      [MODELLER.PHI4, MODELLER.COMMAND_R, MODELLER.LLAMA31],
      ['sozlesme_analiz', 'kvkk', 'gdpr', 'ticaret_hukuku', 'is_hukuku', 'fikri_mulk', 'gizlilik', 'lisans', 'ihtarname', 'risk']),
  },
  {
    konu_kodu: 'FN', konu_adi: 'Fintech ve Ödeme Sistemleri',
    modeller: [MODELLER.QWEN25, MODELLER.DEEPSEEK_R1, MODELLER.PHI4],
    ajanlar: _ajanUret('FN', 'Fintech ve Ödeme',
      [MODELLER.QWEN25, MODELLER.DEEPSEEK_R1, MODELLER.PHI4],
      ['odeme_gateway', 'iyzico', 'stripe', 'paytr', 'e_fatura', 'muhasebe', 'fatura_otomasyon', 'vergi', 'kasa', 'finans_rapor']),
  },

  // ─── GRUP 11: ANALİZ & DOKÜMANTASYON ─────────────────────────
  {
    konu_kodu: 'AY', konu_adi: 'Stratejik Analiz ve Karar Destek',
    modeller: [MODELLER.GPT_OSS_20B, MODELLER.PHI4, MODELLER.COMMAND_R],
    ajanlar: _ajanUret('AY', 'Stratejik Analiz',
      [MODELLER.GPT_OSS_20B, MODELLER.PHI4, MODELLER.COMMAND_R],
      ['swot', 'senaryo', 'risk', 'karar_matrisi', 'proje_plan', 'kpi', 'is_plani', 'hedef', 'okr', 'kaynak_optim']),
  },
  {
    konu_kodu: 'DO', konu_adi: 'Dokümantasyon Yazarlığı',
    modeller: [MODELLER.GEMMA_7B, MODELLER.LLAMA3, MODELLER.MISTRAL],
    ajanlar: _ajanUret('DO', 'Dokümantasyon',
      [MODELLER.GEMMA_7B, MODELLER.LLAMA3, MODELLER.MISTRAL],
      ['teknik_yazarlik', 'api_doku', 'readme', 'wiki', 'kullanici_kilavuz', 'swagger', 'tutorial', 'changelog', 'onboarding', 'bilgi_tabani']),
  },

];

// Doğrulama: her konuda min 3 model kontrol
for (const k of UZMAN_KONULAR) {
  if (k.modeller.length < 3) throw new Error(`[UKG-004] ${k.konu_kodu} konusunda min 3 model şartı sağlanamadı.`);
}

// Düz ajan listesi
const TUM_UZMAN_AJANLAR = UZMAN_KONULAR.flatMap(k => k.ajanlar);

console.log(`[UZMAN KADRO v2.0] ${UZMAN_KONULAR.length} konu × 10 ajan = ${TUM_UZMAN_AJANLAR.length} uzman birim`);
console.log(`[FAİLOVER] Her ajan 3+ farklı model failover zinciri ile çalışıyor.`);

module.exports = { UZMAN_KONULAR, TUM_UZMAN_AJANLAR, MODELLER };
