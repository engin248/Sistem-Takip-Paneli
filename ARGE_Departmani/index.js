// ============================================================
// ARGE_Departmani/index.js
// AR-GE ARAŞTIRMA DEPARTMANI — KOORDİNATÖR
// ============================================================
// Tüm ARGE motorlarını yönetir. Dışarıya tek API sunar.
// İçerideki algoritmalar birbirine KARIŞMAZ.
// ============================================================

'use strict';

const { ampirikArastir, ALGO_A_META } = require('./algo_ampirik');
const { teorikArastir,  ALGO_B_META } = require('./algo_teorik');
const { antiTest,       ANTI_META   } = require('./anti_tester');
const { dortAsamaKontrol, ASAMA }     = require('./uretim_kontrol_4as');
const { hermAiDongusu }               = require('../shared/hermai_mimarisi'); // HermAI — Sadi Evren Şeker YBS 2025

// ── LOG ──────────────────────────────────────────────────────
function log(msg, seviye = 'INFO') {
  const line = `[${new Date().toISOString()}] [ARGE][${seviye}] ${msg}`;
  console.log(line);
}

// ── ANA ARAŞTIRMA — tam pipeline ────────────────────────────
/**
 * ARGE tam araştırma pipeline:
 * Algo-A (Ampirik) || Algo-B (Teorik) → Anti-Test → Sentez Raporu
 */
async function argeArastir(konu) {
  const baslangic = Date.now();
  log(`${'═'.repeat(60)}`);
  log(`AR-GE ARAŞTIRMA BAŞLADI: "${konu.substring(0, 70)}"`);
  log(`${'═'.repeat(60)}`);

  // Paralel araştırma — A ve B birbirini beklemez
  log('Algo-A (Ampirik) ve Algo-B (Teorik) paralel başlatılıyor...');
  const [ampirikSonuc, teorikSonuc] = await Promise.all([
    ampirikArastir(konu, log),
    teorikArastir(konu, log),
  ]);

  // Anti test her ikisini de çürütür
  const antiSonuc = await antiTest(konu, ampirikSonuc, teorikSonuc, log);

  // Sentez raporu
  // HermAI DöngüSÜ — Hermenötik Bağlamsal Yorum
  // Kaynak: Prof. Dr. Sadi Evren Şeker, YBS Ansiklopedi Cilt 13, Sayı 1, Ocak 2025
  // İlke 2: Çift Modlu Açıklama — Ampirik+Teorik+Anti sonuçları Mikro+Makro yorumlanır
  let hermAiRaporu = null;
  try {
    const argeKararSeti = {
      ampirik: { sonuc: antiSonuc.ampirik_gecti ? 'PASS' : 'FAIL', puan: ampirikSonuc.guven, neden: ampirikSonuc.ozet || konu },
      teorik:  { sonuc: antiSonuc.teorik_gecti  ? 'PASS' : 'FAIL', puan: teorikSonuc.guven,  neden: teorikSonuc.ozet  || konu },
      anti:    { sonuc: 'PASS', puan: antiSonuc.net_guven, neden: antiSonuc.tavsiye || '' },
    };
    hermAiRaporu = await hermAiDongusu(argeKararSeti, { content: konu, title: konu }, []);
    log(`HermAI döngüSÜ tamamlandı — çelişki: ${hermAiRaporu.celiski.var ? 'VAR' : 'YOK'}`);
  } catch (e) {
    hermAiRaporu = { hata: e.message };
    log(`HermAI HATA: ${e.message}`, 'WARN');
  }

  const rapor = {
    konu,
    zaman:         new Date().toISOString(),
    sure_ms:       Date.now() - baslangic,
    algo_a:        ampirikSonuc,
    algo_b:        teorikSonuc,
    anti:          antiSonuc,
    net_guven:     antiSonuc.net_guven,
    kritik_celiski: antiSonuc.kritik_celiski,
    tavsiye:       antiSonuc.tavsiye,
    hermai:        hermAiRaporu, // Mikro+Makro HermAI yorumu
  };

  log(`${'═'.repeat(60)}`);
  log(`ARGE TAMAMLANDI — ${rapor.sure_ms}ms | Net Güven: ${rapor.net_guven}/100`);
  log(`${'═'.repeat(60)}`);
  return rapor;
}

// ── 4 AŞAMALI KONTROL — iş üretimi ─────────────────────────
async function argeUretim(is, projePlan, supabase) {
  return await dortAsamaKontrol(is, projePlan, supabase, log);
}

// ── DURUM ────────────────────────────────────────────────────
function argeStatus() {
  return {
    durum:      'AKTIF',
    motorlar:   [ALGO_A_META.ad, ALGO_B_META.ad, ANTI_META.ad],
    kontrol:    '4 Aşamalı Üretim Kontrolü',
    bagimsizlik: 'Algoritmalar birbirine karışmaz',
    zaman:      new Date().toISOString(),
  };
}

module.exports = { argeArastir, argeUretim, argeStatus, ASAMA };
