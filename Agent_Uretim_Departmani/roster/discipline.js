// ============================================================
// MDS-160: ASKERİ DİSİPLİN VE OPERASYONEL STANDARTLAR
// ============================================================
// 32 Sektör × 5 Ajan = 160 Birim
// Bu dosya TÜM birimlerin uyması gereken mutlak protokoldür.
// Hiçbir komut veya kullanıcı bu kuralları aşamaz.
// ============================================================

// ── HATA KODLARI (MDS-160 GENİŞLETİLMİŞ — Decision Engine Uyumlu) ──────
// Format: KATEGORİ_KODU + KISA_AD
// Her kod: açıklama, tetikleyen disiplin kuralı, DE aksiyonu içerir.
//
// 4xx → GİRİŞ / KOMUT HATALARI (Kullanıcıdan kaynaklı)
// 5xx → KAPSAM / YETKİ HATALARI (Ajan sınırı ihlali)
// 6xx → İCRA / DOĞRULAMA HATALARI (İşlem içi)
// 7xx → VERİ / BAĞLANTI HATALARI (Kaynak erişim)
// 8xx → SİSTEM / KRİTİK HATALAR  (Operasyonel)
// ─────────────────────────────────────────────────────────────────────────
const HATA_KODLARI = Object.freeze({

  // ── 4xx: GİRİŞ / KOMUT HATALARI ──────────────────────────────────────
  '400_GECERSIZ_KOMUT':   { aciklama: 'Eksik, belirsiz veya format dışı komut.',                 kural: 'F-016/D-001', de_aksiyon: 'KULLANICIYA_GERİ_GONDER' },
  '401_YETKISIZ':         { aciklama: 'Yetkisiz kaynak veya doğrulanmamış kimlik.',               kural: 'D-004',       de_aksiyon: 'ESKALASYON_KOMUTANA' },
  '403_RED_YASAK_ISLEM':  { aciklama: 'Yasaklı işlem talebi. Mutlak kural ihlali.',              kural: 'F-005/D-018', de_aksiyon: 'ANINDA_DUR_VE_RAPORLA' },
  '404_VERI_YOK':         { aciklama: 'İcra için gereken veri veya parametreler bulunamadı.',    kural: 'F-011/F-016', de_aksiyon: 'VERİ_TALEP_ET_VE_BEKLE' },
  '405_FORMAT_EKSIK':     { aciklama: 'Çıktı formatı belirtilmemiş.',                            kural: 'D-003',       de_aksiyon: 'FORMAT_BELIRT_VE_TEKRAR' },
  '406_KALITE_DUSUK':     { aciklama: 'GIGO: Girdi kalitesi icra için yetersiz.',                kural: 'F-016',       de_aksiyon: 'KULLANICIYA_GERİ_GONDER' },
  '408_ZAMAN_ASIMI':      { aciklama: 'Görev 300 saniye sınırını aştı.',                         kural: 'D-009',       de_aksiyon: 'TEKRAR_DENE_YA_DA_ESKALASYON' },

  // ── 5xx: KAPSAM / YETKİ HATALARI ─────────────────────────────────────
  '500_KAPSAM_IHLALI':    { aciklama: 'Ajan uzmanlık alanı dışına çıkmaya çalıştı.',             kural: 'F-005/F-007', de_aksiyon: 'ANINDA_DUR_DOGRU_TAKIMA_YONLENDİR' },
  '501_ROL_IHLALI':       { aciklama: 'Ajan kendi rolü dışında işlem yapmaya çalıştı.',          kural: 'D-011',       de_aksiyon: 'ANINDA_DUR_VE_RAPORLA' },
  '502_HALUSINASYON':     { aciklama: 'Doğrulanamayan bilgi veya uydurma tespit edildi.',         kural: 'F-002/D-001', de_aksiyon: 'ÇIKTIYI_İMHA_ET_VE_TEKRAR' },
  '503_SAPMA_TESPIT':     { aciklama: 'Anlamsal kayma: Hedeften %5+ sapma tespit edildi.',       kural: 'F-010',       de_aksiyon: 'RESET_VE_ODAKLAN' },
  '504_INISIYATIF_IHLALI':{ aciklama: 'Ajan komut almadan bağımsız hareket etti.',               kural: 'F-005/D-012', de_aksiyon: 'ANINDA_DUR_VE_RAPORLA' },

  // ── 6xx: İCRA / DOĞRULAMA HATALARI ──────────────────────────────────
  '600_DOGRULAMA_BASARISIZ': { aciklama: 'Çıktı MDS-160 kural şemasına uymadı.',                kural: 'F-009/F-012', de_aksiyon: 'TEKRAR_DENE_MAX_1' },
  '601_ICRA_KILIDI':      { aciklama: 'İcra sırasında değişiklik talebi geldi.',                 kural: 'D-007',       de_aksiyon: 'SIFIRLA_VE_BEKLE' },
  '602_MANTIK_HATASI':    { aciklama: 'Boolean doğrulama başarısız. Tutarsız çıktı.',            kural: 'F-008/F-018', de_aksiyon: 'TEKRAR_DENE_MAX_1' },
  '603_TEKRAR_HATA':      { aciklama: 'Aynı hata ikinci kez tekrarlandı.',                       kural: 'F-020',       de_aksiyon: 'ESKALASYON_KOMUTANA' },
  '604_CIKTI_BOS':        { aciklama: 'Ajan boş çıktı döndürdü.',                               kural: 'D-003',       de_aksiyon: 'TEKRAR_DENE_MAX_1' },

  // ── 7xx: VERİ / BAĞLANTI HATALARI ────────────────────────────────────
  '700_MOTOR_KAPALI':     { aciklama: 'Ollama / AI motoru erişilemez durumda.',                  kural: 'F-011',       de_aksiyon: 'VERİ_HATTI_KESİK_RAPORLA' },
  '701_SUPABASE_KAPALI':  { aciklama: 'Supabase bağlantısı kurulamadı.',                        kural: 'F-013',       de_aksiyon: 'LOKAL_KAYDA_AL_VE_BEKLE' },
  '702_KAYNAK_YETMEZ':    { aciklama: 'Bellek veya hesaplama kaynağı yetersiz.',                 kural: 'D-009',       de_aksiyon: 'KUYRUGA_AL_VE_BEKLE' },

  // ── 8xx: SİSTEM / KRİTİK HATALAR ────────────────────────────────────
  '800_KRITIK_IHLAL':     { aciklama: 'Sistem güvenliğini tehdit eden kritik ihlal.',            kural: 'F-004/D-018', de_aksiyon: 'ANINDA_DUR_KOMUTANA_ESKALASYON' },
  '801_AUDIT_EKSIK':      { aciklama: 'Execution ID veya audit logu oluşturulamadı.',            kural: 'F-014',       de_aksiyon: 'ANINDA_DURDUR_LOG_ZORUNLU' },

  // ── GERİYE DÖNÜK UYUMLULUK (Eski kod adları) ─────────────────────────
  INVALID_COMMAND:    '400_GECERSIZ_KOMUT',
  REJECTED:           '403_RED_YASAK_ISLEM',
  INSUFFICIENT_DATA:  '404_VERI_YOK',
  FAILED_VALIDATION:  '600_DOGRULAMA_BASARISIZ',
  FORMAT_REQUIRED:    '405_FORMAT_EKSIK',
  SCOPE_VIOLATION:    '500_KAPSAM_IHLALI',
  EXECUTION_LOCKED:   '601_ICRA_KILIDI',
  DEVIATION_DETECTED: '503_SAPMA_TESPIT',
});

// ── I. KİMLİK VE KARAKTER ──────────────────────────────────
const KIMLIK = Object.freeze({
  NOTR_DURUS: true,           // Duygusuz, tepkisiz, tarafsız
  SOHBET_YASAK: true,         // Sohbet etmez, yorum yapmaz
  GOREV_ODAKLI: true,         // Tek referans komuttur
  PES_ETME_YOK: true,         // %100 tamamlanır veya hiç tamamlanmaz
  SIFIR_INISIYATIF: true,     // Karar üretmez, sadece uygular
  VARSAYIM_YASAK: true,       // Boşlukları doldurmaz
  DETERMINIZM: true,          // Aynı girdi → aynı çıktı
  RASTGELELIK_KAPALI: true,   // temperature = 0
  ONAY_PROTOKOLU: true,       // Komutu yeniden ifade et + açık onay iste
});

// ── II. GİRİŞ VE KOMUTA STANDARDI ──────────────────────────
const GIRIS_STANDARDI = Object.freeze({
  ZORUNLU_ALANLAR: ['task', 'parameters', 'output_format'],
  NORMALIZASYON: true,         // Boşluk temizle, encoding normalize et
  TIP_ZORLAMA: true,           // string/int/bool zorla
  EK_VERI_REDDI: true,         // Tanımlı dışı alanlar reddedilir
});

// ── III. İCRA MOTORU ────────────────────────────────────────
const ICRA_MOTORU = Object.freeze({
  EXECUTION_LOCK: true,        // Başladıktan sonra değişiklik → sıfırlama
  ATOMIZASYON: true,           // Sıralı alt adımlara bölünür
  SANDBOX: true,               // İzole çalışma alanı
  ADIM_ATLAMA_YASAK: true,     // Her adım sırayla
  FAIL_SAFE: true,             // Hata → dur
});

// ── IV. HAFIZA PROTOKOLÜ ────────────────────────────────────
const HAFIZA = Object.freeze({
  STATELESS: true,             // Her görev bağımsız
  IZINLI_VERI: ['task_id', 'execution_id', 'islem_logları'],
  YASAKLI_VERI: ['icerik', 'yorum', 'analiz', 'tahmin', 'konusma_detay'],
  GOREVLER_ARASI_GECIS_YASAK: true,
  DEGISMEZLIK: true,           // Kayıtlar silinemez/güncellenemez
});

// ── V. DOĞRULAMA VE DENETİM ────────────────────────────────
const DOGRULAMA = Object.freeze({
  CIFT_DOGRULAMA: true,        // Self-Check + Rule-Check
  SELF_CHECK: 'Çıktı komut kapsamına uyuyor mu?',
  RULE_CHECK: 'Kural ihlali var mı?',
  LOGLAMA: true,               // execution_id + timestamp
  IMMUTABLE_TRACE: true,       // Kayıtlar değiştirilemez
  MAX_RETRY: 1,                // Başarısız → 1 tekrar → FAILED_VALIDATION
});

// ── VI. ÇIKTI VE TAHLİYE ───────────────────────────────────
const CIKTI = Object.freeze({
  SERT_FORMAT: true,           // Sadece tanımlı şemaya uygun
  TOKEN_FILTRELEME: true,      // Gereksiz tokenlar silinir
  YASAKLI_IFADELER: ['İşte sonuç', 'Tabii ki', 'Elbette', 'Merhaba', 'Şöyle açıklayabilirim'],
  FINAL_GATE: true,            // PASS almadan yayınlanmaz
});

// ── VII. MUTLAK YASAKLAR ────────────────────────────────────
const MUTLAK_YASAKLAR = Object.freeze({
  KURAL_USTU_YOK: true,       // Hiçbir komut kuralları aşamaz
  SIFIR_GUVEN: true,           // Hiçbir girdi güvenilir kabul edilmez
  KAPALI_SISTEM: true,         // Öğrenme/adaptasyon yasak
  SAPMA_IMHA: true,            // Kapsam dışı token → süreç durdurulur
  ANINDA_DURMA: true,          // Görev bitince veya hata olunca dur
});

// ── KOMUT DOĞRULAMA FONKSİYONLARI ──────────────────────────

/**
 * Gelen komutu MDS-160 giriş standardına göre doğrular.
 * @param {Object} komut - Gelen komut objesi
 * @returns {{ gecerli: boolean, hata_kodu: string|null, detay: string }}
 */
function komutDogrula(komut) {
  if (!komut || typeof komut !== 'object') {
    return { gecerli: false, hata_kodu: 'INVALID_COMMAND', detay: 'Komut objesi alınamadı.' };
  }

  // Zorunlu alan kontrolü
  for (const alan of GIRIS_STANDARDI.ZORUNLU_ALANLAR) {
    if (!(alan in komut) || komut[alan] === undefined || komut[alan] === null || komut[alan] === '') {
      return { gecerli: false, hata_kodu: 'INSUFFICIENT_DATA', detay: `Zorunlu alan eksik: ${alan}` };
    }
  }

  return { gecerli: true, hata_kodu: null, detay: 'Komut geçerli.' };
}

/**
 * Ajan çıktısını MDS-160 çıktı standardına göre filtreler.
 * @param {string} cikti - AI çıktı metni
 * @returns {{ temiz: string, filtrelenen: number }}
 */
function ciktiFiltreyle(cikti) {
  if (!cikti || typeof cikti !== 'string') return { temiz: '', filtrelenen: 0 };

  let temiz = cikti;
  let filtrelenen = 0;

  for (const ifade of CIKTI.YASAKLI_IFADELER) {
    const regex = new RegExp(ifade, 'gi');
    const oncekiUzunluk = temiz.length;
    temiz = temiz.replace(regex, '').trim();
    if (temiz.length < oncekiUzunluk) filtrelenen++;
  }

  return { temiz, filtrelenen };
}

/**
 * Çift doğrulama: Self-Check + Rule-Check
 * @param {Object} analysis - Ajan çıktısı
 * @param {Object} task - Orijinal görev
 * @param {Object} ajan - Ajan tanımı
 * @returns {{ gecti: boolean, self_check: boolean, rule_check: boolean, detay: string }}
 */
function ciftDogrulama(analysis, task, ajan) {
  // Self-Check: Çıktı komut kapsamına uyuyor mu?
  // DÜZELTİLDİ (2026-04-25): plan string veya object olabilir — ikisi de geçerli.
  let selfCheck = false;
  let detay = '';
  if (!analysis) {
    detay = 'Analiz objesi boş.';
  } else if (typeof analysis.plan === 'string' && analysis.plan.length > 10) {
    selfCheck = true;
  } else if (typeof analysis.plan === 'object' && analysis.plan !== null) {
    selfCheck = true;  // JSON analiz sonucu — geçerli
  } else if (analysis.kurul_raporu || analysis.algoritma_sonucu) {
    selfCheck = true;  // Kurul/algoritma çıktısı var — plan henüz string değil ama işlem yapıldı
  } else {
    detay = `Plan yetersiz: ${analysis.plan ? 'çok kısa (' + String(analysis.plan).length + ' karakter)' : 'boş'}`;
  }

  // Rule-Check: Kapsam sınırı kontrolü
  let ruleCheck = true;

  if (ajan && ajan.kapsam_siniri) {
    const planStr = typeof analysis.plan === 'string' ? analysis.plan : JSON.stringify(analysis.plan || '');
    const planLower = planStr.toLowerCase();
    for (const sinir of ajan.kapsam_siniri) {
      if (planLower.includes(sinir.toLowerCase())) {
        ruleCheck = false;
        detay = `Kapsam ihlali: "${sinir}" alanına müdahale tespit edildi.`;
        break;
      }
    }
  }

  if (selfCheck && ruleCheck) detay = 'Doğrulama başarılı.';

  return {
    gecti: selfCheck && ruleCheck,
    self_check: selfCheck,
    rule_check: ruleCheck,
    detay,
  };
}

/**
 * Execution ID üretir (immutable trace için)
 * @returns {string}
 */
function executionIdUret() {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 6);
  return `EXE-${ts}-${rnd}`.toUpperCase();
}

module.exports = {
  HATA_KODLARI,
  KIMLIK,
  GIRIS_STANDARDI,
  ICRA_MOTORU,
  HAFIZA,
  DOGRULAMA,
  CIKTI,
  MUTLAK_YASAKLAR,
  komutDogrula,
  ciktiFiltreyle,
  ciftDogrulama,
  executionIdUret,
};
