// ============================================================
// AGENT ÜRETİM DEPARTMANI — BİRLEŞİK KADRO
// ============================================================
// ORİJİNAL: 32 Takım × 5 Ajan = 160 Birim
// ESKİ     : 63 Ajan (legacy_converter)
// RUL      : 4 Yeni Takım × 5 = 20 Ajan (AI, MB, ET, PZ)
// TOPLAM   : 243 Aktif Birim
//
// DİSİPLİN: Sıfır İnisiyatif — Komut dışı hareket yasak
// KAPSAM:   Her ajan SADECE kendi uzmanlık alanında çalışır
// ============================================================

const { DISIPLIN, ASAMALAR, TAKIM_KODLARI } = require('./types');
const { YAPIM_ONCESI } = require('./phase_1_yapim_oncesi');
const { TASARIM }      = require('./phase_2_tasarim');
const { INSA }         = require('./phase_3_insa');
const { DOGRULAMA }    = require('./phase_4_dogrulama');
const { YAYINLAMA }    = require('./phase_5_yayinlama');
const { YASATMA }      = require('./phase_6_yasatma');
const { eskiKadroyuDonustur }             = require('./legacy_converter');
const { kadroyaEnjekte, DAVRANIS_KURALLARI } = require('./discipline_injector');
const { beceriGenislet, beceriGenislemeRaporu } = require('./beceri_genisleme');
const { YENI_TAKIMLAR, MEVCUT_TAKIM_RULLERI }  = require('./yeni_takimlar'); // AI, MB, ET, PZ

// ── ESKİ KADRO DÖNÜŞTÜR ──────────────────────────────────────
const ESKI_KADRO = eskiKadroyuDonustur(); // 63 ajan

// ── BİRLEŞİK KADRO ───────────────────────────────────────────
const HAM_KADRO = [
  ...YAPIM_ONCESI,   // 25 ajan
  ...TASARIM,        // 30 ajan
  ...INSA,           // 30 ajan
  ...DOGRULAMA,      // 20 ajan
  ...YAYINLAMA,      // 15 ajan
  ...YASATMA,        // 40 ajan
  ...ESKI_KADRO,     // 63 ajan
  ...YENI_TAKIMLAR,  // 20 ajan (AI-5, MB-5, ET-5, PZ-5)
];

// ── DİSİPLİN ENJEKSİYONU + BECERİ GENİŞLEME ────────────────
const DISIPLINLI_KADRO = kadroyaEnjekte(HAM_KADRO);
const TAM_KADRO = beceriGenislet(DISIPLINLI_KADRO);
const _genRaporu = beceriGenislemeRaporu(DISIPLINLI_KADRO, TAM_KADRO);
const _genTakim  = Object.keys(_genRaporu).length;
const _genBeceri = Object.values(_genRaporu).reduce((s, t) => s + t.eklenen, 0);

// ── DOĞRULAMA ─────────────────────────────────────────────────
const ORIJINAL_SAYISI = 160;
const ESKI_KADRO_SAYISI = ESKI_KADRO.length;
const RUL_SAYISI = YENI_TAKIMLAR.length; // 20

console.log(`[KADRO] Orijinal: ${ORIJINAL_SAYISI} + Eski: ${ESKI_KADRO_SAYISI} + RUL: ${RUL_SAYISI} = Toplam: ${TAM_KADRO.length}`);
console.log(`[RUL] Aktif yeni takımlar: AI(5) MB(5) ET(5) PZ(5) = ${RUL_SAYISI} ajan`);
console.log(`[BECERİ] ${_genTakim} takıma ${_genBeceri} ek beceri enjekte edildi.`);

// ID benzersizlik kontrolü
const idSet = new Set();
for (const ajan of TAM_KADRO) {
  if (idSet.has(ajan.id)) {
    throw new Error(`[KADRO HATASI] Duplike ID: ${ajan.id}`);
  }
  idSet.add(ajan.id);
}

// Takım sayıları
const takimSayilari = {};
for (const ajan of TAM_KADRO) {
  takimSayilari[ajan.takim_kodu] = (takimSayilari[ajan.takim_kodu] || 0) + 1;
}

// ── ERİŞİM FONKSİYONLARI ─────────────────────────────────────

function tumKadro()             { return TAM_KADRO; }
function takimBul(takimKodu)    { return TAM_KADRO.filter(a => a.takim_kodu === takimKodu); }
function asamaBul(asama)        { return TAM_KADRO.filter(a => a.asama === asama); }
function ajanBul(id)            { return TAM_KADRO.find(a => a.id === id) || null; }
function beceriyeGore(beceri)   { return TAM_KADRO.filter(a => a.beceriler.includes(beceri)); }

function kadroOzet() {
  return {
    toplam_ajan:    TAM_KADRO.length,
    orijinal_kadro: ORIJINAL_SAYISI,
    eski_kadro:     ESKI_KADRO_SAYISI,
    rul_kadro:      RUL_SAYISI,
    toplam_takim:   Object.keys(takimSayilari).length,
    takim_dagilimi: takimSayilari,
    rul_takimlari:  ['AI', 'MB', 'ET', 'PZ'],
    mevcut_takim_rulleri: Object.keys(MEVCUT_TAKIM_RULLERI),
    disiplin:       DISIPLIN,
  };
}

module.exports = {
  TAM_KADRO,
  DISIPLIN,
  DAVRANIS_KURALLARI,
  ASAMALAR,
  TAKIM_KODLARI,
  MEVCUT_TAKIM_RULLERI,
  tumKadro,
  takimBul,
  asamaBul,
  ajanBul,
  beceriyeGore,
  kadroOzet,
};
