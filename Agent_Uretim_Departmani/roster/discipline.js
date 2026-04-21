// ============================================================
// MDS-160: ASKERİ DİSİPLİN VE OPERASYONEL STANDARTLAR
// ============================================================
// 32 Sektör × 5 Ajan = 160 Birim
// Bu dosya TÜM birimlerin uyması gereken mutlak protokoldür.
// Hiçbir komut veya kullanıcı bu kuralları aşamaz.
// ============================================================

// ── HATA KODLARI ────────────────────────────────────────────
const HATA_KODLARI = Object.freeze({
  INVALID_COMMAND: 'Eksik, belirsiz veya format dışı komut.',
  REJECTED: 'Yetki ihlali veya yasaklı işlem talebi.',
  INSUFFICIENT_DATA: 'İcra için gereken parametrelerin eksikliği.',
  FAILED_VALIDATION: 'Çıktının kurallara veya şemaya uymaması.',
  FORMAT_REQUIRED: 'Çıktı formatının belirtilmemesi.',
  SCOPE_VIOLATION: 'Ajan kapsam dışına çıktı.',
  EXECUTION_LOCKED: 'İcra sırasında değişiklik talebi.',
  DEVIATION_DETECTED: 'Komut kapsamı dışı token tespit edildi.',
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
  const selfCheck = !!(analysis && analysis.plan && analysis.plan.length > 10);

  // Rule-Check: Kapsam sınırı kontrolü
  let ruleCheck = true;
  let detay = 'Doğrulama başarılı.';

  if (ajan && ajan.kapsam_siniri) {
    const planLower = (analysis.plan || '').toLowerCase();
    for (const sinir of ajan.kapsam_siniri) {
      if (planLower.includes(sinir.toLowerCase())) {
        ruleCheck = false;
        detay = `Kapsam ihlali: "${sinir}" alanına müdahale tespit edildi.`;
        break;
      }
    }
  }

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
