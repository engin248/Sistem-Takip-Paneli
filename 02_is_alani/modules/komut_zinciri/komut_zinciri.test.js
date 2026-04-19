// ============================================================
// KOMUT ZİNCİRİ — UÇTAN UCA TEST
// ============================================================
// Panel → GorevKabul → Onay → Dispatcher → Ajan → AI → TAMAM
// ============================================================

'use strict';

const { KomutZinciri } = require('./komut_zinciri');

let gecen = 0;
let kalan = 0;
const hatalar = [];

function test(ad, fn) {
  try { fn(); gecen++; console.log(`  ✅ ${ad}`); }
  catch (e) { kalan++; hatalar.push({ ad, h: e.message }); console.log(`  ❌ ${ad} → ${e.message}`); }
}
async function asyncTest(ad, fn) {
  try { await fn(); gecen++; console.log(`  ✅ ${ad}`); }
  catch (e) { kalan++; hatalar.push({ ad, h: e.message }); console.log(`  ❌ ${ad} → ${e.message}`); }
}
function assert(c, m) { if (!c) throw new Error(m || 'Fail'); }
function assertEqual(a, b, m) { if (a !== b) throw new Error(m || `Beklenen: ${b}, Gercek: ${a}`); }

async function main() {
console.log('\n' + '='.repeat(60));
console.log('  KOMUT ZİNCİRİ — UÇTAN UCA TEST');
console.log('  Panel → GorevKabul → Onay → Dispatcher → Ajan → AI');
console.log('='.repeat(60) + '\n');

// ── 1. ZİNCİR KURULUMU ──────────────────────────────────
console.log('┌─ 1. ZİNCİR KURULUMU ──────────────────────────────');

test('KomutZinciri olusturulur', () => {
  const z = new KomutZinciri();
  assert(z !== null);
});

// ── 2. KOMUT GÖNDERİMİ ─────────────────────────────────
console.log('\n┌─ 2. KOMUT GÖNDERİMİ ─────────────────────────────');
const zincir = new KomutZinciri();

test('komutGonder() basarili', () => {
  const r = zincir.komutGonder({ icerik: 'Frontend React panel bilesenini duzelt' });
  assert(r.basarili);
  assert(r.komut_id.startsWith('KMT-'));
  assertEqual(r.onay_gerekli, true);
});

test('Bekleyenler listesi dogru', () => {
  const b = zincir.bekleyenler();
  assert(b.length >= 1, `Bekleyen: ${b.length}`);
});

// ── 3. ONAY → DISPATCHER AKTARIM ──────────────────────
console.log('\n┌─ 3. ONAY → DISPATCHER AKTARIM ────────────────────');

let dispatched = null;
zincir.on('komut_dispatched', (e) => { dispatched = e; });

const komut2 = zincir.komutGonder({ icerik: 'Veritabani SQL migration schema olustur' });

test('Onay ver → ONAYLANDI', () => {
  const onay = zincir.onayVer(komut2.komut_id, true);
  assert(onay.basarili);
  assertEqual(onay.durum, 'ONAYLANDI');
});

test('Dispatcher event tetiklendi', () => {
  assert(dispatched !== null, 'komut_dispatched olayı gelmedi');
  assert(dispatched.gorev_id.startsWith('GRV-'), `GRV yok: ${dispatched.gorev_id}`);
  assert(typeof dispatched.icra_ajan === 'string', 'Icra ajan atanmadi');
});

test('Gorev dispatcher kuyruğunda', () => {
  const kd = zincir.kuyrukDurumu();
  assert(kd.toplam >= 1, `Kuyruk bos: ${kd.toplam}`);
});

// ── 4. 5 ADIM PIPELINE (GERCEK AI) ─────────────────────
console.log('\n┌─ 4. 5 ADIM PIPELINE (GERCEK AI) ──────────────────');

const gorev_id = dispatched.gorev_id;

await asyncTest('Adim 1: PLAN (K-2 KURMAY)', async () => {
  await zincir.tikla();
  const g = zincir.gorevDetay(gorev_id);
  assert(g.adim >= 1, `adim: ${g.adim}`);
  assertEqual(g.adim_gecmisi[0].adim, 'PLAN');
  console.log(`    → ${g.adim_gecmisi[0].ajan} (${g.adim_gecmisi[0].ajan_ad}) [${g.adim_gecmisi[0].sure_ms}ms]`);
});

await asyncTest('Adim 2: VALIDATE (B-02)', async () => {
  await zincir.tikla();
  const g = zincir.gorevDetay(gorev_id);
  assert(g.adim >= 2);
  assertEqual(g.adim_gecmisi[1].adim, 'VALIDATE');
  console.log(`    → ${g.adim_gecmisi[1].ajan} (${g.adim_gecmisi[1].ajan_ad}) [${g.adim_gecmisi[1].sure_ms}ms]`);
});

await asyncTest('Adim 3: EXECUTE (eslestir ile)', async () => {
  await zincir.tikla();
  const g = zincir.gorevDetay(gorev_id);
  assert(g.adim >= 3);
  assertEqual(g.adim_gecmisi[2].adim, 'EXECUTE');
  console.log(`    → ${g.adim_gecmisi[2].ajan} (${g.adim_gecmisi[2].ajan_ad}) [${g.adim_gecmisi[2].sure_ms}ms]`);
});

await asyncTest('Adim 4: AUDIT (B-01)', async () => {
  await zincir.tikla();
  const g = zincir.gorevDetay(gorev_id);
  assert(g.adim >= 4);
  assertEqual(g.adim_gecmisi[3].adim, 'AUDIT');
  console.log(`    → ${g.adim_gecmisi[3].ajan} (${g.adim_gecmisi[3].ajan_ad}) [${g.adim_gecmisi[3].sure_ms}ms]`);
});

await asyncTest('Adim 5: APPROVE (K-1) → TAMAMLANDI', async () => {
  await zincir.tikla();
  const g = zincir.gorevDetay(gorev_id);
  assert(g !== null);
  assertEqual(g.durum, 'TAMAMLANDI');
  assertEqual(g.adim_gecmisi.length, 5);
  console.log(`    → ${g.adim_gecmisi[4].ajan} (${g.adim_gecmisi[4].ajan_ad}) [${g.adim_gecmisi[4].sure_ms}ms]`);
});

// ── 5. RED SENARYOSU ────────────────────────────────────
console.log('\n┌─ 5. RED SENARYOSU ────────────────────────────────');

test('Red + duzeltme → yeni komut', () => {
  const k = zincir.komutGonder({ icerik: 'Birsey yap' });
  const red = zincir.onayVer(k.komut_id, false, 'React panele yeni buton ekle');
  assert(red.basarili);
  assert(red.komut_id.startsWith('KMT-'));
});

// ── 6. DURUM RAPORU ─────────────────────────────────────
console.log('\n┌─ 6. DURUM RAPORU ─────────────────────────────────');

test('Birlesik durum raporu', () => {
  const r = zincir.durumRaporu();
  assert('kabul' in r);
  assert('dispatcher' in r);
  assertEqual(r.zincir_durumu, 'AKTIF');
  assert(r.dispatcher.istatistik.tamamlanan >= 1);
});


// ═════════════════════════════════════════════════════════
const toplam = gecen + kalan;
console.log('\n' + '='.repeat(60));
console.log(`  GECEN: ${gecen} / ${toplam}`);
if (kalan === 0) {
  console.log('  ✅ TUM ZINCIR CALISIYOR — KOPUKLUK GİDERİLDİ');
} else {
  for (const h of hatalar) console.log(`  ❌ ${h.ad}: ${h.h}`);
}
console.log('='.repeat(60) + '\n');
process.exit(kalan > 0 ? 1 : 0);
}

main().catch(e => { console.error('CRASH:', e); process.exit(1); });
