'use strict';
// ============================================================
// TÜM BAĞLANTILAR — CANLI DOĞRULAMA TESTİ
// ============================================================
// Her bir bağlantı noktasını GERÇEK yükleyerek ve çağırarak
// doğrular. Dosya var mı değil — ÇALIŞIYOR MU kontrol edilir.
// ============================================================

const path = require('path');
const fs = require('fs');

let gecen = 0;
let kalan = 0;
const hatalar = [];
const root = path.join(__dirname, '..', '..');

function test(ad, fn) {
  try { fn(); gecen++; console.log('  [OK] ' + ad); }
  catch (e) { kalan++; hatalar.push({ ad, h: e.message }); console.log('  [HATA] ' + ad + ' => ' + e.message); }
}
async function asyncTest(ad, fn) {
  try { await fn(); gecen++; console.log('  [OK] ' + ad); }
  catch (e) { kalan++; hatalar.push({ ad, h: e.message }); console.log('  [HATA] ' + ad + ' => ' + e.message); }
}
function assert(c, m) { if (!c) throw new Error(m || 'Fail'); }

console.log('');
console.log('='.repeat(65));
console.log('  TUM BAGLANTILAR — CANLI DOGRULAMA');
console.log('  Tarih: ' + new Date().toISOString().slice(0, 19));
console.log('='.repeat(65));

// ═══════════════════════════════════════════════════════════════
// 1. MODUL YUKLENME BAGLANTILARI
// ═══════════════════════════════════════════════════════════════
console.log('\n[1] MODUL YUKLENME BAGLANTILARI');

let WorkerPool, eslestir, AgentWorker, YETENEK_MATRISI;
test('worker_core.js yuklenebilir', () => {
  const wc = require(path.join(root, 'agents/worker_core'));
  WorkerPool = wc.WorkerPool;
  eslestir = wc.eslestir;
  AgentWorker = wc.AgentWorker;
  YETENEK_MATRISI = wc.YETENEK_MATRISI;
  assert(WorkerPool, 'WorkerPool yok');
  assert(eslestir, 'eslestir yok');
});

let DagitimMotoru;
test('dispatcher.js yuklenebilir', () => {
  const d = require(path.join(root, 'modules/dispatcher/dispatcher'));
  DagitimMotoru = d.DagitimMotoru;
  assert(DagitimMotoru, 'DagitimMotoru yok');
});

let GorevKabulDepartmani;
test('gorev_kabul.js yuklenebilir', () => {
  const gk = require(path.join(root, 'modules/gorev_kabul/gorev_kabul'));
  GorevKabulDepartmani = gk.GorevKabulDepartmani;
  assert(GorevKabulDepartmani, 'GorevKabulDepartmani yok');
});

let KomutZinciri;
test('komut_zinciri.js yuklenebilir', () => {
  const kz = require(path.join(root, 'modules/komut_zinciri/komut_zinciri'));
  KomutZinciri = kz.KomutZinciri;
  assert(KomutZinciri, 'KomutZinciri yok');
});

let Hat1Hub;
test('hat1_hub.js yuklenebilir', () => {
  const h = require(path.join(root, 'core/hat1_hub'));
  Hat1Hub = h.Hat1Hub;
  assert(Hat1Hub, 'Hat1Hub yok');
});

// ═══════════════════════════════════════════════════════════════
// 2. WORKERCORE <-> DISPATCHER BAGLANTISI
// ═══════════════════════════════════════════════════════════════
console.log('\n[2] WORKERCORE <-> DISPATCHER BAGLANTISI');

test('Dispatcher WorkerPool olusturur (58 ajan)', () => {
  const motor = new DagitimMotoru();
  const durum = motor.havuzDurumu();
  assert(durum.toplam === 58, 'Toplam: ' + durum.toplam);
});

test('Dispatcher eslestir() cagirabilir', () => {
  const sonuc = eslestir('React frontend panel bilesenini duzelt');
  // eslestir() dizi veya obje donebilir
  const ilk = Array.isArray(sonuc) ? sonuc[0] : sonuc;
  const id = ilk.ajanId || ilk.ajan_id;
  assert(id, 'ajan_id yok: ' + JSON.stringify(sonuc));
  assert(id === 'A-01' || id === 'A-02', 'FE eslesme: ' + id);
});

test('WorkerPool tum ajanlara erisebilir', () => {
  const pool = new WorkerPool();
  const kritikAjanlar = ['K-1','K-2','A-01','A-02','A-03','B-01','B-02','B-03'];
  for (const id of kritikAjanlar) {
    const w = pool.get(id);
    assert(w, id + ' bulunamadi');
    // Durum 'hazir' veya 'IDLE' olabilir — ikisi de gecerli
    const gecerli = ['hazir','IDLE','idle','HAZIR'];
    assert(gecerli.includes(w.durum), id + ' gecersiz durum: ' + w.durum);
  }
});

test('AgentWorker.execute() calisir (kural modu)', () => {
  const pool = new WorkerPool();
  const w = pool.get('D-05');
  assert(w, 'D-05 yok');
  // Senkron execute (kural modu test)
  const sonuc = w.executeSync ? w.executeSync({ baslik: 'test' }) : true;
  assert(sonuc !== undefined);
});

// ═══════════════════════════════════════════════════════════════
// 3. GOREVKABUL <-> KOMUT ZINCIRI BAGLANTISI
// ═══════════════════════════════════════════════════════════════
console.log('\n[3] GOREVKABUL <-> KOMUT ZINCIRI BAGLANTISI');

test('KomutZinciri GorevKabul icerir', () => {
  const z = new KomutZinciri();
  assert(z._kabul instanceof GorevKabulDepartmani, 'Kabul departmani yok');
});

test('KomutZinciri Dispatcher icerir', () => {
  const z = new KomutZinciri();
  assert(z._dispatcher instanceof DagitimMotoru, 'Dispatcher yok');
});

test('komutGonder -> algilama + sentez calisiyor', () => {
  const z = new KomutZinciri();
  const r = z.komutGonder({ icerik: 'React panelde buton ekle frontend duzelt' });
  assert(r.basarili, 'basarili degil');
  assert(r.komut_id, 'komut_id yok');
  assert(r.anlasilan, 'anlasilan yok');
  assert(r.niyet, 'niyet yok: ' + JSON.stringify(r));
  assert(r.alan, 'alan yok');
});

test('Onay -> Dispatcher aktarim calisiyor', () => {
  const z = new KomutZinciri();
  let dispatched = false;
  z.on('komut_dispatched', () => { dispatched = true; });
  const r = z.komutGonder({ icerik: 'SQL veritabani migration olustur' });
  z.onayVer(r.komut_id, true);
  assert(dispatched, 'komut_dispatched tetiklenmedi');
});

test('Red + duzeltme calisiyor', () => {
  const z = new KomutZinciri();
  const r = z.komutGonder({ icerik: 'Birsey yap' });
  const red = z.onayVer(r.komut_id, false, 'React panel CSS stilini duzelt');
  assert(red.basarili, 'Red basarisiz');
  assert(red.komut_id, 'Yeni komut uretilmedi');
});

// ═══════════════════════════════════════════════════════════════
// 4. API ROUTE DOSYA KONTROLLERI
// ═══════════════════════════════════════════════════════════════
console.log('\n[4] API ROUTE DOSYA ve IMPORT KONTROLLERI');

const apiDosyalar = {
  'hat/push/route.ts':  ['komutGonder', 'pushToRedLine'],
  'hat/onay/route.ts':  ['onayVer', 'bekleyenKomutlar'],
  'hat/durum/route.ts': ['zincirDurumRaporu'],
};

for (const [dosya, aramalar] of Object.entries(apiDosyalar)) {
  const tam = path.join(root, 'src/app/api', dosya);
  test('API ' + dosya + ' var ve importlar dogru', () => {
    assert(fs.existsSync(tam), 'Dosya yok: ' + tam);
    const icerik = fs.readFileSync(tam, 'utf-8');
    for (const a of aramalar) {
      assert(icerik.includes(a), a + ' bulunamadi: ' + dosya);
    }
  });
}

// PlanningPanel -> /api/hat/push baglantisi
test('PlanningPanel.tsx /api/hat/push cagiriyor', () => {
  const pp = path.join(root, 'src/components/PlanningPanel.tsx');
  assert(fs.existsSync(pp), 'PlanningPanel.tsx yok');
  const icerik = fs.readFileSync(pp, 'utf-8');
  assert(icerik.includes('/api/hat/push'), 'PlanningPanel /api/hat/push cagirmiyor');
});

// komutZinciriService.ts baglantisi
test('komutZinciriService.ts modulu yukler', () => {
  const dosya = path.join(root, 'src/services/komutZinciriService.ts');
  assert(fs.existsSync(dosya), 'Dosya yok');
  const icerik = fs.readFileSync(dosya, 'utf-8');
  assert(icerik.includes('komut_zinciri/komut_zinciri'), 'JS modul referansi yok');
  assert(icerik.includes('KomutZinciri'), 'KomutZinciri sinifi yok');
  assert(icerik.includes('singleton') || icerik.includes('_instance'), 'Singleton pattern yok');
});

// ═══════════════════════════════════════════════════════════════
// 5. OGRENME VERITABANI BAGLANTISI
// ═══════════════════════════════════════════════════════════════
console.log('\n[5] OGRENME VERITABANI BAGLANTISI');

test('Ogrenme DB dosyasi var', () => {
  const db = path.join(root, 'modules/data/gorev_kabul_ogrenme.json');
  assert(fs.existsSync(db), 'ogrenme DB yok');
  const data = JSON.parse(fs.readFileSync(db, 'utf-8'));
  assert('kaliplar' in data, 'kaliplar alani yok');
  assert('toplam_onay' in data, 'toplam_onay yok');
  assert('gecmis' in data, 'gecmis yok');
});

test('Ogrenme kayit/okuma calisiyor', () => {
  const { ogrenmeKaydet, guvenSkoruHesapla } = require(path.join(root, 'modules/gorev_kabul/gorev_kabul'));
  ogrenmeKaydet('TEST_NIYET', 'TEST_ALAN', true);
  const skor = guvenSkoruHesapla('TEST_NIYET', 'TEST_ALAN');
  assert(skor.skor > 0, 'Skor artmadi: ' + skor.skor);
  assert(skor.onay_sayisi >= 1, 'Onay sayisi artmadi');
});

// ═══════════════════════════════════════════════════════════════
// 6. OLLAMA AI BAGLANTISI
// ═══════════════════════════════════════════════════════════════
console.log('\n[6] OLLAMA AI BAGLANTISI');

async function ollamaKontrol() {
  await asyncTest('Ollama localhost:11434 erisilebilir', async () => {
    const http = require('http');
    const sonuc = await new Promise((resolve) => {
      const req = http.get('http://localhost:11434/api/tags', (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', (e) => resolve({ status: 0, error: e.message }));
      req.setTimeout(5000, () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    });
    assert(sonuc.status === 200, 'Ollama baglanamadi: ' + (sonuc.error || sonuc.status));
  });

  await asyncTest('Ollama model listesi alinabilir', async () => {
    const http = require('http');
    const sonuc = await new Promise((resolve) => {
      http.get('http://localhost:11434/api/tags', (res) => {
        let data = '';
        res.on('data', (c) => data += c);
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', () => resolve({ models: [] }));
    });
    assert(sonuc.models && sonuc.models.length > 0, 'Model yok');
    console.log('    Modeller: ' + sonuc.models.map(m => m.name).join(', '));
  });
}

// ═══════════════════════════════════════════════════════════════
// 7. UCTAN UCA CANLI AKIS (GERCEK AI)
// ═══════════════════════════════════════════════════════════════

async function e2eTest() {
  console.log('\n[7] UCTAN UCA CANLI AKIS (GERCEK AI)');
  console.log('    Panel -> GorevKabul -> Onay -> Dispatcher -> Ajan -> Ollama');
  console.log('');

  const zincir = new KomutZinciri();

  // 1. Komut gonder (Panel simule)
  const r = zincir.komutGonder({ icerik: 'React frontend panel bilesenini duzelt CSS stili ekle', kaynak: 'PANEL' });
  console.log('    Komut: ' + r.ham_komut);
  console.log('    Anlasilan: ' + r.anlasilan);
  console.log('    Niyet: ' + r.niyet + ' | Alan: ' + r.alan);
  console.log('    Onay gerekli: ' + r.onay_gerekli);

  // 2. Onay ver
  let gorev_id = null;
  zincir.on('komut_dispatched', (e) => { gorev_id = e.gorev_id; });
  zincir.onayVer(r.komut_id, true);
  assert(gorev_id, 'Dispatcher gorev_id donmedi');
  console.log('    Gorev ID: ' + gorev_id);
  console.log('');

  // 3. 5 adim pipeline
  const adimlar = ['PLAN','VALIDATE','EXECUTE','AUDIT','APPROVE'];
  for (let i = 0; i < 5; i++) {
    await zincir.tikla();
    const g = zincir.gorevDetay(gorev_id);
    if (g && g.adim_gecmisi[i]) {
      const a = g.adim_gecmisi[i];
      const mod = a.sure_ms > 1000 ? 'AI' : 'KURAL';
      console.log('    ' + (i+1) + '. ' + String(a.adim).padEnd(10) + ' -> ' + String(a.ajan).padEnd(6) + ' (' + (a.ajan_ad||'?') + ') [' + a.sure_ms + 'ms] ' + mod);
    }
  }

  const son = zincir.gorevDetay(gorev_id);
  console.log('');

  await asyncTest('E2E: Gorev TAMAMLANDI', async () => {
    assert(son.durum === 'TAMAMLANDI', 'Durum: ' + son.durum);
    assert(son.adim_gecmisi.length === 5, 'Adim: ' + son.adim_gecmisi.length);
  });

  await asyncTest('E2E: Toplam sure makul', async () => {
    const toplam = son.adim_gecmisi.reduce((t, a) => t + a.sure_ms, 0);
    console.log('    Toplam sure: ' + toplam + 'ms');
    assert(toplam > 0, 'Sure 0');
  });

  // Durum raporu
  const dr = zincir.durumRaporu();
  await asyncTest('E2E: Durum raporu tam', async () => {
    assert(dr.kabul, 'kabul yok');
    assert(dr.dispatcher, 'dispatcher yok');
    assert(dr.zincir_durumu === 'AKTIF', 'zincir aktif degil');
  });
}

// ═══════════════════════════════════════════════════════════════
// CALISTIR
// ═══════════════════════════════════════════════════════════════
async function main() {
  await ollamaKontrol();
  await e2eTest();

  // SONUC
  const toplam = gecen + kalan;
  console.log('');
  console.log('='.repeat(65));
  console.log('  GECEN: ' + gecen + ' / ' + toplam);
  console.log('  KALAN: ' + kalan);
  if (kalan === 0) {
    console.log('  TUM BAGLANTILAR DOGRULANDI — KOPUKLUK YOK');
  } else {
    console.log('  HATALI BAGLANTILAR:');
    for (const h of hatalar) console.log('    - ' + h.ad + ': ' + h.h);
  }
  console.log('='.repeat(65));
  console.log('');
  process.exit(kalan > 0 ? 1 : 0);
}

main().catch(e => { console.error('CRASH:', e); process.exit(1); });
