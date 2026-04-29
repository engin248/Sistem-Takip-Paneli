/**
 * genisletilmis_takim_2.js — Genişletilmiş Uzman Takımlar (Tur 2)
 * =====================================================================
 * Kapsam: İnternet araştırma, moda/stil, çok dilli, ülke izleme,
 *         veri bilimi, arşiv, yönetici asistanı, gözlem takımları
 *
 * KURAL: Her konuda min 3 farklı Ollama modeli — tek noktaya bağımlılık yasak
 * KURAL: Her ajanın kendi uzmanlık dışı isteği → UKG-003 hatası
 *
 * TOPLAM: 12 yeni konu × 10 ajan = 120 yeni uzman birim
 * (Mevcut 280 birime ek olarak toplam 400 uzman birimе ulaşılır)
 *
 * MODÜL HATA KODLARI (GT2-xxx):
 *   GT2-001 : Model yanıt vermedi — failover tetiklendi
 *   GT2-002 : Tüm modeller yanıtsız — görev bekletmeye alındı
 *   GT2-003 : Kapsam ihlali
 *   GT2-004 : Min 3 model şartı sağlanamadı
 */

'use strict';

// ──────────────────────────────────────────────────────────────────
// MODEL HAVUzU (mevcut 60 Ollama modelinden seçim)
// ──────────────────────────────────────────────────────────────────
const M = {
  GPT20B:    'gpt-oss:20b',
  COMMAND_R: 'command-r:latest',
  PHI4:      'phi4:latest',
  MISTRAL:   'mistral:latest',
  MISTRAL_N: 'mistral-nemo:latest',
  LLAMA31:   'llama3.1:8b',
  LLAMA3:    'llama3:8b',
  QWEN25:    'qwen2.5:latest',
  QWEN35:    'qwen3.5:latest',
  QWEN35_4B: 'qwen3.5:4b',
  GEMMA2:    'gemma2:9b',
  GEMMA_7B:  'gemma:7b',
  GEMMA3_4B: 'gemma3:4b',
  DEEPSEEK:  'deepseek-r1:7b',
  DEEPSEEK_C:'deepseek-coder-v2:latest',
  CODELLAMA: 'codellama:latest',
  QWEN25_CO: 'qwen2.5-coder:3b',
  NOMIC:     'nomic-embed-text:latest',
  LLAVA_V:   'llama3.2-vision:11b',
  LLAVA:     'llava:latest',
  MINICPM:   'minicpm-v:latest',
  PHI3:      'phi3:latest',
  PHI4_MINI: 'phi4-mini:latest',
  LLAMA32_1: 'llama3.2:1b',
  GEMMA3_1B: 'gemma3:1b',
  TINYLLAMA: 'tinyllama:latest',
};

// ──────────────────────────────────────────────────────────────────
// AJAN ÜRETME FONKSİYONU (min 3 model, rotasyonla dağıt)
// ──────────────────────────────────────────────────────────────────
function _ajan(kod, ad, modeller, beceriler) {
  if (modeller.length < 3) throw new Error(`[GT2-004] ${kod}: Min 3 model gerekli.`);
  const isimler = ['ALFA','BRAVO','CHARLIE','DELTA','ECHO','FOXTROT','GOLF','HOTEL','INDIA','JULIET'];
  const roller  = { 0:'YAPICI', 1:'DENETÇİ', 2:'UZMAN-A', 3:'UZMAN-B', 4:'UZMAN-C',
                    5:'UZMAN-D', 6:'UZMAN-E', 7:'UZMAN-F', 8:'UZMAN-G', 9:'UZMAN-H' };
  return Array.from({ length: 10 }, (_, i) => {
    const mi = i % modeller.length;
    return {
      id:              `${kod}-${String(i+1).padStart(2,'0')}`,
      kod_adi:         isimler[i],
      uzmanlik_alani:  ad,
      asama:           roller[i],
      takim_kodu:      kod,
      atanan_model:    modeller[mi],
      failover_zinciri:[modeller[mi], modeller[(mi+1)%modeller.length], modeller[(mi+2)%modeller.length]],
      beceriler,
      kapsam_siniri:   [`${kod} dışı her konu`],
      durum:           'HAZIR',
      tamamlanan_gorev:0, hata_sayisi:0,
      rul_versiyonu:   '2.0', kayit_tarihi:'2026-04-25',
    };
  });
}

// ══════════════════════════════════════════════════════════════════
// 12 YENİ UZMAN KONU
// ══════════════════════════════════════════════════════════════════

const GENISLETILMIS_TAKIM_2 = [

  // ─── 1. İNTERNET ARAŞTIRMA (Web gezme, gerçek zamanlı bilgi) ──
  {
    konu_kodu: 'IA', konu_adi: 'İnternet Araştırma ve Web İstihbaratı',
    aciklama:  'Web scraping, araştırma, gerçek zamanlı veri toplama, OSINT',
    modeller:  [M.COMMAND_R, M.MISTRAL_N, M.QWEN25],
    ajanlar:   _ajan('IA', 'İnternet Araştırma',
      [M.COMMAND_R, M.MISTRAL_N, M.QWEN25],
      ['web_arama', 'serp_analiz', 'osint', 'kaynak_dogrulama', 'web_scraping',
       'icerik_ozet', 'makale_analiz', 'trend_tespiti', 'otonom_tarama', 'gercek_zamanli_veri']),
  },

  // ─── 2. MODA VE STİLİSTİK ─────────────────────────────────────
  {
    konu_kodu: 'MS', konu_adi: 'Moda Stilistik ve Tekstil Tasarımı',
    aciklama:  'Moda trendleri, stilistik analiz, tekstil uzmanlığı',
    modeller:  [M.GPT20B, M.COMMAND_R, M.MISTRAL_N],
    ajanlar:   _ajan('MS', 'Moda ve Stilistik',
      [M.GPT20B, M.COMMAND_R, M.MISTRAL_N],
      ['trend_analizi', 'renk_teorisi', 'tekstil_analizi', 'sezon_koleksiyon',
       'hedef_kitle_stili', 'marka_kimlik', 'gorsel_analiz', 'stil_rehberi',
       'malzeme_secimi', 'rakip_moda_analiz']),
  },

  // ─── 3. ÜLKE BAZLI İZLEME VE PAZAR ANALİZİ ───────────────────
  {
    konu_kodu: 'UI', konu_adi: 'Ülke Bazlı Pazar İzleme ve İstihbarat',
    aciklama:  'Her ülkeye özel tüketici davranışı, rekabet, mevzuat izleme',
    modeller:  [M.GPT20B, M.PHI4, M.COMMAND_R],
    ajanlar:   _ajan('UI', 'Ülke Pazar İzleme',
      [M.GPT20B, M.PHI4, M.COMMAND_R],
      ['tr_pazar', 'eu_pazar', 'us_pazar', 'me_pazar', 'rakip_izleme',
       'mevzuat_takip', 'kur_etkisi', 'ulusal_trend', 'ithalat_ihracat', 'bolgesel_fiyat']),
  },

  // ─── 4. ÇOK DİLLİ İLETİŞİM ───────────────────────────────────
  {
    konu_kodu: 'CD', konu_adi: 'Çok Dilli İletişim ve Lokalleştirme',
    aciklama:  'Çeviri, yerelleştirme, kültürel adaptasyon, çok dilli içerik',
    modeller:  [M.MISTRAL_N, M.QWEN25, M.COMMAND_R],
    ajanlar:   _ajan('CD', 'Çok Dilli İletişim',
      [M.MISTRAL_N, M.QWEN25, M.COMMAND_R],
      ['turkce', 'ingilizce', 'arapca', 'almanca', 'fransizca',
       'yerellestime', 'kulturel_adaptasyon', 'ceviri_kalite', 'dil_tespiti', 'cok_dilli_icerik']),
  },

  // ─── 5. VERİ BİLİMİ VE ANALİTİK ──────────────────────────────
  {
    konu_kodu: 'VB', konu_adi: 'Veri Bilimi ve İleri Analitik',
    aciklama:  'İstatistik, veri görselleştirme, tahminsel analiz, BI',
    modeller:  [M.DEEPSEEK, M.PHI4, M.GEMMA2],
    ajanlar:   _ajan('VB', 'Veri Bilimi',
      [M.DEEPSEEK, M.PHI4, M.GEMMA2],
      ['istatistik', 'veri_gorsellestirme', 'tahminsel_analiz', 'bi_raporlama',
       'pandas', 'numpy', 'matplotlib', 'power_bi', 'tableau', 'cohort_analiz']),
  },

  // ─── 6. VERİ İŞLEME VE ETL ────────────────────────────────────
  {
    konu_kodu: 'VI', konu_adi: 'Veri İşleme ve ETL Pipeline',
    aciklama:  'Veri temizleme, dönüştürme, yükleme, pipeline tasarımı',
    modeller:  [M.DEEPSEEK_C, M.QWEN25_CO, M.LLAMA31],
    ajanlar:   _ajan('VI', 'Veri İşleme ETL',
      [M.DEEPSEEK_C, M.QWEN25_CO, M.LLAMA31],
      ['etl_tasarimi', 'veri_temizleme', 'data_validation', 'apache_spark',
       'airflow', 'veri_donusturme', 'schema_mapping', 'veri_kalite', 'batch_isleme', 'stream_isleme']),
  },

  // ─── 7. ARŞİV VE BELGE YÖNETİMİ ──────────────────────────────
  {
    konu_kodu: 'AR', konu_adi: 'Arşiv ve Kurumsal Belge Yönetimi',
    aciklama:  'Dijital arşiv, belge sınıflandırma, metadata, DMS',
    modeller:  [M.LLAMA31, M.MISTRAL, M.GEMMA_7B],
    ajanlar:   _ajan('AR', 'Arşiv ve Belge',
      [M.LLAMA31, M.MISTRAL, M.GEMMA_7B],
      ['dijital_arsiv', 'belge_siniflandirma', 'metadata_yonetimi', 'dms',
       'versiyon_kontrol', 'arama_indeksleme', 'arşiv_migrasyon', 'retention_policy', 'belge_ocr', 'icerik_katalog']),
  },

  // ─── 8. YÖNETİCİ ASİSTANI ─────────────────────────────────────
  {
    konu_kodu: 'YA', konu_adi: 'Yönetici Asistanı ve İş Koordinasyonu',
    aciklama:  'Toplantı yönetimi, takvim, görev takibi, raporlama',
    modeller:  [M.PHI4, M.COMMAND_R, M.LLAMA31],
    ajanlar:   _ajan('YA', 'Yönetici Asistanı',
      [M.PHI4, M.COMMAND_R, M.LLAMA31],
      ['takvim_yonetimi', 'toplanti_ozet', 'gorev_takip', 'oncelik_sirasi',
       'email_yonetimi', 'rapor_ozet', 'iletisim_koordinasyon', 'deadline_takip', 'ajanda_hazirlama', 'okr_takip']),
  },

  // ─── 9. GÖZLEM VE MONİTÖRİNG ──────────────────────────────────
  {
    konu_kodu: 'GZ', konu_adi: 'Sistem Gözlem ve Operasyonel İzleme',
    aciklama:  'Sistem sağlığı, anomali tespiti, alert, performans izleme',
    modeller:  [M.PHI4, M.DEEPSEEK, M.LLAMA31],
    ajanlar:   _ajan('GZ', 'Gözlem ve Monitöring',
      [M.PHI4, M.DEEPSEEK, M.LLAMA31],
      ['sistem_sagligi', 'anomali_tespiti', 'alert_yonetimi', 'performans_izleme',
       'log_analiz', 'uptime_monitoring', 'kaynak_kullanimi', 'threshold_yonetimi', 'escalation', 'dashboard']),
  },

  // ─── 10. PAZAR ARAŞTIRMA VE İSTİHBARAT ───────────────────────
  {
    konu_kodu: 'PA', konu_adi: 'Pazar Araştırma ve Rekabet İstihbaratı',
    aciklama:  'Rakip analizi, pazar segmentasyonu, trend öngörüsü',
    modeller:  [M.GPT20B, M.MISTRAL_N, M.QWEN35],
    ajanlar:   _ajan('PA', 'Pazar Araştırma',
      [M.GPT20B, M.MISTRAL_N, M.QWEN35],
      ['rakip_analiz', 'pazar_segmentasyon', 'musteri_analiz', 'tam_analiz',
       'trend_ongoru', 'fiyat_karsilastirma', 'pazar_buyuklugu', 'swot', 'porter_analiz', 'musteri_yorumu_analiz']),
  },

  // ─── 11. TASARIM VE GÖRSELLEŞTİRME ───────────────────────────
  {
    konu_kodu: 'TG', konu_adi: 'Tasarım ve Görsel İletişim',
    aciklama:  'UI tasarımı, görsel içerik, marka kimliği, görsel analiz',
    modeller:  [M.LLAVA_V, M.MINICPM, M.LLAVA],
    ajanlar:   _ajan('TG', 'Tasarım ve Görselleştirme',
      [M.LLAVA_V, M.MINICPM, M.LLAVA],
      ['ui_tasarimi', 'gorsel_icerik', 'marka_kimlik', 'renk_paleti',
       'tipografi', 'logo_analiz', 'infografik', 'gorsel_hiyerarsi', 'promot_tasarim', 'gorsel_uyum']),
  },

  // ─── 12. ÇOKLU ÜLKE MODELİSTLİĞİ / STİL İSTİHBARATI ──────────
  {
    konu_kodu: 'CM', konu_adi: 'Çoklu Ülke Stil ve Moda İstihbaratı',
    aciklama:  'Her ülkeye özel moda trendleri, stil rehberi, kültürel Uyum',
    modeller:  [M.GPT20B, M.COMMAND_R, M.PHI4],
    ajanlar:   _ajan('CM', 'Çoklu Ülke Moda',
      [M.GPT20B, M.COMMAND_R, M.PHI4],
      ['tr_moda', 'eu_moda', 'us_moda', 'me_moda', 'asya_moda',
       'kulturel_stil', 'yerel_trend', 'sezon_analiz', 'renk_trendi', 'hedef_kitle_profil']),
  },
];

// ── DOĞRULAMA ─────────────────────────────────────────────────────
for (const k of GENISLETILMIS_TAKIM_2) {
  const benzersiz = [...new Set(k.modeller)];
  if (benzersiz.length < 3) throw new Error(`[GT2-004] ${k.konu_kodu}: Min 3 farklı model şartı sağlanamadı.`);
}

const TUM_GT2_AJANLAR = GENISLETILMIS_TAKIM_2.flatMap(k => k.ajanlar);

console.log(`[GT2] ${GENISLETILMIS_TAKIM_2.length} konu × 10 ajan = ${TUM_GT2_AJANLAR.length} yeni uzman birim`);
console.log(`[GT2] Yeni takımlar: ${GENISLETILMIS_TAKIM_2.map(k => k.konu_kodu).join(', ')}`);

module.exports = { GENISLETILMIS_TAKIM_2, TUM_GT2_AJANLAR };
