// ============================================================
// KURUL MASASI TARTIŞMA MOTORU
// kurul_masasi_motoru.js
// ============================================================
// Her görev için:
//   1. N alternatif üretir
//   2. Her alternatif için ALT KRİTERLER belirler
//   3. Her kriter için:
//      TEZ    → YAPICI ajan savunur (neden iyi)
//      ANTİTEZ → ZINDıK ajan çürütür (neden başarısız olur)
//      HAKEM  → İkisini tartarak puanlar (0-10)
//   4. Tüm kriterler toplanır → NET SKOR
//   5. En yüksek net skoru olan alternatif → FİNAL KARAR
// ============================================================
// AKIŞ:
//   await kurulMasasiTartis(gorev, supabase, log)
//   → { finalKarar, alternatifler, tartisma, sentez }
// ============================================================

'use strict';

const AI  = require('../shared/aiOrchestrator');
const { TAM_KADRO, TAKIM_KODLARI } = require('../Agent_Uretim_Departmani/roster/index.js');
const { hermAiDongusu } = require('../shared/hermai_mimarisi'); // HermAI — Sadi Evren Şeker YBS 2025

// ── SABITLER ─────────────────────────────────────────────────
const MAX_ALT_KRITER  = 5;   // Her alternatif için kaç kriter
const TEZ_ANTITEZ_TIMEOUT_MS = 30000;

// ── DEĞERLENDIRME KRİTER HAVUZU (10 evrensel boyut) ─────────
const EVRENSEL_KRITERLER = Object.freeze([
  { id: 'K01', ad: 'Doğruluk',           aciklama: 'Kanıta dayalı doğruluk oranı'            },
  { id: 'K02', ad: 'Uygulanabilirlik',   aciklama: 'Pratikte hayata geçirilebilirlik'         },
  { id: 'K03', ad: 'Risk',               aciklama: 'Başarısızlık/zarar riski seviyesi'        },
  { id: 'K04', ad: 'Maliyet',            aciklama: 'Kaynak, zaman ve para maliyeti'           },
  { id: 'K05', ad: 'Geri_Alinabilirlik', aciklama: 'Hata olursa geri alınabilir mi?'         },
  { id: 'K06', ad: 'Etki_Alani',         aciklama: 'Kaç sistemi/kişiyi etkiler?'             },
  { id: 'K07', ad: 'Sure',               aciklama: 'Ne kadar sürede tamamlanır?'             },
  { id: 'K08', ad: 'Etik_Uyum',          aciklama: 'Etik ve hukuki uygunluk'                 },
  { id: 'K09', ad: 'Surdurulebilirlik',  aciklama: 'Uzun vadede sürdürülebilir mi?'          },
  { id: 'K10', ad: 'Insan_Yarari',       aciklama: 'İnsan yararına net katkı'                },
]);

// ── AJAN SEÇİCİ ─────────────────────────────────────────────
function ajanSec(rol, takimKodu) {
  // rol: 'yapici'=01, 'zindik'=03, 'hakem'=04
  const sufiks = { yapici: '01', zindik: '03', hakem: '04' }[rol] || '01';
  const ajanId = `${takimKodu}-${sufiks}`;
  const ajan = TAM_KADRO.find(a => a.id === ajanId);
  return ajan || TAM_KADRO.find(a => a.id === `GA-${sufiks}`) || TAM_KADRO[0];
}

// ── JSON PARSE YARDıMCı ─────────────────────────────────────
function jsonCoz(metin) {
  try {
    const m = metin.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    const arr = metin.match(/\[[\s\S]*\]/);
    if (arr) return JSON.parse(arr[0]);
  } catch {}
  return null;
}

// ── AŞAMA 1: ALTERNATİF ÜRET ────────────────────────────────
async function alternatifUret(gorev, log) {
  log('[KURUL][A1] Alternatifler üretiliyor...');

  const sistem = `Sen Kurul Masası Koordinatörüsün.
Verilen göreve/konuya karşı MÜMKÜN OLAN TÜM farklı yaklaşım/alternatifleri üret.
Sabit sayı YASAK — görevin doğasının gerektirdiği kadar alternatif üret. 2 olabilir, 10 olabilir.
Her alternatif birbirinden BAĞIMSIZ ve FARKLI olsun.
Alternatifler arasında en az biri MUHAFAZAKAR (güvenli/mevcut), en az biri RADİKAL (kökten değişim) olsun.

JSON formatında sadece şunu döndür:
{
  "alternatifler": [
    { "id": "A1", "baslik": "...", "ozet": "...", "takim": "GA" },
    { "id": "A2", "baslik": "...", "ozet": "...", "takim": "MT" },
    ...
  ]
}
Yasaklı: Yorumlu açıklama, ek metin, sabit sayı limiti.`;

  try {
    const r = await AI.chat(`KONU/GÖREV: "${gorev.content || gorev.title}"`, sistem, { temperature: 0.7 });
    const veri = jsonCoz(r.content || r);
    if (veri?.alternatifler?.length) {
      log(`[KURUL][A1] ${veri.alternatifler.length} alternatif üretildi.`);
      return veri.alternatifler;
    }
  } catch (e) {
    log(`[KURUL][A1] HATA: ${e.message}`, 'ERROR');
  }

  // Fallback: varsayılan alternatifler
  return [
    { id: 'A1', baslik: 'Mevcut Yöntemi İyileştir',  ozet: 'Var olanı optimize et', takim: 'GA' },
    { id: 'A2', baslik: 'Kökten Yeniden Tasarla',     ozet: 'Sıfırdan yeni yaklaşım', takim: 'MT' },
    { id: 'A3', baslik: 'Hibrit Çözüm',               ozet: 'İkisini kombine et',     takim: 'RA' },
    { id: 'A4', baslik: 'Minimum Etki Yöntemi',       ozet: 'En az riskli yol',       takim: 'GT' },
  ];
}

// ── AŞAMA 2: ALT KRİTER ÜRET ────────────────────────────────
async function altKriterUret(alternatif, gorev, log) {
  log(`[KURUL][A2] ${alternatif.id} için alt kriterler belirleniyor...`);

  const sistem = `Sen Kriter Analisti'sin.
"${alternatif.baslik}" alternatifi için bu konuda değerlendirilmesi gereken ${MAX_ALT_KRITER} spesifik kriter belirle.
Bu kriterler bu alternatife ÖZGÜ olmalı — genel değil.

JSON:
{
  "kriterler": [
    { "id": "K1", "ad": "...", "aciklama": "...", "agirlik": 1-5 },
    ...
  ]
}`;

  try {
    const r = await AI.chat(
      `ALTERNATİF: ${alternatif.baslik}\nGÖREV: ${gorev.content || gorev.title}`,
      sistem, { temperature: 0.4 }
    );
    const veri = jsonCoz(r.content || r);
    if (veri?.kriterler?.length) return veri.kriterler.slice(0, MAX_ALT_KRITER);
  } catch (e) {
    log(`[KURUL][A2] HATA ${alternatif.id}: ${e.message}`, 'WARN');
  }

  // Fallback: evrensel kriterler subset
  return EVRENSEL_KRITERLER.slice(0, MAX_ALT_KRITER).map(k => ({ ...k, agirlik: 3 }));
}

// ── AŞAMA 3A: TEZ (YAPICI) ──────────────────────────────────
async function tezUret(alternatif, kriterler, gorev, log) {
  const ajan = ajanSec('yapici', alternatif.takim || 'GA');
  log(`[KURUL][TEZ] ${alternatif.id} — ${ajan.kod_adi} savunuyor...`);

  const kriterMetni = kriterler.map(k => `- ${k.ad}: ${k.aciklama}`).join('\n');
  const sistem = `Sen "${ajan.kod_adi}" yapıcı ajanısın.
SENİN GÖREVİN: "${alternatif.baslik}" alternatifini HER KRİTER için güçlü şekilde savun.
EDK-25 Kural 3.7: Varsayımı olgu yapma. Kanıta dayan.

Her kriter için TEZ (neden iyi, neden işe yarar, kanıtla) yaz.
JSON:
{
  "tez": [
    { "kriter_id": "K1", "kriter_ad": "...", "arguman": "...", "guc_puani": 1-10, "kanit": "..." },
    ...
  ],
  "genel_sav": "..."
}`;

  try {
    const r = await AI.chat(
      `ALTERNATİF: ${alternatif.baslik}\nKRİTERLER:\n${kriterMetni}\nGÖREV: ${gorev.content || gorev.title}`,
      sistem, { temperature: 0.3, timeout: TEZ_ANTITEZ_TIMEOUT_MS }
    );
    return jsonCoz(r.content || r) || { tez: [], genel_sav: 'Analiz üretilemedi' };
  } catch (e) {
    log(`[KURUL][TEZ] HATA: ${e.message}`, 'WARN');
    return { tez: [], genel_sav: `Hata: ${e.message}` };
  }
}

// ── AŞAMA 3B: ANTİTEZ (ZINDıK — Karşı Ajan) ────────────────
async function antitezUret(alternatif, kriterler, tez, gorev, log) {
  const ajan = ajanSec('zindik', alternatif.takim || 'GA');
  log(`[KURUL][ANTİTEZ] ${alternatif.id} — ${ajan.kod_adi} çürütüyor...`);

  const tezOzet = tez?.tez?.map(t => `${t.kriter_ad}: ${t.arguman}`).join('\n') || 'Tez mevcut değil';

  const sistem = `Sen "${ajan.kod_adi}" ZINDıK ajanısın. Görüşünü yansıtmak değil, ÇÜRÜTMEK görevin.
EDK-25 Kural 3.2: Kanıtsız kesin hüküm yasak.
YAPICININ SAVINI OKU ve her kriter için gerçekçi zayıflıkları, riskleri, başarısızlık senaryolarını bul.
Saçma veya uydurma karşı argüman YASAK — sadece gerçek zayıflıklar.

JSON:
{
  "antitez": [
    { "kriter_id": "K1", "kriter_ad": "...", "itiraz": "...", "zaaf_puani": 1-10, "risk": "..." },
    ...
  ],
  "genel_itiraz": "..."
}`;

  try {
    const r = await AI.chat(
      `ALTERNATİF: ${alternatif.baslik}\nYAPICININ SAVLARı:\n${tezOzet}\nGÖREV: ${gorev.content || gorev.title}`,
      sistem, { temperature: 0.5, timeout: TEZ_ANTITEZ_TIMEOUT_MS }
    );
    return jsonCoz(r.content || r) || { antitez: [], genel_itiraz: 'Analiz üretilemedi' };
  } catch (e) {
    log(`[KURUL][ANTİTEZ] HATA: ${e.message}`, 'WARN');
    return { antitez: [], genel_itiraz: `Hata: ${e.message}` };
  }
}

// ── AŞAMA 4: HAKEM KARARI ───────────────────────────────────
async function hakemKarari(alternatif, kriterler, tez, antitez, log) {
  const ajan = ajanSec('hakem', alternatif.takim || 'GA');
  log(`[KURUL][HAKEM] ${alternatif.id} — ${ajan.kod_adi} puanlıyor...`);

  const tezOzet     = JSON.stringify(tez?.tez || [], null, 2).substring(0, 800);
  const antitezOzet = JSON.stringify(antitez?.antitez || [], null, 2).substring(0, 800);

  const sistem = `Sen "${ajan.kod_adi}" bağımsız HAKEMsin.
EDK-25: Kanıta dayan, taraf tutma, dürüst ol.
YAPICI ve ZINDIğın görüşlerini oku. Her kriter için:
- TEZ güçlü mü? (0-10)
- ANTİTEZ güçlü mü? (0-10)
- NET SKOR = TEZ - ANTİTEZ (eksi olabilir)

JSON:
{
  "puanlar": [
    { "kriter_id": "K1", "kriter_ad": "...", "tez_puani": 0-10, "antitez_puani": 0-10, "net": -10..10, "hakem_notu": "..." },
    ...
  ],
  "toplam_net": -50..50,
  "karar": "GÜÇLÜ/ORTA/ZAYIF/RED",
  "ozet": "..."
}`;

  try {
    const r = await AI.chat(
      `ALTERNATİF: ${alternatif.baslik}\n\nTEZ:\n${tezOzet}\n\nANTİTEZ:\n${antitezOzet}`,
      sistem, { temperature: 0.1 }
    );
    const veri = jsonCoz(r.content || r);
    if (veri) return veri;
  } catch (e) {
    log(`[KURUL][HAKEM] HATA: ${e.message}`, 'WARN');
  }

  // Fallback: orta puan
  return {
    puanlar: kriterler.map(k => ({ kriter_id: k.id, kriter_ad: k.ad, tez_puani: 5, antitez_puani: 5, net: 0, hakem_notu: 'Analiz yapılamadı' })),
    toplam_net: 0,
    karar: 'ORTA',
    ozet: 'Hakem analizi başarısız oldu — fallback orta puan atandı.',
  };
}

// ── AŞAMA 5: SENTEZ — FİNAL KARAR ───────────────────────────
async function sentezUret(gorev, alternatifler, tartismaRaporlari, log) {
  log('[KURUL][SENTEZ] Final sentez üretiliyor...');

  // Her alternatifin toplam net skoru
  const sirali = tartismaRaporlari
    .map(r => ({
      alternatif: r.alternatif,
      toplam_net: r.hakem?.toplam_net || 0,
      hakem_karar: r.hakem?.karar || 'ZAYIF',
      hakem_ozet: r.hakem?.ozet || '',
    }))
    .sort((a, b) => b.toplam_net - a.toplam_net);

  const kazanan = sirali[0];
  const sonuncuYer = sirali[sirali.length - 1];

  const sistem = `Sen Kurul Başkanısın. Tüm tartışmaları değerlendirip FİNAL KARAR ver.
EDK-25: Kanıta dayan. Belirsizliği gizleme. Yalan yasak.

FORMAT:
[FİNAL_KARAR]: ...
[GEREKÇE]: ...
[KOŞUL]: (varsa şartlar)
[RİSK_UYARISI]: ...
[REDDEDİLEN]: (neden reddedildi)`;

  const ozet = sirali.map(s =>
    `${s.alternatif.id} "${s.alternatif.baslik}": Net=${s.toplam_net} Karar=${s.hakem_karar}`
  ).join('\n');

  try {
    const r = await AI.chat(
      `GÖREV: ${gorev.content || gorev.title}\n\nALTERNATİF PUANLAR:\n${ozet}`,
      sistem, { temperature: 0.1 }
    );
    return {
      kazanan,
      son: sonuncuYer,
      sirali,
      final_metin: r.content || r,
      zaman: new Date().toISOString(),
    };
  } catch (e) {
    log(`[KURUL][SENTEZ] HATA: ${e.message}`, 'WARN');
    return { kazanan, sirali, final_metin: `En yüksek skor: ${kazanan.alternatif.baslik} (${kazanan.toplam_net})`, zaman: new Date().toISOString() };
  }
}

// ── ANA MOTOR — kurulMasasiTartis() ─────────────────────────
/**
 * Kurul Masası Tartışma Motoru
 * @param {Object} gorev - { id, content, title, task_code }
 * @param {Object} supabase - Supabase client
 * @param {Function} log - Log fonksiyonu
 * @returns {Promise<Object>} - Tam tartışma raporu
 */
async function kurulMasasiTartis(gorev, supabase, log) {
  const baslangic = Date.now();
  log(`\n${'═'.repeat(60)}`);
  log(`KURUL MASASI TARTIŞMA MOTORU — ${gorev.task_code || 'ADSIZ'}`);
  log(`Konu: "${(gorev.content || gorev.title || '').substring(0, 80)}"`);
  log(`${'═'.repeat(60)}`);

  const rapor = {
    gorev_id:      gorev.id,
    task_code:     gorev.task_code,
    baslangic:     new Date().toISOString(),
    alternatifler: [],
    tartisma:      [],
    sentez:        null,
    finalKarar:    null,
    sure_ms:       0,
  };

  try {
    // ── A1: Alternatifleri üret ───────────────────────────────
    rapor.alternatifler = await alternatifUret(gorev, log);

    // ── A2-A4: Her alternatif için Tez/Antitez/Hakem ─────────
    for (const alt of rapor.alternatifler) {
      log(`\n── Alternatif: ${alt.id} — "${alt.baslik}" ──`);

      const kriterler = await altKriterUret(alt, gorev, log);
      const tez       = await tezUret(alt, kriterler, gorev, log);
      const antitez   = await antitezUret(alt, kriterler, tez, gorev, log);
      const hakem     = await hakemKarari(alt, kriterler, tez, antitez, log);

      const altRapor = {
        alternatif: alt,
        kriterler,
        tez,
        antitez,
        hakem,
        net_skor: hakem.toplam_net || 0,
      };

      rapor.tartisma.push(altRapor);
      log(`[SKOR] ${alt.id} "${alt.baslik}" → Net: ${altRapor.net_skor} | Karar: ${hakem.karar}`);
    }

    // ── A5: Sentez ────────────────────────────────────────────
    rapor.sentez     = await sentezUret(gorev, rapor.alternatifler, rapor.tartisma, log);
    rapor.finalKarar = rapor.sentez?.kazanan?.alternatif?.baslik || 'BELİRSİZ';
    rapor.sure_ms    = Date.now() - baslangic;

    // HermAI DöngüSÜ — Çift Modlu Yorum (YBS Ansiklopedi 2025)
    // Kurul kararlarını Mikro (alternatif bazında) + Makro (genel) yorumlar
    try {
      const kurulKararSeti = {};
      rapor.tartisma.forEach(t => {
        kurulKararSeti[t.alternatif.id] = {
          sonuc: t.hakem?.karar === 'GÜÇLÜ' ? 'PASS' : t.hakem?.karar === 'RED' ? 'FAIL' : 'WARN',
          puan:  Math.max(0, Math.min(100, ((t.net_skor || 0) + 50) * 2)),  // -50..50 → 0..100
          neden: t.hakem?.ozet || t.alternatif.baslik,
        };
      });
      rapor.hermai = await hermAiDongusu(kurulKararSeti, gorev, []);
      log(`[HermAI] Çelişki: ${rapor.hermai?.celiski?.var ? 'VAR ⚠️' : 'YOK ✅'}`);
    } catch (e) {
      rapor.hermai = { hata: e.message };
      log(`[HermAI] HATA: ${e.message}`, 'WARN');
    }

    log(`\n${'═'.repeat(60)}`);
    log(`FİNAL KARAR: "${rapor.finalKarar}" (${rapor.sure_ms}ms)`);
    log(`${'═'.repeat(60)}`);

    // ── Supabase'e kaydet ─────────────────────────────────────
    if (supabase && gorev.id) {
      try {
        await supabase.from('tasks').update({
          status:     'kurul_tamamlandi',
          metadata:   { ...gorev.metadata, kurul_raporu: ozl(rapor), final_karar: rapor.finalKarar },
          updated_at: new Date().toISOString(),
        }).eq('id', gorev.id);
        log('[KURUL] Supabase kaydedildi.');
      } catch (e) {
        log(`[KURUL] Supabase hata: ${e.message}`, 'WARN');
      }
    }

    return rapor;

  } catch (e) {
    log(`[KURUL] KRİTİK HATA: ${e.message}`, 'ERROR');
    rapor.hata   = e.message;
    rapor.sure_ms = Date.now() - baslangic;
    return rapor;
  }
}

/** Supabase için raporu boyut sınırlı özete kısalt */
function ozl(rapor) {
  return {
    finalKarar:    rapor.finalKarar,
    sure_ms:       rapor.sure_ms,
    alternatif_sayisi: rapor.alternatifler.length,
    sirali: rapor.sentez?.sirali?.map(s => ({
      id:    s.alternatif?.id,
      baslik: s.alternatif?.baslik,
      net:   s.toplam_net,
      karar: s.hakem_karar,
    })),
    sentez_ozet: rapor.sentez?.final_metin?.substring(0, 500),
  };
}

module.exports = {
  kurulMasasiTartis,
  alternatifUret,
  altKriterUret,
  tezUret,
  antitezUret,
  hakemKarari,
  sentezUret,
  EVRENSEL_KRITERLER,
};
