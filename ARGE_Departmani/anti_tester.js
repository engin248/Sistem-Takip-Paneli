// ============================================================
// ARGE_Departmani/anti_tester.js
// ANTİ TEST ALGORİTMASI — HER İKİ ALGO'YU ÇÜRÜTÜR
// ============================================================
// YAKLAŞIM: Adversarial / Devil's Advocate
// Ne yapar:
//   → Ampirik algoyu hedef alır: "Veri yanlış okundu mu?"
//   → Teorik algoyu hedef alır:  "Model gerçeği yansıtmıyor"
//   → Sonuçların zayıf noktalarını bulur
//   → Mantık hatalarını tespit eder
//   → İkisinin çeliştiği yerleri işaretler
// ============================================================
// BU DOSYA HİÇBİR ALGO'YA BAĞLI DEĞİL.
// İKİSİNİN ÇIKTISINI ALIR — KENDI KARAR VERMEZ.
// Sadece test eder, zayıflık bulur, rapor verir.
// ============================================================

'use strict';

const AI = require('../shared/aiOrchestrator');

const ANTI_META = Object.freeze({
  ad:       'ANTİ-TEST-ALGORİTMASI',
  versiyon: '1.0',
  yaklasim: 'Adversarial / Devil\'s Advocate / Çürütme',
  mantik:   'Her sonucu karşı kanıtla test et',
  guc:      'Kör noktaları, mantık hatalarını ve çelişkileri bulur',
  zayif:    'Kendisi de yanılabilir — meta-anti gerekebilir',
  kural:    'Uydurma yasak. Sadece gerçek zayıflık, gerçek kanıt.',
});

function jsonCoz(metin) {
  try { const m = (metin||'').match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
  return null;
}

// ── TEST 1: AMPİRİK ALGO'YU ÇÜRÜT ───────────────────────────
async function ampirikCurut(konu, ampirikSonuc, log) {
  log('[ANTİ] Test 1: Ampirik sonuç çürütülüyor...');
  const ampirikOzet = JSON.stringify(ampirikSonuc?.sonuc?.icerik || '').substring(0, 500);

  const sistem = `Sen Adversarial Test Ajanısın. Ampirik araştırmayı çürüt.
Ampirik metodolojinin zayıflıkları: Örneklem hatası, gözlem yanlılığı, korelayon=nedensellik yanılgısı.
Kanıtsız itiraz YASAK. Her eleştirinin somut gerekçesi olmalı.

JSON:
{
  "itirazlar": [
    { "hedef": "Ampirik bulgu", "itiraz": "Bu yanlış çünkü...", "kanit": "...", "agirlik": "KRİTİK/ÖNEMLI/MINOR" }
  ],
  "metodoloji_hatalari": ["..."],
  "gorulmeyen_veriler": ["Ampirik algo bunları görmedi..."],
  "alternatif_yorum": "Aynı veri farklı yorumlanabilir: ...",
  "guvenilirlik_skoru": 0-100
}`;

  try {
    const r = await AI.chat(`KONU: "${konu}"\nAMPİRİK SONUÇ: ${ampirikOzet}`, sistem, { temperature: 0.6 });
    const veri = jsonCoz(r.content || r) || { itirazlar: [], guvenilirlik_skoru: 50 };
    log(`[ANTİ] Ampirik: ${veri.itirazlar?.length || 0} itiraz | Güven: ${veri.guvenilirlik_skoru}/100`);
    return veri;
  } catch (e) { return { itirazlar: [], guvenilirlik_skoru: 50, hata: e.message }; }
}

// ── TEST 2: TEORİK ALGO'YU ÇÜRÜT ────────────────────────────
async function teorikCurut(konu, teorikSonuc, log) {
  log('[ANTİ] Test 2: Teorik sonuç çürütülüyor...');
  const teorikOzet = JSON.stringify(teorikSonuc?.sonuc?.icerik || '').substring(0, 500);

  const sistem = `Sen Adversarial Test Ajanısın. Teorik araştırmayı çürüt.
Teorik metodolojinin zayıflıkları: Gerçek dünyadan kopukluk, model=gerçek yanılgısı, varsayım katmanlama.
Kanıtsız itiraz YASAK.

JSON:
{
  "itirazlar": [
    { "hedef": "Teorik iddia", "itiraz": "Gerçekte olmaz çünkü...", "kanit": "...", "agirlik": "KRİTİK/ÖNEMLI/MINOR" }
  ],
  "yanlis_varsayimlar": ["Teori şunu varsaydı ama bu yanlış: ..."],
  "gerceklik_kopuklugu": ["Teoride çalışır ama pratikte..."],
  "alternatif_model": "Daha gerçekçi model: ...",
  "guvenilirlik_skoru": 0-100
}`;

  try {
    const r = await AI.chat(`KONU: "${konu}"\nTEORİK SONUÇ: ${teorikOzet}`, sistem, { temperature: 0.6 });
    const veri = jsonCoz(r.content || r) || { itirazlar: [], guvenilirlik_skoru: 50 };
    log(`[ANTİ] Teorik: ${veri.itirazlar?.length || 0} itiraz | Güven: ${veri.guvenilirlik_skoru}/100`);
    return veri;
  } catch (e) { return { itirazlar: [], guvenilirlik_skoru: 50, hata: e.message }; }
}

// ── TEST 3: İKİSİNİN ÇELİŞKİLERİNİ BUL ─────────────────────
async function celiskileriTespit(konu, ampirikSonuc, teorikSonuc, log) {
  log('[ANTİ] Test 3: İki algo arasındaki çelişkiler aranıyor...');

  const sistem = `Sen Çelişki Tespit Ajanısın.
Ampirik ve teorik sonuçları karşılaştır. Nerede aynı fikirler? Nerede çelişiyorlar?
Çelişki = tehlikeli belirsizlik kapısı. Her çelişki işaretlenmeli.

JSON:
{
  "uyusan_noktalar": ["Her iki algo da şunda hemfikir: ..."],
  "celiskiler": [
    { "id": "C1", "ampirik_iddia": "...", "teorik_iddia": "...", "neden_celisiyor": "...", "tehlike": "KRİTİK/ÖNEMLI/MINOR" }
  ],
  "belirsiz_alan": ["Her iki algo da bundan emin değil: ..."],
  "sentez_onerisi": "İki algo birleştirilirse şu çıkarılabilir: ...",
  "kac_kritik_celiskisi_var": 0
}`;

  try {
    const amOzet  = JSON.stringify(ampirikSonuc?.sonuc?.icerik || '').substring(0, 300);
    const tOzet   = JSON.stringify(teorikSonuc?.sonuc?.icerik || '').substring(0, 300);
    const r = await AI.chat(`KONU: "${konu}"\nAMPİRİK: ${amOzet}\nTEORİK: ${tOzet}`, sistem, { temperature: 0.3 });
    const veri = jsonCoz(r.content || r) || { celiskiler: [], uyusan_noktalar: [], belirsiz_alan: [] };
    log(`[ANTİ] Çelişki: ${veri.celiskiler?.length || 0} | Uyuşan: ${veri.uyusan_noktalar?.length || 0}`);
    return veri;
  } catch (e) { return { celiskiler: [], uyusan_noktalar: [], belirsiz_alan: [], hata: e.message }; }
}

// ── ANA FONKSİYON ───────────────────────────────────────────
async function antiTest(konu, ampirikSonuc, teorikSonuc, log) {
  const baslangic = Date.now();
  log(`\n${'─'.repeat(50)}`);
  log(`[ANTİ-TEST] "${konu.substring(0, 60)}"`);
  log(`${'─'.repeat(50)}`);

  const ampirikTest  = await ampirikCurut(konu, ampirikSonuc, log);
  const teorikTest   = await teorikCurut(konu, teorikSonuc, log);
  const celiskileri  = await celiskileriTespit(konu, ampirikSonuc, teorikSonuc, log);

  // Net güven skoru: İki algodan kalan güven
  const netGuven = Math.round(((ampirikTest.guvenilirlik_skoru || 50) + (teorikTest.guvenilirlik_skoru || 50)) / 2);
  const kritikCeliski = celiskileri.kac_kritik_celiskisi_var || celiskileri.celiskiler?.filter(c => c.tehlike === 'KRİTİK').length || 0;

  const rapor = {
    meta:          ANTI_META,
    ampirik_test:  ampirikTest,
    teorik_test:   teorikTest,
    celiskileri,
    net_guven:     netGuven,
    kritik_celiski: kritikCeliski,
    tavsiye:       kritikCeliski > 0
      ? `⚠️ ${kritikCeliski} kritik çelişki var — İnsan değerlendirmesi gerekli`
      : `✅ Kritik çelişki yok — Net güven: ${netGuven}/100`,
    sure_ms:       Date.now() - baslangic,
  };

  log(`[ANTİ] TAMAM — Net güven: ${netGuven}/100 | Kritik çelişki: ${kritikCeliski}`);
  log(`[ANTİ] Tavsiye: ${rapor.tavsiye}`);
  return rapor;
}

module.exports = { antiTest, ampirikCurut, teorikCurut, celiskileriTespit, ANTI_META };
