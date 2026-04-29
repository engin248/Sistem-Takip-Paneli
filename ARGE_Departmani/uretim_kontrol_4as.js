// ============================================================
// ARGE_Departmani/uretim_kontrol_4as.js
// 4 AŞAMALI ÜRETİM KONTROLÜ
// ============================================================
// AŞAMA 1: YÜRÜT  — İş yapılır (proje planına GÖRE)
// AŞAMA 2: KONTROL — Plan uyumu kontrol edilir
// AŞAMA 3: DOĞRULA — Bağımsız doğrulama yapılır
// AŞAMA 4: ONAYLA — Onay verilir veya RED
// ============================================================
// KURAL: Tek aşama başarısız olursa zincir DURUR.
// Atlamak yasak. Sıra değiştirmek yasak.
// ============================================================

'use strict';

const AI = require('../shared/aiOrchestrator');
const { edk25CiktiTara } = require('../shared/edk_25');

// ── AŞAMA DURUMLARI ─────────────────────────────────────────
const ASAMA = Object.freeze({
  BEKLEMEDE : 'BEKLEMEDE',
  AKTIF     : 'AKTIF',
  GECTI     : 'GECTI',
  REDDEDILDI: 'REDDEDILDI',
  DURDURULDU: 'DURDURULDU',
});

// ── KANIT TÜRLERİ (EDK-25 Bölüm 8) ─────────────────────────
const KANIT_TURLERI = Object.freeze([
  'HATA_MESAJI', 'LOG', 'EKRAN', 'REPRO', 'VERI', 'ZAMAN', 'ORTAM'
]);

// ── ARAç: JSON AYRIŞTIRICISI ─────────────────────────────────
function jsonCoz(metin) {
  try {
    const m = (metin || '').match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch {}
  return null;
}

// ── AŞAMA 1: YÜRÜT ─────────────────────────────────────────
// Görevi proje planına göre yürütür. Plan yoksa durdurur.
async function asama1_yurut(is, projePlan, log) {
  log('\n[4AS-A1] ═══ YÜRÜT AŞAMASI ═══');
  if (!projePlan) {
    log('[4AS-A1] DURDU: Proje planı yok. Yürütme başlatılamaz.', 'ERROR');
    return { asama: 'YURUT', durum: ASAMA.REDDEDILDI, neden: 'Proje planı tanımsız', cikti: null };
  }

  const sistem = `Sen Yürütme Ajanısın.
Görevi proje planına GÖRE adım adım yürüt.
Plandan sapma YASAK. Her adım kanıtla belgelenir.

JSON:
{
  "yurutulen_adimlar": [
    { "sira": 1, "adim": "...", "sonuc": "...", "kanit_turu": "LOG/HATA/VERI", "kanit": "...", "sure_ms": 0 }
  ],
  "plan_uyumu": true/false,
  "sapma_var_mi": false,
  "sapma_detay": "...",
  "cikti": "..."
}`;

  try {
    const r = await AI.chat(
      `İŞ: "${is.baslik || is.content}"\nPROJE PLANI ÖZET: ${JSON.stringify(projePlan.yapici?.operasyon_plani?.fazlar?.[0] || projePlan).substring(0, 400)}`,
      sistem, { temperature: 0.2 }
    );
    const veri = jsonCoz(r.content || r);
    if (!veri) throw new Error('JSON parse başarısız');

    if (veri.sapma_var_mi) {
      log(`[4AS-A1] UYARI: Plan sapması tespit edildi — ${veri.sapma_detay}`, 'WARN');
    }
    log(`[4AS-A1] YÜRÜT TAMAM — ${veri.yurutulen_adimlar?.length || 0} adım tamamlandı`);
    return { asama: 'YURUT', durum: ASAMA.GECTI, ...veri };
  } catch (e) {
    log(`[4AS-A1] HATA: ${e.message}`, 'ERROR');
    return { asama: 'YURUT', durum: ASAMA.REDDEDILDI, neden: e.message, cikti: null };
  }
}

// ── AŞAMA 2: KONTROL ─────────────────────────────────────────
// Plan uyumunu kontrol eder. Yürüt çıktısını plan ile karşılaştırır.
async function asama2_kontrol(is, projePlan, yurut_cikti, log) {
  log('\n[4AS-A2] ═══ KONTROL AŞAMASI ═══');

  const sistem = `Sen Plan Kontrol Ajanısın.
Yürütme çıktısını proje planıyla karşılaştır. Sapma varsa tespit et.
EDK-25 Kural 12.1: Her işlem kaydı kontrol edilir.

JSON:
{
  "kontroller": [
    { "kriter": "...", "beklenen": "...", "gerceklesen": "...", "gecti": true/false }
  ],
  "genel_uyum": true/false,
  "kritik_sapma_var_mi": false,
  "sapma_listesi": ["..."],
  "kontrol_notu": "...",
  "devam_edilsin_mi": true/false
}`;

  try {
    const r = await AI.chat(
      `PLAN: ${JSON.stringify(projePlan?.yapici?.gorev_tanim || {}).substring(0, 300)}\nYÜRÜT ÇIKTISI: ${JSON.stringify(yurut_cikti?.yurutulen_adimlar || []).substring(0, 400)}`,
      sistem, { temperature: 0.1 }
    );
    const veri = jsonCoz(r.content || r);
    if (!veri) throw new Error('JSON parse başarısız');

    const durum = veri.devam_edilsin_mi ? ASAMA.GECTI : ASAMA.REDDEDILDI;
    log(`[4AS-A2] KONTROL: ${veri.kontroller?.filter(k => k.gecti).length || 0}/${veri.kontroller?.length || 0} kriter PASS | Devam: ${veri.devam_edilsin_mi}`);
    return { asama: 'KONTROL', durum, ...veri };
  } catch (e) {
    log(`[4AS-A2] HATA: ${e.message}`, 'ERROR');
    return { asama: 'KONTROL', durum: ASAMA.REDDEDILDI, neden: e.message };
  }
}

// ── AŞAMA 3: DOĞRULA ─────────────────────────────────────────
// BAĞIMSIZ doğrulama — ne yaparı ne kontrolü bilmez. Sadece sonuca bakar.
async function asama3_dogrula(is, yurut_cikti, kontrol_cikti, log) {
  log('\n[4AS-A3] ═══ DOĞRULAMA AŞAMASI (BAĞIMSIZ) ═══');

  const sistem = `Sen BAĞIMSIZ Doğrulama Ajanısın.
Yapıcıyı ve kontrolcüyü tanımıyorsun. Sadece sonuca bakıyorsun.
Soru: "Bu sonuç gerçek mi? Doğrulanabilir mi? Güvenilir mi?"
EDK-25 Bölüm 14: Nihai doğrulama zorunlu.

JSON:
{
  "dogrulama_testleri": [
    { "test": "...", "gecti": true/false, "aciklama": "..." }
  ],
  "gerceklik_skoru": 0-100,
  "dogrulanabilir_mi": true/false,
  "guvenilirlik": "YÜKSEK/ORTA/DÜŞÜK",
  "belirsizlikler": ["..."],
  "final": "ONAYA_GONDER/REVIZYONA_GONDER/RED"
}`;

  try {
    const r = await AI.chat(
      `SONUÇ (kör değerlendirme): ${JSON.stringify(yurut_cikti?.cikti || '').substring(0, 400)}\nKONTROL NOTU: ${kontrol_cikti?.kontrol_notu || 'Yok'}`,
      sistem, { temperature: 0.1 }
    );
    const veri = jsonCoz(r.content || r);
    if (!veri) throw new Error('JSON parse başarısız');

    const durum = veri.final === 'ONAYA_GONDER' ? ASAMA.GECTI : ASAMA.REDDEDILDI;
    log(`[4AS-A3] DOĞRULAMA: Güven=${veri.gerceklik_skoru}/100 | ${veri.final}`);
    return { asama: 'DOGRULA', durum, ...veri };
  } catch (e) {
    log(`[4AS-A3] HATA: ${e.message}`, 'ERROR');
    return { asama: 'DOGRULA', durum: ASAMA.REDDEDILDI, neden: e.message };
  }
}

// ── AŞAMA 4: ONAYLA ─────────────────────────────────────────
// Son karar. 3 önceki aşamanın raporuna bakar. 2/3 geçti ise ONAYLA.
async function asama4_onayla(is, yurut, kontrol, dogrula, log) {
  log('\n[4AS-A4] ═══ ONAY AŞAMASI ═══');

  const gecenAsama = [yurut, kontrol, dogrula].filter(a => a.durum === ASAMA.GECTI).length;
  log(`[4AS-A4] Geçen aşama: ${gecenAsama}/3`);

  if (gecenAsama < 2) {
    log('[4AS-A4] RED: Yeterli aşama geçemedi (min 2/3 gerekli)', 'WARN');
    return { asama: 'ONAYLA', durum: ASAMA.REDDEDILDI, neden: `Sadece ${gecenAsama}/3 aşama geçti`, onay: false };
  }

  // EDK-25 Dürüstlük Kontrolü
  const sonucMetni = JSON.stringify({ yurut, kontrol, dogrula });
  const durustluk = edk25CiktiTara(sonucMetni);

  const sistem = `Sen Onay Komitesi Başkanısın.
3 aşamanın raporunu değerlendir. Son karar ver.
EDK-25 Bölüm 17: Final onay kapısı zorunlu. 8 kapı var.

JSON:
{
  "karar": "KABUL/KOSULLU_KABUL/REVIZYON/RED",
  "gerekce": "...",
  "kosullar": ["(varsa)"],
  "risk_notu": "...",
  "onay": true/false,
  "sonraki_adim": "..."
}`;

  try {
    const ozet = `YÜRÜT: ${yurut.durum} (${yurut.yurutulen_adimlar?.length || 0} adım)\nKONTROL: ${kontrol.durum} (${kontrol.kontroller?.filter(k=>k.gecti).length || 0} pass)\nDOĞRULA: ${dogrula.durum} (Güven: ${dogrula.gerceklik_skoru || '?'}/100)`;
    const r = await AI.chat(ozet, sistem, { temperature: 0.1 });
    const veri = jsonCoz(r.content || r) || { karar: 'RED', gerekce: 'Parse hatası', onay: false };

    log(`[4AS-A4] KARAR: ${veri.karar} | Onay: ${veri.onay} | EDK-25: ${durustluk.gecerli ? 'PASS' : 'UYARI'}`);
    return { asama: 'ONAYLA', durum: veri.onay ? ASAMA.GECTI : ASAMA.REDDEDILDI, edk25: durustluk, ...veri };
  } catch (e) {
    log(`[4AS-A4] HATA: ${e.message}`, 'ERROR');
    return { asama: 'ONAYLA', durum: ASAMA.REDDEDILDI, neden: e.message, onay: false };
  }
}

// ── ANA FONKSİYON: 4 Aşamalı Kontrol ───────────────────────
async function dortAsamaKontrol(is, projePlan, supabase, log) {
  const baslangic = Date.now();
  log(`\n${'═'.repeat(60)}`);
  log(`4 AŞAMALI ÜRETİM KONTROLÜ — ${is.task_code || 'ADSIZ'}`);
  log(`${'═'.repeat(60)}`);

  // A1 — zorunlu
  const a1 = await asama1_yurut(is, projePlan, log);
  if (a1.durum === ASAMA.REDDEDILDI) {
    log('[4AS] ZİNCİR DURDURULDU: A1 başarısız.', 'ERROR');
    return { durum: ASAMA.DURDURULDU, durduran: 'YURUT', a1, sure_ms: Date.now() - baslangic };
  }

  // A2 — A1 geçmeden çalışmaz
  const a2 = await asama2_kontrol(is, projePlan, a1, log);
  if (a2.durum === ASAMA.REDDEDILDI) {
    log('[4AS] ZİNCİR DURDURULDU: A2 başarısız.', 'ERROR');
    return { durum: ASAMA.DURDURULDU, durduran: 'KONTROL', a1, a2, sure_ms: Date.now() - baslangic };
  }

  // A3 — bağımsız doğrulama
  const a3 = await asama3_dogrula(is, a1, a2, log);

  // A4 — 3 aşamanın sonucu
  const a4 = await asama4_onayla(is, a1, a2, a3, log);

  const rapor = { durum: a4.onay ? ASAMA.GECTI : ASAMA.REDDEDILDI, a1, a2, a3, a4, sure_ms: Date.now() - baslangic };

  // Supabase kayıt
  if (supabase && is.id) {
    try {
      await supabase.from('tasks').update({
        status: a4.onay ? 'tamamlandi' : 'reddedildi',
        metadata: { ...is.metadata, dort_as_kontrol: { karar: a4.karar, sure: rapor.sure_ms, gecen: [a1,a2,a3,a4].filter(a=>a.durum===ASAMA.GECTI).length } },
        updated_at: new Date().toISOString(),
      }).eq('id', is.id);
    } catch (e) { log(`[4AS] Supabase hata: ${e.message}`, 'WARN'); }
  }

  log(`\n${'═'.repeat(60)}`);
  log(`4AS SONUÇ: ${a4.karar} | ${rapor.sure_ms}ms`);
  log(`${'═'.repeat(60)}`);
  return rapor;
}

module.exports = { dortAsamaKontrol, asama1_yurut, asama2_kontrol, asama3_dogrula, asama4_onayla, ASAMA };
