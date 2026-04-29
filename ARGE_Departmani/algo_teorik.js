// ============================================================
// ARGE_Departmani/algo_teorik.js
// ARAŞTIRMA ALGORİTMASI B — TEORİK / TÜMDENGELIM
// ============================================================
// YAKLAŞIM: Modelden başla → Prensip → Dedüksiyon → Test
// Mantık: Top-down (Yukarıdan aşağı)
// Ne sorar: "Bu konunun temel PRENSİPLERİ ve MODELLERİ ne?"
// ============================================================
// AMPİRİK ALGO'DAN TAMAMEN BAĞIMSIZ. Kendi metodolojisi.
// Veriye değil, yapıya ve prensibe güvenir.
// Bu da yanıltıcı olabilir — anti-tester bunu test eder.
// ============================================================

'use strict';

const AI = require('../shared/aiOrchestrator');

const ALGO_B_META = Object.freeze({
  ad:       'TEORİK-ARAŞTIRMA',
  versiyon: '1.0',
  yaklasim: 'Top-Down / Deductive / Model-First',
  mantik:   'Teori → Prensip → Dedüktif Çıkarım → Doğrulama',
  guc:      'Veri yoksa bile çalışır — yapısal tutarlılık sağlar',
  zayif:    'Gerçek veriye aykırı sonuç üretebilir',
});

function jsonCoz(metin) {
  try { const m = (metin||'').match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
  return null;
}

// ── ADIM 1: TEORİK ÇERÇEVE KUR ──────────────────────────────
async function teorikCerceve(konu, log) {
  log('[ALGO-B] Adım 1: Teorik çerçeve kurulumu (top-down)...');
  const sistem = `Sen Teorik Araştırmacısın. Top-down yaklaşım.
Konuya MODELLER ve PRENSİPLER perspektifinden bak.
"Bu konunun teorik temelleri ne? Hangi prensipler geçerli?"
Entelektüel bağlılık değil — teorinin sınırlarını da belirt.

JSON:
{
  "teorik_cerceve": "...",
  "temel_prensipler": [
    { "prensip": "...", "aciklama": "...", "koken": "..." }
  ],
  "varsayimlar": ["Bu teori şunu varsayar..."],
  "modelin_sinirlari": ["Bu model şu durumda çalışmaz..."],
  "alternatif_teoriler": ["Farklı açıklama: ..."]
}`;
  try {
    const r = await AI.chat(`ARAŞTIRMA KONUSU: "${konu}"`, sistem, { temperature: 0.4 });
    return jsonCoz(r.content || r) || { teorik_cerceve: 'Çerçeve kurulamadı', temel_prensipler: [] };
  } catch (e) { return { teorik_cerceve: `Hata: ${e.message}`, temel_prensipler: [] }; }
}

// ── ADIM 2: DEDÜKTİF ÇIKARIM ────────────────────────────────
async function deduktifCikarim(konu, cerceve, log) {
  log('[ALGO-B] Adım 2: Dedüktif çıkarım...');
  const sistem = `Sen Dedüktif Analistisin.
Teorik çerçeveden hareketle MANTIKSAL ÇIKARIM yap.
IF teori doğruysa THEN şu sonuç çıkar.
Zincir kırılırsa dürüstçe belirt.

JSON:
{
  "cikariim_zinciri": [
    { "sira": 1, "onde": "Eğer...", "sonuc": "O zaman...", "gecerli": true/false }
  ],
  "teorik_oncekurum": "...",
  "beklenen_sonuc": "...",
  "zincir_kırılma_noktalari": ["..."]
}`;
  try {
    const r = await AI.chat(
      `KONU: "${konu}"\nÇERÇEVE: ${JSON.stringify(cerceve.temel_prensipler || []).substring(0, 400)}`,
      sistem, { temperature: 0.2 }
    );
    return jsonCoz(r.content || r) || { cikariim_zinciri: [], beklenen_sonuc: 'Belirsiz' };
  } catch (e) { return { cikariim_zinciri: [], beklenen_sonuc: `Hata: ${e.message}` }; }
}

// ── ADIM 3: TEORİK SONUÇ ────────────────────────────────────
async function teorik_sonuc(konu, cerceve, cikarim, log) {
  log('[ALGO-B] Adım 3: Teorik sonuç üretimi...');
  const sistem = `Sen Teorik Analistisin. Prensiplerden SONUCA git.
Modelin öngörüsünü yaz. Gerçek veriyle çelişebileceğini belirt.
Her sonuç teorik çerçeveye bağlı olmalı.

FORMAT:
[BİLGİ_SINIFI]: ÇIKARIM / HİPOTEZ / DOĞRULANMIŞ_GERÇEK
[TEORİK_ÖNCEKURUM]: ...
[ÇIKARIM]: Eğer X doğruysa → Y beklenir
[BEKLENEN]: ...
[ÇÜRÜTME_KOSULU]: Bu koşulda teori yanlış olur: ...
[MODEL_SINIRI]: Bu model şu durumda geçersiz: ...`;
  try {
    const r = await AI.chat(
      `KONU: "${konu}"\nÇERÇEVE: ${cerceve.teorik_cerceve?.substring(0,200)}\nÇIKARIM: ${cikarim.beklenen_sonuc}`,
      sistem, { temperature: 0.1 }
    );
    return { icerik: r.content || r, yontem: 'teorik', zaman: new Date().toISOString() };
  } catch (e) { return { icerik: `Hata: ${e.message}`, yontem: 'teorik' }; }
}

// ── ANA FONKSİYON ───────────────────────────────────────────
async function teorikArastir(konu, log) {
  const baslangic = Date.now();
  log(`\n${'─'.repeat(50)}`);
  log(`[ALGO-B] TEORİK ARAŞTIRMA: "${konu.substring(0, 60)}"`);
  log(`${'─'.repeat(50)}`);

  const cerceve = await teorikCerceve(konu, log);
  const cikarim = await deduktifCikarim(konu, cerceve, log);
  const sonuc   = await teorik_sonuc(konu, cerceve, cikarim, log);

  log(`[ALGO-B] TAMAM — ${Date.now() - baslangic}ms`);
  return { meta: ALGO_B_META, cerceve, cikarim, sonuc, sure_ms: Date.now() - baslangic };
}

module.exports = { teorikArastir, ALGO_B_META };
