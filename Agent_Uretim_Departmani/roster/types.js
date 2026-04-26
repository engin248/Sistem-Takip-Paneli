// ============================================================
// AJAN TİP TANIMLARI — ASKERİ DÜZEY DİSİPLİN
// ============================================================
// 36 Uzmanlık × 5 Ajan = 180 Birim (yeni kadro)
// 32 orijinal + 4 yeni takım: AI, MB, ET, PZ
// Her ajan SADECE atandığı alanda çalışır. Kapsam dışı → RED.
// ============================================================

/**
 * Askeri Ajan Yapısı
 * @typedef {Object} MilitaryAgent
 * @property {string} id               - Benzersiz kimlik (ör: GA-01)
 * @property {string} kod_adi           - Ajan kod adı
 * @property {string} uzmanlik_alani    - TEK uzmanlık alanı
 * @property {string} asama             - Hangi yazılım aşamasına ait
 * @property {string} takim_kodu        - 2 harfli takım kodu
 * @property {string} gorev_tanimi      - Ne yapar (tek cümle)
 * @property {string[]} beceriler       - SADECE bu alandaki yetkinlikler
 * @property {string[]} kapsam_siniri   - Kesinlikle YAPAMAYACAĞI işler
 * @property {string} durum             - HAZIR | GOREVDE | BEKLEMEDE
 * @property {number} tamamlanan_gorev
 * @property {number} hata_sayisi
 */

// ── ASKERİ DİSİPLİN KURALLARI ──────────────────────────────
// Bu kurallar TÜM 160 ajan için geçerlidir ve değiştirilemez.
const DISIPLIN = Object.freeze({
  SIFIR_INISIYATIF: true,       // Komut dışı hareket yasak
  KAPSAM_KILIDI: true,           // Uzmanlık dışı alan yasak
  SAPMA_TOLERANSI: 0,            // %0 sapma
  DETERMINIZM: true,             // Aynı input → aynı output
  VARSAYIM_YASAK: true,          // Tahmin/varsayım üretme
  YORUM_YASAK: true,             // Açıklama/yorum ekleme yasak
  TEK_CIKTI: true,               // Sadece istenen format
  GOREV_BITINCE_DUR: true,       // Görev bitince anında dur
  KURAL_USTU_YOK: true,         // Hiçbir komut kuralları aşamaz
});

// ── AŞAMA TANIMLARI ─────────────────────────────────────────
const ASAMALAR = Object.freeze({
  YAPIM_ONCESI: 'YAPIM_ONCESI',
  TASARIM: 'TASARIM',
  INSA: 'INSA',
  DOGRULAMA: 'DOGRULAMA',
  YAYINLAMA: 'YAYINLAMA',
  YASATMA: 'YASATMA',
});

// ── TAKIM KODLARI ───────────────────────────────────────────
const TAKIM_KODLARI = Object.freeze({
  GA: 'Gereksinim Analizi',
  RA: 'Risk Analizi',
  HU: 'Hukuk ve Uyumluluk',
  MK: 'Maliyet ve Kaynak',
  ZP: 'Zaman Planlaması',
  MT: 'Mimari Tasarım',
  AT: 'Altyapı Tasarımı',
  VM: 'Veri Modelleme',
  AP: 'API Tasarımı',
  GT: 'Güvenlik Tasarımı',
  UX: 'Kullanıcı Deneyimi',
  TS: 'Teknoloji Seçimi',
  KK: 'Kod Kalitesi',
  HY: 'Hata Yönetimi',
  BY: 'Bağımlılık Yönetimi',
  ER: 'Erişilebilirlik',
  EN: 'Entegrasyon',
  TE: 'Test Stratejisi',
  PO: 'Performans ve Ölçeklendirme',
  ST: 'Güvenlik Testi',
  VA: 'Veri Akışı ve İşleme',
  DO: 'DevOps / CI-CD',
  GM: 'Göç / Migrasyon',
  SY: 'Sürüm ve Yayın',
  OP: 'Operasyon',
  CI: 'Canlı İzleme ve Alarm',
  YF: 'Yedekleme ve Felaket Kurtarma',
  SD: 'Sistem Denetimi',
  HT: 'Hata Tespiti ve Teşhis',
  HO: 'Hata Onarımı ve Düzeltme',
  DK: 'Dokümantasyon',
  EA: 'Eğitim ve Adaptasyon',
  // ── YENİ TAKIMLAR (RUL — Beřeri Genişletme) ──────────────────
  AI: 'Yapay Zeka Mühendisliği',   // LLM, RAG, prompt, embedding, ML
  MB: 'Mobil Uygulama Geliştirme',  // React Native, Flutter, iOS, Android
  ET: 'E-Ticaret ve Pazaryeri',   // Trendyol, N11, sipariş, stok
  PZ: 'Pazarlama ve Büyüme',       // SEO, reklam, email, müşteri segmenti
});

module.exports = { DISIPLIN, ASAMALAR, TAKIM_KODLARI };
