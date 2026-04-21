// ============================================================
// AGENT ÜRETİM DEPARTMANI — BİRLEŞİK KADRO (199 BİRİM)
// ============================================================
// YENİ KADRO: 32 Uzmanlık Alanı × 5 Ajan = 160 Birim
// ESKİ KADRO: 39 Ajan (K, A, B, C, D, ANTI, IVDE, CNTRL, L, G)
// TOPLAM:     199 Aktif Birim
//
// AŞAMA 1: YAPIM ÖNCESİ  — 5 takım  = 25 ajan
// AŞAMA 2: TASARIM       — 6 takım  = 30 ajan
// AŞAMA 3: İNŞA          — 6 takım  = 30 ajan
// AŞAMA 4: DOĞRULAMA     — 4 takım  = 20 ajan
// AŞAMA 5: YAYINLAMA     — 3 takım  = 15 ajan
// AŞAMA 6: YAŞATMA       — 8 takım  = 40 ajan
// ENTEGRE: Eski Kadro     — 32 takıma dağılmış = 39 ajan
//
// DİSİPLİN: Sıfır İnisiyatif — Komut dışı hareket yasak
// KAPSAM:   Her ajan SADECE kendi uzmanlık alanında çalışır
// ============================================================

const { DISIPLIN, ASAMALAR, TAKIM_KODLARI } = require('./types');
const { YAPIM_ONCESI } = require('./phase_1_yapim_oncesi');
const { TASARIM } = require('./phase_2_tasarim');
const { INSA } = require('./phase_3_insa');
const { DOGRULAMA } = require('./phase_4_dogrulama');
const { YAYINLAMA } = require('./phase_5_yayinlama');
const { YASATMA } = require('./phase_6_yasatma');
const { eskiKadroyuDonustur } = require('./legacy_converter');

// ── ESKİ KADRO DÖNÜŞTÜR ──────────────────────────────────────
const ESKI_KADRO = eskiKadroyuDonustur(); // 39 ajan

// ── BİRLEŞİK KADRO ──────────────────────────────────────────
const TAM_KADRO = [
  ...YAPIM_ONCESI,   // 25 ajan
  ...TASARIM,        // 30 ajan
  ...INSA,           // 30 ajan
  ...DOGRULAMA,      // 20 ajan
  ...YAYINLAMA,      // 15 ajan
  ...YASATMA,        // 40 ajan
  ...ESKI_KADRO,     // 39 ajan (eski kadro, yeni takımlara entegre)
];

// ── DOĞRULAMA ─────────────────────────────────────────────────
const YENI_KADRO_SAYISI = 160;
const ESKI_KADRO_SAYISI = ESKI_KADRO.length;
const BEKLENEN_TOPLAM = YENI_KADRO_SAYISI + ESKI_KADRO_SAYISI;
console.log(`[KADRO] Yeni: ${YENI_KADRO_SAYISI} + Eski: ${ESKI_KADRO_SAYISI} = Toplam: ${TAM_KADRO.length}`);

if (TAM_KADRO.length !== BEKLENEN_TOPLAM) {
  throw new Error(`[KADRO HATASI] Beklenen: ${BEKLENEN_TOPLAM}, Mevcut: ${TAM_KADRO.length}`);
}

// ID benzersizlik kontrolü
const idSet = new Set();
for (const ajan of TAM_KADRO) {
  if (idSet.has(ajan.id)) {
    throw new Error(`[KADRO HATASI] Duplike ID tespit edildi: ${ajan.id}`);
  }
  idSet.add(ajan.id);
}

// Takım sayıları (eski kadro dahil — artık 5'ten fazla olabilir)
const takimSayilari = {};
for (const ajan of TAM_KADRO) {
  takimSayilari[ajan.takim_kodu] = (takimSayilari[ajan.takim_kodu] || 0) + 1;
}

// ── ERİŞİM FONKSİYONLARI ─────────────────────────────────────

/** Tüm 160 ajanı döndürür */
function tumKadro() {
  return TAM_KADRO;
}

/** Takım koduna göre 5 ajan döndürür */
function takimBul(takimKodu) {
  return TAM_KADRO.filter(a => a.takim_kodu === takimKodu);
}

/** Aşamaya göre ajanları döndürür */
function asamaBul(asama) {
  return TAM_KADRO.filter(a => a.asama === asama);
}

/** ID ile tek ajan döndürür */
function ajanBul(id) {
  return TAM_KADRO.find(a => a.id === id) || null;
}

/** Beceriye göre uygun ajanları döndürür */
function beceriyeGore(beceri) {
  return TAM_KADRO.filter(a => a.beceriler.includes(beceri));
}

/** Kadro özet istatistikleri */
function kadroOzet() {
  return {
    toplam_ajan: TAM_KADRO.length,
    yeni_kadro: YENI_KADRO_SAYISI,
    eski_kadro: ESKI_KADRO_SAYISI,
    toplam_takim: Object.keys(takimSayilari).length,
    takim_dagilimi: takimSayilari,
    asamalar: {
      YAPIM_ONCESI: YAPIM_ONCESI.length,
      TASARIM: TASARIM.length,
      INSA: INSA.length,
      DOGRULAMA: DOGRULAMA.length,
      YAYINLAMA: YAYINLAMA.length,
      YASATMA: YASATMA.length,
      ENTEGRE: ESKI_KADRO.length,
    },
    disiplin: DISIPLIN,
  };
}

module.exports = {
  TAM_KADRO,
  DISIPLIN,
  ASAMALAR,
  TAKIM_KODLARI,
  tumKadro,
  takimBul,
  asamaBul,
  ajanBul,
  beceriyeGore,
  kadroOzet,
};
