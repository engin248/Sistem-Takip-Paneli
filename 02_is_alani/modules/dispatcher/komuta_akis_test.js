// ============================================================
// KOMUTA MERKEZİ → AJAN EMİR AKIŞI — TAM DOĞRULAMA
// ============================================================
// Panel → API → Dispatcher → Gerçek Ajan akışını simüle eder
// Çalıştırma: node modules/dispatcher/komuta_akis_test.js
// ============================================================

'use strict';

const path = require('path');
const fs = require('fs');

let gecen = 0;
let kalan = 0;
const hatalar = [];
const loglar = [];

function log(msg) { loglar.push(`${new Date().toISOString().slice(11,23)} ${msg}`); }
function test(ad, fn) {
  try {
    const r = fn();
    if (r instanceof Promise) return r.then(() => { gecen++; console.log(`  ✅ ${ad}`); }).catch(e => { kalan++; hatalar.push({ad, h:e.message}); console.log(`  ❌ ${ad} → ${e.message}`); });
    gecen++;
    console.log(`  ✅ ${ad}`);
  } catch(e) { kalan++; hatalar.push({ad, h:e.message}); console.log(`  ❌ ${ad} → ${e.message}`); }
}
async function asyncTest(ad, fn) {
  try { await fn(); gecen++; console.log(`  ✅ ${ad}`); }
  catch(e) { kalan++; hatalar.push({ad, h:e.message}); console.log(`  ❌ ${ad} → ${e.message}`); }
}
function assert(k, m) { if(!k) throw new Error(m || 'FAIL'); }
function eq(a, b, m) { if(a!==b) throw new Error(m || `Beklenen:${b} Gerçek:${a}`); }

async function main() {

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║   KOMUTA MERKEZİ → AJAN EMİR AKIŞI — TAM DOĞRULAMA           ║');
console.log('║   Panel → API → Dispatcher → Gerçek Ajan                      ║');
console.log('╠══════════════════════════════════════════════════════════════════╣');
console.log(`║   Tarih: ${new Date().toISOString().slice(0,19)}                                ║`);
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

// ── Modüller ─────────────────────────────────────────────────
const { DagitimMotoru, GOREV_DURUM, ADIMLAR } = require(path.join(__dirname, 'dispatcher'));
const { WorkerPool, eslestir, YETENEK_MATRISI, WORKER_DURUMLARI } = require(path.join(__dirname, '../../agents/worker_core'));
const planningUI = require(path.join(__dirname, '../../ui/planning_ui'));
const hub = require(path.join(__dirname, '../../core/hat1_hub'));

// ═══════════════════════════════════════════════════════════════
// HAT-1: DOSYA VARLIK KONTROLÜ (Panel → API Zinciri)
// ═══════════════════════════════════════════════════════════════
console.log('┌─ HAT-1: PANEL → API ZİNCİRİ DOSYA KONTROLÜ ──────');

const dosyalar = [
  { yol: 'src/components/PlanningPanel.tsx',         ad: 'Panel UI (Plan/Emir)' },
  { yol: 'src/app/api/tasks/taskMutationHandler.ts', ad: 'API: Görev CRUD' },
  { yol: 'src/app/api/tasks/route.ts',               ad: 'API: /api/tasks route' },
  { yol: 'src/app/api/planning/route.ts',             ad: 'API: /api/planning route' },
  { yol: 'src/app/api/hat/push/route.ts',             ad: 'API: /api/hat/push route' },
  { yol: 'src/app/api/agents/route.ts',               ad: 'API: /api/agents route' },
  { yol: 'src/services/hatBridge.ts',                 ad: 'Hat Bridge servisi' },
  { yol: 'modules/dispatcher/dispatcher.js',          ad: 'Dağıtım Motoru' },
  { yol: 'agents/worker_core.js',                     ad: 'Worker Core (22 ajan)' },
  { yol: 'ui/planning_ui.js',                         ad: 'Planning UI (mermi)' },
  { yol: 'core/hat1_hub.js',                          ad: 'Hub V3 (yönlendirme)' },
  { yol: 'core/hat1_connection.js',                   ad: 'Connection (reconnect)' },
  { yol: 'src/core/orchestrator.ts',                  ad: 'Orchestrator (TS)' },
  { yol: 'src/core/pipeline.ts',                      ad: 'Pipeline (9 kapı)' },
  { yol: 'src/core/taskQueue.ts',                     ad: 'TaskQueue (FIFO)' },
  { yol: 'src/services/agentRegistry.ts',             ad: 'Ajan Registry (58 ajan)' },
];

const proje = path.join(__dirname, '../..');
for (const d of dosyalar) {
  test(`${d.ad}`, () => assert(fs.existsSync(path.join(proje, d.yol)), `${d.yol} YOK`));
}


// ═══════════════════════════════════════════════════════════════
// HAT-2: PANEL → PLANNING UI → HUB MERMİ AKIŞI
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ HAT-2: PANEL → MERMİ FIRLAT → HUB AKIŞI ────────');

test('mermiOlustur() → geçerli mermi', () => {
  const mermi = planningUI.mermiOlustur({ baslik: 'Komutandan emir: Frontend düzelt', oncelik: 'kritik', atanan: 'A-01', operator: 'ENGIN' });
  eq(mermi.tip, 'GOREV_EMRI');
  eq(mermi.kaynak, 'PLANLAMA_UI');
  eq(mermi.hedef, 'HAT-1');
  eq(mermi.oncelik, 'kritik');
  eq(mermi.atanan, 'A-01');
  eq(mermi.operator, 'ENGIN');
  assert(mermi.mermi_id.startsWith('MRM-'));
  log(`MERMİ: ${mermi.mermi_id} → ${mermi.hedef} [${mermi.oncelik}]`);
});

test('mermiDogrula() → geçerli mermi onaylar', () => {
  const mermi = planningUI.mermiOlustur({ baslik: 'Test emri', oncelik: 'normal' });
  const sonuc = planningUI.mermiDogrula(mermi);
  assert(sonuc.gecerli === true);
  assert(sonuc.kontroller.tip_var === true);
  assert(sonuc.kontroller.baslik_var === true);
  assert(sonuc.kontroller.mermi_id_var === true);
});

test('Hub mermiYonlendir() → mermi kabul eder', () => {
  const mermi = planningUI.mermiOlustur({ baslik: 'Hub test emri', oncelik: 'yuksek' });
  const sonuc = hub.mermiYonlendir({ baslik: mermi.baslik, kaynak: mermi.kaynak, hedef: mermi.hedef, oncelik: mermi.oncelik, text: JSON.stringify(mermi), mermi_id: mermi.mermi_id });
  assert(sonuc.basarili === true);
  assert(sonuc.islem_id.startsWith('HUB-'));
  log(`HUB: ${sonuc.islem_id} → mermi kabul edildi`);
});


// ═══════════════════════════════════════════════════════════════
// HAT-3: DISPATCHER → GERÇEK AJAN TAM DÖNGÜ
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ HAT-3: DISPATCHER → GERÇEK AJAN TAM DÖNGÜ ───────');

// Senaryo 1: Frontend görevi
const motor = new DagitimMotoru();
const fe = motor.gorevEkle({ baslik: 'Frontend react bileşen CSS düzelt', oncelik: 'yuksek' });

await asyncTest('SENARYO-1: Frontend görevi eklendi', async () => {
  assert(fe.basarili);
  log(`GÖREV: ${fe.gorev_id} → Frontend → icra: ${fe.icra_ajan}`);
});

await asyncTest('SENARYO-1: 5 adım tam döngü çalışır', async () => {
  for (let i = 0; i < 5; i++) await motor._dispatch();
  const g = motor.gorevDetay(fe.gorev_id);
  assert(g !== null, 'Görev bulunamadı');
  eq(g.durum, GOREV_DURUM.TAMAMLANDI);
  eq(g.adim_gecmisi.length, 5);
  log(`TAMAM: ${fe.gorev_id} → 5 adım tamamlandı`);
  for (const a of g.adim_gecmisi) {
    log(`  ${a.adim} → ${a.ajan} (${a.ajan_ad}) [${a.sure_ms}ms] ${a.mod}`);
  }
});

// Senaryo 2: Veritabanı görevi
const motor2 = new DagitimMotoru();
const db = motor2.gorevEkle({ baslik: 'Veritabanı SQL migration tablo oluştur', oncelik: 'kritik' });

await asyncTest('SENARYO-2: DB görevi → A-03 İCRACI-DB atandı', async () => {
  assert(db.basarili);
  eq(db.icra_ajan, 'A-03');
  for (let i = 0; i < 5; i++) await motor2._dispatch();
  const g = motor2.gorevDetay(db.gorev_id);
  eq(g.durum, GOREV_DURUM.TAMAMLANDI);
  eq(g.adim_gecmisi[2].ajan, 'A-03'); // EXECUTE adımı İCRACI-DB
  log(`TAMAM: ${db.gorev_id} → DB → A-03 İCRACI-DB`);
});

// Senaryo 3: Backend görevi
const motor3 = new DagitimMotoru();
const be = motor3.gorevEkle({ baslik: 'Backend API endpoint route servis yaz', oncelik: 'normal' });

await asyncTest('SENARYO-3: Backend görevi → A-02 İCRACI-BE atandı', async () => {
  assert(be.basarili);
  eq(be.icra_ajan, 'A-02');
  for (let i = 0; i < 5; i++) await motor3._dispatch();
  const g = motor3.gorevDetay(be.gorev_id);
  eq(g.durum, GOREV_DURUM.TAMAMLANDI);
  eq(g.adim_gecmisi[2].ajan, 'A-02');
  log(`TAMAM: ${be.gorev_id} → BE → A-02 İCRACI-BE`);
});

// Senaryo 4: Güvenlik görevi
const motor4 = new DagitimMotoru();
const sec = motor4.gorevEkle({ baslik: 'Güvenlik zero-trust yetki kontrol', oncelik: 'kritik' });

await asyncTest('SENARYO-4: Güvenlik görevi → K-4 MUHAFIZ atandı', async () => {
  assert(sec.basarili);
  eq(sec.icra_ajan, 'K-4');
  for (let i = 0; i < 5; i++) await motor4._dispatch();
  const g = motor4.gorevDetay(sec.gorev_id);
  eq(g.durum, GOREV_DURUM.TAMAMLANDI);
  eq(g.adim_gecmisi[2].ajan, 'K-4');
  log(`TAMAM: ${sec.gorev_id} → SEC → K-4 MUHAFIZ`);
});

// Senaryo 5: Test görevi
const motor5 = new DagitimMotoru();
const tst = motor5.gorevEkle({ baslik: 'Test vitest unit coverage yaz', oncelik: 'normal' });

await asyncTest('SENARYO-5: Test görevi → A-05 İCRACI-TEST atandı', async () => {
  assert(tst.basarili);
  eq(tst.icra_ajan, 'A-05');
  for (let i = 0; i < 5; i++) await motor5._dispatch();
  const g = motor5.gorevDetay(tst.gorev_id);
  eq(g.durum, GOREV_DURUM.TAMAMLANDI);
  eq(g.adim_gecmisi[2].ajan, 'A-05');
  log(`TAMAM: ${tst.gorev_id} → TEST → A-05 İCRACI-TEST`);
});

// Senaryo 6: Zorunlu ajan ataması (komutandan direkt emir)
const motor6 = new DagitimMotoru();
const zor = motor6.gorevEkle({ baslik: 'Özel görev — direkt emir', zorunlu_ajan: 'K-3', oncelik: 'kritik' });

await asyncTest('SENARYO-6: Zorunlu ajan → K-3 İSTİHBARAT direkt atama', async () => {
  assert(zor.basarili);
  eq(zor.icra_ajan, 'K-3');
  for (let i = 0; i < 5; i++) await motor6._dispatch();
  const g = motor6.gorevDetay(zor.gorev_id);
  eq(g.durum, GOREV_DURUM.TAMAMLANDI);
  eq(g.adim_gecmisi[2].ajan, 'K-3');
  log(`TAMAM: ${zor.gorev_id} → ZORUNLU → K-3 İSTİHBARAT`);
});


// ═══════════════════════════════════════════════════════════════
// HAT-4: 5 ADIM AKIŞI DOĞRULAMA
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ HAT-4: 5 ADIM AKIŞ DOĞRULAMA ────────────────────');

test('Adım 1: PLAN → K-2 KURMAY', () => {
  eq(ADIMLAR[0].ad, 'PLAN');
  eq(ADIMLAR[0].varsayilan_ajan, 'K-2');
  const w = new WorkerPool().get('K-2');
  assert(w !== null); eq(w.ad, 'KURMAY');
});

test('Adım 2: VALIDATE → B-02 DENETÇİ-DOĞRULA', () => {
  eq(ADIMLAR[1].ad, 'VALIDATE');
  eq(ADIMLAR[1].varsayilan_ajan, 'B-02');
  const w = new WorkerPool().get('B-02');
  assert(w !== null); eq(w.ad, 'DENETÇİ-DOĞRULA');
});

test('Adım 3: EXECUTE → Dinamik ajan (eslestir)', () => {
  eq(ADIMLAR[2].ad, 'EXECUTE');
  eq(ADIMLAR[2].varsayilan_ajan, null);
  // eslestir çalışıyor mu?
  const s = eslestir('Veritabanı SQL migration tablo schema');
  assert(s.length > 0);
  // eslestir dinamik skor, ilk sonuç DB ile ilgili olmalı
  assert(s[0].skor > 0, `Eşleşme skoru: ${s[0].skor}`);
});

test('Adım 4: AUDIT → B-01 DENETÇİ-KOD', () => {
  eq(ADIMLAR[3].ad, 'AUDIT');
  eq(ADIMLAR[3].varsayilan_ajan, 'B-01');
  const w = new WorkerPool().get('B-01');
  assert(w !== null); eq(w.ad, 'DENETÇİ-KOD');
});

test('Adım 5: APPROVE → K-1 KOMUTAN', () => {
  eq(ADIMLAR[4].ad, 'APPROVE');
  eq(ADIMLAR[4].varsayilan_ajan, 'K-1');
  const w = new WorkerPool().get('K-1');
  assert(w !== null); eq(w.ad, 'KOMUTAN');
});


// ═══════════════════════════════════════════════════════════════
// HAT-5: PANEL UI ENTEGRASYON KONTROLÜ
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ HAT-5: PANEL UI ENTEGRASYON KONTROLÜ ─────────────');

const panelIcerik = fs.readFileSync(path.join(proje, 'src/components/PlanningPanel.tsx'), 'utf-8');
test('Panel: /api/planning POST çağırıyor', () => assert(panelIcerik.includes("'/api/planning'") && panelIcerik.includes("method: 'POST'")));
test('Panel: /api/hat/push POST çağırıyor', () => assert(panelIcerik.includes("'/api/hat/push'")));
test('Panel: /api/agents GET çağırıyor', () => assert(panelIcerik.includes("'/api/agents'")));
test('Panel: Ajan listesi dropdown', () => assert(panelIcerik.includes('agents.map')));
test('Panel: Title input alanı', () => assert(panelIcerik.includes('title') && panelIcerik.includes('setTitle')));
test('Panel: Plan Oluştur butonu', () => assert(panelIcerik.includes('Plan Oluştur')));
test('Panel: RED_LINE bildirim', () => assert(panelIcerik.includes('RED_LINE')));

const taskHandler = fs.readFileSync(path.join(proje, 'src/app/api/tasks/taskMutationHandler.ts'), 'utf-8');
test('API: handleTaskCreate export', () => assert(taskHandler.includes('export async function handleTaskCreate')));
test('API: assigned_to alanı', () => assert(taskHandler.includes('assigned_to')));
test('API: KARARGAH_PANELI kaynak', () => assert(taskHandler.includes('KARARGAH_PANELI')));
test('API: Supabase insert', () => assert(taskHandler.includes("supabase.from('tasks').insert")));
test('API: Telegram bildirim', () => assert(taskHandler.includes('sendTelegramNotification')));
test('API: Audit log', () => assert(taskHandler.includes('logAudit')));


// ═══════════════════════════════════════════════════════════════
// NİHAİ RAPOR
// ═══════════════════════════════════════════════════════════════
const toplam = gecen + kalan;
console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║   KOMUTA MERKEZİ → AJAN EMİR AKIŞI SONUCU                     ║');
console.log('╠══════════════════════════════════════════════════════════════════╣');
console.log(`║   GEÇEN  : ${String(gecen).padEnd(4)} / ${toplam}                                             ║`);
console.log(`║   KALAN  : ${String(kalan).padEnd(4)}                                                 ║`);
if (kalan === 0) {
  console.log('║   ✅ TÜM AKIŞLAR DOĞRULANDI — EMİR ZİNCİRİ ÇALIŞIYOR          ║');
} else {
  for (const h of hatalar) console.log(`║   ❌ ${h.ad.slice(0,55)}`);
}
console.log('╠══════════════════════════════════════════════════════════════════╣');
console.log('║   📋 EMİR AKIŞI LOGLARI:                                       ║');
for (const l of loglar) console.log(`║   ${l.slice(0, 62)}`);
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

process.exit(kalan > 0 ? 1 : 0);
}

main().catch(e => { console.error('CRASH:', e); process.exit(1); });
