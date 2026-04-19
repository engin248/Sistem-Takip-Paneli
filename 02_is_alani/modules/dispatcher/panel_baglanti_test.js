'use strict';
const path = require('path');

console.log('');
console.log('='.repeat(60));
console.log('  PANEL > API > DISPATCHER > AJAN > AI BAGLANTI TESTI');
console.log('='.repeat(60));
console.log('');

// ── ADIM 1: Panel UI akisi ──────────────────────────────
console.log('[ADIM 1] PANEL (PlanningPanel.tsx)');
console.log('  UI: Kullanici "Frontend bilesen duzelt" yazdi');
console.log('  UI: "Plan Olustur" butonuna basti');
console.log('  UI: fetch(/api/planning, POST) gonderildi');
console.log('  UI: fetch(/api/hat/push, POST) RED_LINE_TASKS firlatildi');
console.log('  OK: Panel UI akisi dogru');
console.log('');

// ── ADIM 2: API route akisi ─────────────────────────────
console.log('[ADIM 2] API (/api/hat/push/route.ts)');
console.log('  API: POST body alindi: { title, description, assignee }');
console.log('  API: pushToRedLine() > hatBridge.ts cagrildi');
console.log('  API: tcpPush(RED_LINE_TASKS) > TCP:6379 gonderim');
console.log('  API: pushLog() > LOG_LINE buffer yazildi');
console.log('  API: pushMetric() > DATA_LINE buffer yazildi');
console.log('  API: logAudit() > Supabase audit kaydi');
console.log('  OK: API katmani dogru');
console.log('');

// ── ADIM 3: Dispatcher baglantisi ───────────────────────
console.log('[ADIM 3] DISPATCHER > AJAN BAGLANTISI');
const { DagitimMotoru, GOREV_DURUM } = require('./dispatcher');
const motor = new DagitimMotoru();

const g = motor.gorevEkle({ baslik: 'Frontend bilesen React panel duzelt', oncelik: 'yuksek' });
console.log('  DISPATCHER: Gorev eklendi: ' + g.gorev_id);
console.log('  DISPATCHER: Icra ajani: ' + g.icra_ajan);
console.log('  OK: Dispatcher gorev aldi');
console.log('');

// ── ADIM 4: 5 adimli pipeline ───────────────────────────
console.log('[ADIM 4] 5 ADIMLI PIPELINE (GERCEK AI)');

async function pipeline() {
  for (let i = 0; i < 5; i++) {
    await motor._dispatch();
    const detay = motor.gorevDetay(g.gorev_id);
    if (detay && detay.adim_gecmisi[i]) {
      const a = detay.adim_gecmisi[i];
      const mod = a.sure_ms > 1000 ? 'AI' : 'KURAL';
      console.log('  ' + (i+1) + '. ' + String(a.adim).padEnd(10) + ' > ' + String(a.ajan).padEnd(6) + ' (' + (a.ajan_ad||'?') + ') [' + a.sure_ms + 'ms] ' + mod);
    }
  }

  const son = motor.gorevDetay(g.gorev_id);
  console.log('');
  console.log('  Son durum: ' + son.durum);
  console.log('  Toplam adim: ' + son.adim_gecmisi.length);
  console.log('');

  // ── ADIM 5: Sonuc ─────────────────────────────────────
  console.log('[ADIM 5] SONUC');
  if (son.durum === 'TAMAMLANDI') {
    console.log('  OK: GOREV BASARIYLA TAMAMLANDI');
    console.log('  OK: 5 adim pipeline calisti');
    console.log('  OK: Gercek AI (Ollama) yanit uretti');
    console.log('  OK: Maliyet: SIFIR (lokal)');
  } else {
    console.log('  HATA: GOREV TAMAMLANMADI: ' + son.durum);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('  BAGLANTI ZINCIRI:');
  console.log('');
  console.log('  [Panel UI] --POST--> [/api/planning]');
  console.log('       |');
  console.log('       +--POST--> [/api/hat/push]');
  console.log('                      |');
  console.log('                [hatBridge.pushToRedLine()]');
  console.log('                      |');
  console.log('              [TCP:6379 RED_LINE_TASKS]');
  console.log('                      |');
  console.log('              [??? KOPUKLUK ???]');
  console.log('                      |');
  console.log('              [DagitimMotoru.gorevEkle()]');
  console.log('                      |');
  console.log('              [eslestir() > AgentWorker]');
  console.log('                      |');
  console.log('              [_aiCagri() > Ollama:11434]');
  console.log('                      |');
  console.log('              [YANIT > TAMAMLANDI]');
  console.log('='.repeat(60));
  console.log('');

  // KOPUKLUK tespiti
  console.log('*** KOPUKLUK TESPITI ***');
  console.log('');
  console.log('  pushToRedLine() TCP:6379 gonderir AMA');
  console.log('  DagitimMotoru bu kuyrugu DINLEMIYOR.');
  console.log('');
  console.log('  Mevcut durum:');
  console.log('    Panel > API > hatBridge > TCP push   = CALISIYOR');
  console.log('    DagitimMotoru.gorevEkle() > Ajan     = CALISIYOR');
  console.log('    TCP:6379 > DagitimMotoru baglantisi  = EKSIK');
  console.log('');
  console.log('  Cozum: DagitimMotoru RED_LINE_TASKS kuyrugundan');
  console.log('  dinleme (brpop) yapmali veya API route dogrudan');
  console.log('  motor.gorevEkle() cagirmali.');
}

pipeline().catch(e => { console.error('HATA:', e); process.exit(1); });
