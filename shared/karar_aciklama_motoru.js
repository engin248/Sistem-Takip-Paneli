// ============================================================
// shared/karar_aciklama_motoru.js
// KARAR AÇIKLAMA MOTORU (Algoritma Şeffaflık Katmanı)
// ============================================================
// Her algoritmanın sonunda çalışır.
// Soru: "Bu karar neden verildi? Başka ne olabilirdi?"
// Kara kutu yok. Her karar insan diline çevrilir.
//
// HermAI ENTEGRASYONU (Sadi Evren Şeker, YBS Ansiklopedi 2025):
// Karar açıklamaları HermAI İlke 2 (MİKRO açıklama) formatında üretilir.
// AI çağrıları aiOrchestrator.chat() ile yapıldığından
// HermAI Üfuk Bloğu (İlke 1) otomatik enjekte edilir.
// ============================================================

'use strict';

const AI = require('./aiOrchestrator');
const { hermAiTekKarar } = require('./hermai_mimarisi');

// ── AÇIKLAMA KALİTE KONTROL ─────────────────────────────────
const SAHTE_IFADELER = [
  'kesinlikle doğru', 'hatasız', 'mükemmel karar', 'en iyi seçim',
  'şüphe yok', 'garanti', 'asla yanlış olmaz',
];

function aciklamaKaliteKontrol(aciklama) {
  const l = (aciklama || '').toLowerCase();
  const ihlaller = SAHTE_IFADELER.filter(s => l.includes(s));
  return { gecerli: ihlaller.length === 0, ihlaller };
}

// ── TEK KARAR AÇIKLAMA ──────────────────────────────────────
/**
 * Bir algoritmanın kararını AI ile açıklar.
 * @param {string} algoId   - "A-01", "A-07" vb.
 * @param {Object} karar    - { sonuc, puan, neden }
 * @param {Object} girdi    - Algoritmaya giren veri
 * @param {string} baglamKonu - İşlenen görev/konu
 * @returns {Promise<Object>} açıklama raporu
 */
async function kararAcikla(algoId, karar, girdi, baglamKonu) {
  const ALGO_TANIMLARI = {
    'A-01': 'Görev giriş filtresi — PDP-44 ile içerik doğrular',
    'A-02': 'G-2 Rotalama — görevi doğru takıma yönlendirir',
    'A-03': 'Alan bağımsızlık kontrolü — ajan kendi alanında mı?',
    'A-04': 'Alternatif sayısı kontrolü — yeterli seçenek var mı?',
    'A-05': 'Tez/Antitez denge kontrolü — tartışma dengeli mi?',
    'A-06': 'Hakem puanlama matrisi — kriter puanı yeterli mi?',
    'A-07': 'Ağırlıklı sentez — tüm puanlar birleştiriliyor',
    'A-08': 'Proje plan doğrulama — zorunlu alanlar var mı?',
    'A-09': 'Teknoloji seçim matrisi — seçimler gerekçeli mi?',
    'A-10': 'Operasyon plan uyumu — fazlar hedefe uygun mu?',
    'A-11': 'Sapma dedektörü — plan dışına çıkıldı mı?',
    'A-12': 'Bağımsız doğrulama — sonuç güvenilir mi?',
    'A-13': 'Uzman panel toplayıcı — uzman oyları sonucu',
    'A-14': 'Final onay kapısı — 8 kapıdan geçildi mi?',
    'A-15': 'Audit iz yazıcı — değiştirilemez kayıt',
  };

  const algoTanim = ALGO_TANIMLARI[algoId] || algoId;

  const sistem = `Sen AI Karar Açıklayıcısısın. Bir algoritmanın kararını şeffaf olarak açıkla.
EDK-25 Kural 16: Belirsizliği gizleme. Kural 3.3: Yalan yasak. Kural 3.5: Yapılmayan işi yapılmış gösterme yasak.

ÇIKTI ZORUNLU FORMATI (bu formatı AYNEN kullan):
---
[KARAR_ÖZETI]: {PASS/FAIL/WARN} — Tek cümle
[NEDEN_BU_KARAR]:
  • Girdi şunu gösterdi: ...
  • Algoritma şu kural/eşiği uyguladı: ...
  • Bu nedenle {PASS/FAIL} çıktı: ...
[ALTERNATİF_NE_OLURDU]: Eğer şu girilseydi — farklı karar çıkardı: ...
[DOĞRU_OLAN]: Net bir cümle — Bu noktada doğru olan şudur: ...
[BELİRSİZLİK]: (varsa) Algoritmanın emin olmadığı: ... / (yoksa) Belirsizlik tespit edilmedi.
[GÜVEN]: 0-100 (Bu açıklamanın kendi güven skoru)
---`;

  try {
    const r = await AI.chat(
      `ALGORİTMA: ${algoId} — ${algoTanim}\nKARAR: ${karar.sonuc} | Puan: ${karar.puan}/100\nSEBEP: ${karar.neden}\nGİRDİ: ${JSON.stringify(girdi || {}).substring(0, 200)}\nBAĞLAM: "${(baglamKonu || '').substring(0, 100)}"`,
      sistem, { temperature: 0.1, gorevKonu: baglamKonu || algoId } // HermAI üfuk taşınır
    );
    const aciklamaMetni = r.content || r;

    // Kalite kontrol
    const kalite = aciklamaKaliteKontrol(aciklamaMetni);
    if (!kalite.gecerli) {
      return {
        algo_id: algoId, karar: karar.sonuc, puan: karar.puan,
        aciklama: '[UYARI: Sahte kesinlik tespit edildi] ' + aciklamaMetni,
        ihlaller: kalite.ihlaller, guven: 30,
      };
    }

    return {
      algo_id:  algoId,
      karar:    karar.sonuc,
      puan:     karar.puan,
      aciklama: aciklamaMetni,
      ihlaller: [],
      guven:    90,
    };
  } catch (e) {
    return {
      algo_id:  algoId,
      karar:    karar.sonuc,
      puan:     karar.puan,
      aciklama: `[AÇIKLAMA HATASI] ${e.message}\n[DOĞRU_OLAN]: Karar şu gerekçeyle alındı: ${karar.neden}`,
      ihlaller: [],
      guven:    20,
    };
  }
}

// ── TÜM PIPELINE AÇIKLAMA ───────────────────────────────────
/**
 * 15 algoritmanın tamamını açıklar (paralel + sıralı seçenek)
 * @param {Object} kararSeti   - planlamaAlgoritmaPipeline çıktısı
 * @param {string} baglamKonu  - Görev konusu
 * @param {Object} girdiler    - Orijinal girdiler
 * @returns {Promise<Object>}  - Tüm açıklamalar
 */
async function tumPipelineAcikla(kararSeti, baglamKonu, girdiler = {}) {
  const baslangic = Date.now();
  const aciklamalar = {};

  // Her algoritmayı sırayla açıkla
  for (const [algoKey, karar] of Object.entries(kararSeti)) {
    const algoId = algoKey.toUpperCase().replace('_', '-');
    aciklamalar[algoKey] = await kararAcikla(algoId, karar, girdiler[algoKey] || {}, baglamKonu);
  }

  return {
    konu:        baglamKonu,
    aciklamalar,
    toplam:      Object.keys(aciklamalar).length,
    sure_ms:     Date.now() - baslangic,
    onem_notu:   'Bu açıklamalar algoritmik kararların AI tarafından yorumlanmasıdır. Kanıtla doğrulanmamış yorumlar [ÇIKIRIM] sınıfındadır.',
  };
}

// ── TEKIL HIZLI AÇIKLAMA ────────────────────────────────────
/**
 * Herhangi bir karar objesi için kısa açıklama
 */
async function hizliAcikla(algoId, sonuc, puan, neden, konu = '') {
  return kararAcikla(algoId, { sonuc, puan, neden }, {}, konu);
}

module.exports = { kararAcikla, tumPipelineAcikla, hizliAcikla, aciklamaKaliteKontrol };
