// ============================================================
// ESKİ AJAN → YENİ KADRO EŞLEŞTİRME KÖPRÜSÜ
// ============================================================
// Eski 15 ajan silinmedi — becerilerine göre 160 kişilik
// yeni kadrodaki uygun takıma atandı.
//
// Eski ID → Yeni Takım eşleştirmesi burada tanımlıdır.
// Frontend, Dispatcher ve test dosyaları eski ID kullandığında
// bu köprü üzerinden yeni kadroyla iletişim kurar.
// ============================================================

const ESKI_YENI_ESLESTIRME = Object.freeze({
  // ══════════════════════════════════════════════════════════
  // KOMUTA KADROSU (K SERİSİ) → Yapım Öncesi Takımlar
  // ══════════════════════════════════════════════════════════
  'K-1': { eski_isim: 'Stratejist/Komutan', yeni_takim: 'GA', yeni_takim_adi: 'Gereksinim Analizi', sebep: 'Görev analizi, kapsam, onay/red' },
  'K-2': { eski_isim: 'Kurmay/Analist', yeni_takim: 'ZP', yeni_takim_adi: 'Zaman Planlaması', sebep: 'Planlama, kaynak tahsis, koordinasyon' },
  'K-3': { eski_isim: 'İstihbarat', yeni_takim: 'RA', yeni_takim_adi: 'Risk Analizi', sebep: 'Tehdit tespiti, anomali, durum analizi' },
  'K-4': { eski_isim: 'Muhafız', yeni_takim: 'GT', yeni_takim_adi: 'Güvenlik Tasarımı', sebep: 'Güvenlik denetimi, erişim kontrolü' },

  // ══════════════════════════════════════════════════════════
  // L1 İCRA KATMANI (A SERİSİ) → İnşa + Tasarım Takımları
  // ══════════════════════════════════════════════════════════
  'A-01': { eski_isim: 'İcracı-Frontend', yeni_takim: 'UX', yeni_takim_adi: 'Kullanıcı Deneyimi (UI/UX)', sebep: 'React, Next.js, bileşen tasarımı' },
  'A-02': { eski_isim: 'İcracı-Backend', yeni_takim: 'AP', yeni_takim_adi: 'API Tasarımı', sebep: 'API route, REST, middleware' },
  'A-03': { eski_isim: 'İcracı-DB', yeni_takim: 'VM', yeni_takim_adi: 'Veri Modelleme', sebep: 'Supabase, SQL, migration, RLS' },
  'A-04': { eski_isim: 'İcracı-Bot (Telegram)', yeni_takim: 'EN', yeni_takim_adi: 'Entegrasyon', sebep: 'Telegram Bot API, webhook, mesajlaşma' },
  'A-05': { eski_isim: 'İcracı-Test', yeni_takim: 'TE', yeni_takim_adi: 'Test Stratejisi', sebep: 'Vitest, unit test, integration test' },
  'A-06': { eski_isim: 'İcracı-Güvenlik', yeni_takim: 'ST', yeni_takim_adi: 'Güvenlik Testi (Sızma Testi)', sebep: 'Güvenlik açığı, RLS, JWT, sızma' },
  'A-07': { eski_isim: 'İcracı-AI', yeni_takim: 'TS', yeni_takim_adi: 'Teknoloji Seçimi', sebep: 'Ollama, model seçimi, AI entegrasyon' },
  'A-08': { eski_isim: 'İcracı-Data', yeni_takim: 'VA', yeni_takim_adi: 'Veri Akışı ve İşleme', sebep: 'Veri dönüşüm, format, raporlama' },
  'A-09': { eski_isim: 'İcracı-Infra', yeni_takim: 'AT', yeni_takim_adi: 'Altyapı Tasarımı', sebep: 'Config, env, deployment, CDN' },
  'A-10': { eski_isim: 'İcracı-Akış', yeni_takim: 'DO', yeni_takim_adi: 'DevOps / CI-CD', sebep: 'Workflow, cron, pipeline, otomasyon' },

  // ══════════════════════════════════════════════════════════
  // L2 DENETİM KATMANI (B SERİSİ) → Doğrulama Takımları
  // ══════════════════════════════════════════════════════════
  'B-01': { eski_isim: 'Denetçi-Kod', yeni_takim: 'KK', yeni_takim_adi: 'Kod Kalitesi ve Standartlar', sebep: 'Kod inceleme, 5 eksen denetim' },
  'B-02': { eski_isim: 'Denetçi-Doğrula', yeni_takim: 'TE', yeni_takim_adi: 'Test Stratejisi', sebep: 'Fonksiyonel doğrulama, test sonuçları' },
  'B-03': { eski_isim: 'Denetçi-Güvenlik', yeni_takim: 'ST', yeni_takim_adi: 'Güvenlik Testi (Sızma Testi)', sebep: 'OWASP, XSS, injection denetimi' },
  'B-04': { eski_isim: 'Denetçi-Performans', yeni_takim: 'PO', yeni_takim_adi: 'Performans ve Ölçeklendirme', sebep: 'Response time, bundle, darboğaz' },
  'B-05': { eski_isim: 'Denetçi-Veri', yeni_takim: 'VA', yeni_takim_adi: 'Veri Akışı ve İşleme', sebep: 'Veri bütünlüğü, null, duplicate' },
  'B-06': { eski_isim: 'Denetçi-UX', yeni_takim: 'ER', yeni_takim_adi: 'Erişilebilirlik', sebep: 'a11y, mobil uyum, boş state' },

  // ══════════════════════════════════════════════════════════
  // L3 HAKEM KATMANI (C SERİSİ) → Denetim Takımları
  // ══════════════════════════════════════════════════════════
  'C-01': { eski_isim: 'Hakem-1', yeni_takim: 'SD', yeni_takim_adi: 'Sistem Denetimi ve Kontrol', sebep: 'Çelişki çözümü, nihai karar, konsensüs' },
  'C-02': { eski_isim: 'Hakem-2 (Mimari)', yeni_takim: 'MT', yeni_takim_adi: 'Mimari Tasarım', sebep: 'Mimari karar, teknik borç analizi' },

  // ══════════════════════════════════════════════════════════
  // DESTEK KATMANI (D SERİSİ) → Yaşatma Takımları
  // ══════════════════════════════════════════════════════════
  'D-01': { eski_isim: 'Mühürdar', yeni_takim: 'SD', yeni_takim_adi: 'Sistem Denetimi ve Kontrol', sebep: 'SHA-256, audit zinciri, mühürleme' },
  'D-02': { eski_isim: 'Otomasyon', yeni_takim: 'OP', yeni_takim_adi: 'Operasyon (Çalıştırma)', sebep: 'Cron, webhook, batch işlem' },
  'D-09': { eski_isim: 'Analist', yeni_takim: 'CI', yeni_takim_adi: 'Canlı İzleme ve Alarm', sebep: 'Trend, KPI, veri analizi' },
  'D-10': { eski_isim: 'Planlayıcı', yeni_takim: 'ZP', yeni_takim_adi: 'Zaman Planlaması', sebep: 'Proje planı, timeline, önceliklendirme' },

  // ══════════════════════════════════════════════════════════
  // STP ÖZEL AJANLAR (ANTI, IVDE, CNTRL)
  // ══════════════════════════════════════════════════════════
  'ANTI-01': { eski_isim: 'ANTI-A1', yeni_takim: 'HY', yeni_takim_adi: 'Hata Yönetimi ve Kurtarma', sebep: 'Aritmetik doğruluk, hata yakalama' },
  'ANTI-02': { eski_isim: 'ANTI-A2', yeni_takim: 'HY', yeni_takim_adi: 'Hata Yönetimi ve Kurtarma', sebep: 'Aritmetik doğruluk, hata yakalama' },
  'IVDE-01': { eski_isim: 'IVDE-C1', yeni_takim: 'HY', yeni_takim_adi: 'Hata Yönetimi ve Kurtarma', sebep: 'Codex hesaplama, deterministik sonuç' },
  'IVDE-02': { eski_isim: 'IVDE-C2', yeni_takim: 'HY', yeni_takim_adi: 'Hata Yönetimi ve Kurtarma', sebep: 'Codex hesaplama, deterministik sonuç' },
  'CNTRL-01': { eski_isim: 'Kontrol-1', yeni_takim: 'SD', yeni_takim_adi: 'Sistem Denetimi ve Kontrol', sebep: 'Sonuç doğrulama, KABUL/RED' },
  'CNTRL-02': { eski_isim: 'Kontrol-2', yeni_takim: 'SD', yeni_takim_adi: 'Sistem Denetimi ve Kontrol', sebep: 'Sonuç doğrulama, KABUL/RED' },
  'CNTRL-03': { eski_isim: 'Kontrol-3', yeni_takim: 'SD', yeni_takim_adi: 'Sistem Denetimi ve Kontrol', sebep: 'Sonuç doğrulama, KABUL/RED' },
  'CNTRL-04': { eski_isim: 'Kontrol-4', yeni_takim: 'SD', yeni_takim_adi: 'Sistem Denetimi ve Kontrol', sebep: 'Sonuç doğrulama, KABUL/RED' },

  // ══════════════════════════════════════════════════════════
  // ESKİ PLANLAMA MOTORLARI (L SERİSİ)
  // ══════════════════════════════════════════════════════════
  'L-1': { eski_isim: 'Hata Ayıklayıcı', yeni_takim: 'HT', yeni_takim_adi: 'Hata Tespiti ve Teşhis', sebep: 'Debugging, bug tespiti' },
  'L-2': { eski_isim: 'Sistem Denetçisi', yeni_takim: 'SD', yeni_takim_adi: 'Sistem Denetimi ve Kontrol', sebep: 'Nizam uygunluk kontrolü' },
  'L-3': { eski_isim: 'Güvenlik Denetçisi', yeni_takim: 'ST', yeni_takim_adi: 'Güvenlik Testi (Sızma Testi)', sebep: 'Sızma testi, zafiyet tarama' },
  'L-4': { eski_isim: 'Performans Optimizatörü', yeni_takim: 'PO', yeni_takim_adi: 'Performans ve Ölçeklendirme', sebep: 'Hız, kaynak optimizasyonu' },

  // ══════════════════════════════════════════════════════════
  // ESKİ ARŞİV (G SERİSİ)
  // ══════════════════════════════════════════════════════════
  'G-8': { eski_isim: 'Arşiv Uzmanı', yeni_takim: 'DK', yeni_takim_adi: 'Dokümantasyon', sebep: 'Loglama, belgeleme, mühürleme' },
});

/**
 * Eski ajan ID'sini yeni takım koduna çevirir.
 * @param {string} eskiId - Eski ajan ID'si (ör: 'K-1', 'A-03')
 * @returns {{ yeni_takim: string, yeni_ajan_id: string } | null}
 */
function eskidenYeniye(eskiId) {
  const eslestirme = ESKI_YENI_ESLESTIRME[eskiId];
  if (!eslestirme) return null;
  return {
    eski_id: eskiId,
    eski_isim: eslestirme.eski_isim,
    yeni_takim: eslestirme.yeni_takim,
    yeni_takim_adi: eslestirme.yeni_takim_adi,
    yeni_ajan_id: eslestirme.yeni_takim + '-01', // Takımın komutanına yönlendir
    sebep: eslestirme.sebep,
  };
}

/**
 * Eski ID geldiğinde otomatik olarak yeni ID'ye çevirir.
 * Yeni ID gelirse olduğu gibi döndürür.
 * @param {string} ajanId
 * @returns {string} - Yeni formatta ajan ID
 */
function idNormalize(ajanId) {
  const eslestirme = ESKI_YENI_ESLESTIRME[ajanId];
  if (eslestirme) return eslestirme.yeni_takim + '-01';
  return ajanId; // Zaten yeni formatta
}

module.exports = {
  ESKI_YENI_ESLESTIRME,
  eskidenYeniye,
  idNormalize,
};
