// ============================================================
// ARGE_Departmani/algo_ampirik.js
// ARAŞTIRMA ALGORİTMASI A — AMPİRİK / TÜMEVARIM
// ============================================================
// YAKLAŞIM: Veriden başla → Gözlem → Örüntü → Sonuç
// Mantık: Bottom-up (Aşağıdan yukarı)
// Ne sorar: "Bu konuda GERÇEK VERİ ne diyor?"
// ============================================================
// DİĞER ALGORİTMALARA KARIŞMAZ. Kendi metodolojisini korur.
// Anti-tester bu algoritmayı test eder — buna dahil değil.
// ============================================================

'use strict';

const AI = require('../shared/aiOrchestrator');

const ALGO_A_META = Object.freeze({
  ad:       'AMPİRİK-ARAŞTIRMA',
  versiyon: '1.0',
  yaklasim: 'Bottom-Up / Inductive / Evidence-First',
  mantik:   'Gözlem → Örüntü → Hipotez → Teori',
  guc:      'Gerçek veriye dayalı — yanılma payı açık',
  zayif:    'Yeni/veri yok olan alanlarda körleşir',
});

function jsonCoz(metin) {
  try { const m = (metin||'').match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
  return null;
}

// ── ADIM 1: VERİ TOPLAMA ─────────────────────────────────────
async function veriTopla(konu, log) {
  log('[ALGO-A] Adım 1: Veri toplama (ampirik)...');
  const sistem = `Sen Ampirik Araştırmacısın. Bottom-up yaklaşım.
Konuyu önce GÖZLEM ve VERI perspektifinden ele al.
"Bu konuda ne biliyoruz? Hangi veriler var? Gözlemler ne gösteriyor?"
Varsayım ile olguyu AYIRT et. Her bilgiye güven etiketi koy.

JSON:
{
  "gozlemler": [
    { "id": "G1", "gozlem": "...", "kaynak": "...", "guven": "DOGRULANMIS/GOZLEM/CIKARIM/HIPOTEZ/BILINMIYOR" }
  ],
  "bilinen_veriler": ["..."],
  "veri_boslukları": ["Bu konuda bilmediğimiz..."],
  "on_yargilar": ["Dikkat: Bu varsayım olabilir"]
}`;
  try {
    const r = await AI.chat(`ARAŞTIRMA KONUSU: "${konu}"`, sistem, { temperature: 0.4 });
    return jsonCoz(r.content || r) || { gozlemler: [], bilinen_veriler: [], veri_boslukları: [], on_yargilar: [] };
  } catch (e) { log(`[ALGO-A] Veri hatası: ${e.message}`, 'WARN'); return { gozlemler: [], veri_boslukları: ['Veri toplanamadı'] }; }
}

// ── ADIM 2: ÖRÜNTÜ TESPİTİ ──────────────────────────────────
async function oruntu_tespit(konu, veri, log) {
  log('[ALGO-A] Adım 2: Örüntü tespiti...');
  const sistem = `Sen Örüntü Analistisin (Inductive).
Verideki tekrarlayan yapıları, ilişkileri, korelasyonları bul.
Korelasyon ≠ nedensellik. Dikkatli ol.

JSON:
{
  "oruntuler": [
    { "id": "P1", "oruntu": "...", "guvenilirlik": "YÜKSEK/ORTA/DÜŞÜK", "not": "..." }
  ],
  "anomaliler": ["Bu veriler örüntüye uymadı..."],
  "hipotezler": ["Bu örüntü şunu ima ediyor..."]
}`;
  try {
    const ozet = JSON.stringify(veri?.gozlemler || []).substring(0, 500);
    const r = await AI.chat(`KONU: "${konu}"\nVERİ: ${ozet}`, sistem, { temperature: 0.3 });
    return jsonCoz(r.content || r) || { oruntuler: [], anomaliler: [], hipotezler: [] };
  } catch (e) { return { oruntuler: [], anomaliler: [], hipotezler: [] }; }
}

// ── ADIM 3: AMPİRİK SONUÇ ───────────────────────────────────
async function ampirik_sonuc(konu, veri, oruntuler, log) {
  log('[ALGO-A] Adım 3: Ampirik sonuç üretimi...');
  const sistem = `Sen Ampirik Analistisin. Sadece veride GÖRÜLEN şeyleri söyle.
Tahmin değil, gözlem. Kesin değil, olasılıklı. Uydurma YASAK.
[BİLGİ_SINIFI] etiketini kullan.

FORMAT:
[BİLGİ_SINIFI]: DOĞRULANMIŞ_GERÇEK / GÖZLEM / ÇIKARIM / HİPOTEZ / BELİRSİZ
[BULGU]: ...
[KANIT]: ...
[GÜVEN_SEVİYESİ]: 0-100
[BELIRSIZLIK]: ...
[ÖNERI]: (sadece veriyle desteklenen)`;
  try {
    const r = await AI.chat(
      `KONU: "${konu}"\nVERİ ÖZETİ: ${JSON.stringify(veri).substring(0,300)}\nÖRÜNTÜLER: ${JSON.stringify(oruntuler).substring(0,300)}`,
      sistem, { temperature: 0.1 }
    );
    return { icerik: r.content || r, yontem: 'ampirik', zaman: new Date().toISOString() };
  } catch (e) { return { icerik: `Hata: ${e.message}`, yontem: 'ampirik' }; }
}

// ── ANA FONKSİYON ───────────────────────────────────────────
async function ampirikArastir(konu, log) {
  const baslangic = Date.now();
  log(`\n${'─'.repeat(50)}`);
  log(`[ALGO-A] AMPİRİK ARAŞTIRMA: "${konu.substring(0, 60)}"`);
  log(`${'─'.repeat(50)}`);

  const veri      = await veriTopla(konu, log);
  const oruntuler = await oruntu_tespit(konu, veri, log);
  const sonuc     = await ampirik_sonuc(konu, veri, oruntuler, log);

  log(`[ALGO-A] TAMAM — ${Date.now() - baslangic}ms`);
  return { meta: ALGO_A_META, veri, oruntuler, sonuc, sure_ms: Date.now() - baslangic };
}

module.exports = { ampirikArastir, ALGO_A_META };
