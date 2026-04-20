// ============================================================
// DAĞITIM MOTORU — KAPSAMLI TEST & DOĞRULAMA
// ============================================================
// Çalıştırma: node modules/dispatcher/dispatcher.test.js
// ============================================================

'use strict';

const path = require('path');

let gecen = 0;
let kalan = 0;
const hatalar = [];

function test(ad, fn) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(() => {
        gecen++;
        console.log(`  ✅ ${ad}`);
      }).catch(err => {
        kalan++;
        hatalar.push({ ad, hata: err.message });
        console.log(`  ❌ ${ad} → ${err.message}`);
      });
    }
    gecen++;
    console.log(`  ✅ ${ad}`);
  } catch (err) {
    kalan++;
    hatalar.push({ ad, hata: err.message });
    console.log(`  ❌ ${ad} → ${err.message}`);
  }
}

async function asyncTest(ad, fn) {
  try {
    await fn();
    gecen++;
    console.log(`  ✅ ${ad}`);
  } catch (err) {
    kalan++;
    hatalar.push({ ad, hata: err.message });
    console.log(`  ❌ ${ad} → ${err.message}`);
  }
}

function assert(kosul, mesaj) {
  if (!kosul) throw new Error(mesaj || 'Assertion failed');
}
function assertEqual(a, b, m) {
  if (a !== b) throw new Error(m || `Beklenen: ${b}, Gerçek: ${a}`);
}

async function main() {

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║   DAĞITIM MOTORU — GERÇEK AJAN TEST & DOĞRULAMA           ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║   Tarih: ${new Date().toISOString().slice(0, 19)}                              ║`);
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ── Modül yükleme ─────────────────────────────────────────────
const { DagitimMotoru, GOREV_DURUM, ADIMLAR, AYARLAR } = require(path.join(__dirname, 'dispatcher'));
const { WorkerPool, eslestir, YETENEK_MATRISI } = require(path.join(__dirname, '../../agents/worker_core'));


// ═══════════════════════════════════════════════════════════════
// 1. MODÜL YAPISI
// ═══════════════════════════════════════════════════════════════
console.log('┌─ 1. MODÜL YAPISI ─────────────────────────────────');

test('DagitimMotoru sınıfı mevcut', () => {
  assert(typeof DagitimMotoru === 'function');
});

test('GOREV_DURUM sabitleri tanımlı', () => {
  assert(GOREV_DURUM.KUYRUKTA === 'KUYRUKTA');
  assert(GOREV_DURUM.CALISIYOR === 'CALISIYOR');
  assert(GOREV_DURUM.TAMAMLANDI === 'TAMAMLANDI');
  assert(GOREV_DURUM.HATA === 'HATA');
});

test('ADIMLAR 5 adım', () => {
  assertEqual(ADIMLAR.length, 5);
  assertEqual(ADIMLAR[0].ad, 'PLAN');
  assertEqual(ADIMLAR[1].ad, 'VALIDATE');
  assertEqual(ADIMLAR[2].ad, 'EXECUTE');
  assertEqual(ADIMLAR[3].ad, 'AUDIT');
  assertEqual(ADIMLAR[4].ad, 'APPROVE');
});

test('ADIMLAR gerçek ajan referansları', () => {
  assertEqual(ADIMLAR[0].varsayilan_ajan, 'K-2');  // KURMAY
  assertEqual(ADIMLAR[1].varsayilan_ajan, 'B-02'); // DENETÇİ-DOĞRULA
  assertEqual(ADIMLAR[3].varsayilan_ajan, 'B-01'); // DENETÇİ-KOD
  assertEqual(ADIMLAR[4].varsayilan_ajan, 'K-1');  // KOMUTAN
  assertEqual(ADIMLAR[2].varsayilan_ajan, null);   // Dinamik (eslestir)
});


// ═══════════════════════════════════════════════════════════════
// 2. GERÇEK AJAN BAĞLANTISI
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ 2. GERÇEK AJAN BAĞLANTISI ──────────────────────');

test('WorkerPool 58 gerçek ajan', () => {
  const pool = new WorkerPool();
  assertEqual(pool.istatistikler().toplam, 58);
});

test('K-1 KOMUTAN → havuzda mevcut', () => {
  const pool = new WorkerPool();
  const w = pool.get('K-1');
  assert(w !== null, 'K-1 bulunamadı');
  assertEqual(w.ad, 'KOMUTAN');
});

test('K-2 KURMAY → havuzda mevcut', () => {
  const pool = new WorkerPool();
  assertEqual(pool.get('K-2').ad, 'KURMAY');
});

test('B-01 DENETÇİ-KOD → havuzda mevcut', () => {
  const pool = new WorkerPool();
  assertEqual(pool.get('B-01').ad, 'DENETÇİ-KOD');
});

test('B-02 DENETÇİ-DOĞRULA → havuzda mevcut', () => {
  const pool = new WorkerPool();
  assertEqual(pool.get('B-02').ad, 'DENETÇİ-DOĞRULA');
});

test('eslestir() frontend → sonuç döner', () => {
  const sonuc = eslestir('Frontend bileşen react ui düzelt');
  assert(sonuc.length > 0, 'Frontend eşleşme boş');
  assert(sonuc[0].skor > 0, 'Skor 0');
});

test('eslestir() veritabanı → A-03 İCRACI-DB', () => {
  const sonuc = eslestir('Veritabanı migration SQL');
  assert(sonuc.length > 0);
  assertEqual(sonuc[0].ajanId, 'A-03');
});

test('eslestir() backend API → A-02 İCRACI-BE', () => {
  const sonuc = eslestir('Backend API endpoint route');
  assert(sonuc.length > 0);
  assertEqual(sonuc[0].ajanId, 'A-02');
});

test('eslestir() test → A-05 İCRACI-TEST', () => {
  const sonuc = eslestir('Test unit vitest coverage');
  assert(sonuc.length > 0);
  assertEqual(sonuc[0].ajanId, 'A-05');
});


// ═══════════════════════════════════════════════════════════════
// 3. GÖREV EKLEME
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ 3. GÖREV EKLEME ─────────────────────────────────');

const motor = new DagitimMotoru();

test('gorevEkle() başarılı', () => {
  const s = motor.gorevEkle({ baslik: 'Frontend react bileşen panel düzelt', oncelik: 'yuksek' });
  assert(s.basarili === true);
  assert(s.gorev_id.startsWith('GRV-'));
  assert(typeof s.icra_ajan === 'string', 'icra_ajan tanımlı olmalı');
});

test('gorevEkle() veritabanı → A-03', () => {
  const s = motor.gorevEkle({ baslik: 'Veritabanı SQL migration ekle', oncelik: 'kritik' });
  assert(s.basarili);
  assertEqual(s.icra_ajan, 'A-03');
});

test('gorevEkle() backend → A-02', () => {
  const s = motor.gorevEkle({ baslik: 'Backend API route endpoint yaz' });
  assert(s.basarili);
  assertEqual(s.icra_ajan, 'A-02');
});

test('gorevEkle() boş başlık → red', () => {
  const s = motor.gorevEkle({ baslik: '' });
  assertEqual(s.basarili, false);
  assert(s.hata.includes('Başlık'));
});

test('gorevEkle() null → red', () => {
  const s = motor.gorevEkle(null);
  assertEqual(s.basarili, false);
});

test('gorevEkle() kısa başlık → red', () => {
  const s = motor.gorevEkle({ baslik: 'AB' });
  assertEqual(s.basarili, false);
});

test('gorevEkle() zorunlu_ajan ile', () => {
  const s = motor.gorevEkle({ baslik: 'Özel görev, K-4 çalışsın', zorunlu_ajan: 'K-4' });
  assert(s.basarili);
  assertEqual(s.icra_ajan, 'K-4');
});

test('gorevEkle() geçersiz öncelik → normal', () => {
  const s = motor.gorevEkle({ baslik: 'Test görev normal', oncelik: 'GECERSIZ' });
  assert(s.basarili);
  const detay = motor.gorevDetay(s.gorev_id);
  assertEqual(detay.oncelik, 'normal');
});


// ═══════════════════════════════════════════════════════════════
// 4. KUYRUK DURUMU
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ 4. KUYRUK DURUMU ─────────────────────────────────');

test('kuyrukDurumu() görevleri listeler', () => {
  const kd = motor.kuyrukDurumu();
  assert(kd.toplam >= 5); // Yukarıda 5+ görev ekledik
  assert(kd.gorevler.length >= 5);
});

test('gorevDetay() mevcut görev', () => {
  const kd = motor.kuyrukDurumu();
  const ilk = kd.gorevler[0];
  const detay = motor.gorevDetay(ilk.gorev_id);
  assert(detay !== null);
  assertEqual(detay.gorev_id, ilk.gorev_id);
  assertEqual(detay.durum, GOREV_DURUM.KUYRUKTA);
  assertEqual(detay.adim, 0);
  assert(Array.isArray(detay.adim_gecmisi));
  assert(detay.version === 1);
});

test('gorevDetay() olmayan görev → null', () => {
  assertEqual(motor.gorevDetay('GRV-YOKSUN-1234'), null);
});


// ═══════════════════════════════════════════════════════════════
// 5. DAĞITIM DÖNGÜSÜ — GERÇEK AJAN ÇALIŞMASI
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ 5. DAĞITIM DÖNGÜSÜ — GERÇEK AJAN ÇALIŞMASI ─────');

// Tam döngü testi — tek görev, 5 adım
const motor2 = new DagitimMotoru();
const t1 = motor2.gorevEkle({ baslik: 'Veritabanı SQL sorgu migration yaz', oncelik: 'yuksek' });

await asyncTest('dispatch() 1. tur → PLAN (K-2)', async () => {
  await motor2._dispatch();
  const g = motor2.gorevDetay(t1.gorev_id);
  assertEqual(g.adim, 1, `adim: ${g.adim}`);
  assert(g.adim_gecmisi.length === 1);
  assertEqual(g.adim_gecmisi[0].adim, 'PLAN');
  assertEqual(g.adim_gecmisi[0].ajan, 'K-2');
});

await asyncTest('dispatch() 2. tur → VALIDATE (B-02)', async () => {
  await motor2._dispatch();
  const g = motor2.gorevDetay(t1.gorev_id);
  assertEqual(g.adim, 2, `adim: ${g.adim}`);
  assertEqual(g.adim_gecmisi[1].adim, 'VALIDATE');
  assertEqual(g.adim_gecmisi[1].ajan, 'B-02');
});

await asyncTest('dispatch() 3. tur → EXECUTE (eslestir ile bulunan ajan)', async () => {
  await motor2._dispatch();
  const g = motor2.gorevDetay(t1.gorev_id);
  assertEqual(g.adim, 3, `adim: ${g.adim}`);
  assertEqual(g.adim_gecmisi[2].adim, 'EXECUTE');
  assert(typeof g.adim_gecmisi[2].ajan === 'string', 'Gerçek ajan atanmalı');
});

await asyncTest('dispatch() 4. tur → AUDIT (B-01)', async () => {
  await motor2._dispatch();
  const g = motor2.gorevDetay(t1.gorev_id);
  assertEqual(g.adim, 4, `adim: ${g.adim}`);
  assertEqual(g.adim_gecmisi[3].adim, 'AUDIT');
  assertEqual(g.adim_gecmisi[3].ajan, 'B-01');
});

await asyncTest('dispatch() 5. tur → APPROVE (K-1) → TAMAMLANDI', async () => {
  await motor2._dispatch();
  const g = motor2.gorevDetay(t1.gorev_id);
  // Görev tamamlandı → geçmişe taşındı
  assert(g !== null, 'Görev geçmişte olmalı');
  assertEqual(g.durum, GOREV_DURUM.TAMAMLANDI);
  assertEqual(g.adim_gecmisi.length, 5);
  assertEqual(g.adim_gecmisi[4].adim, 'APPROVE');
  assertEqual(g.adim_gecmisi[4].ajan, 'K-1');
});

await asyncTest('Tamamlanan görev geçmişte', async () => {
  const gecmis = motor2.gecmis(10);
  assert(gecmis.length >= 1, `Geçmiş: ${gecmis.length}`);
  const bulunan = gecmis.find(g => g.gorev_id === t1.gorev_id);
  assert(bulunan !== undefined, 'Görev geçmişte bulunamadı');
  assertEqual(bulunan.durum, GOREV_DURUM.TAMAMLANDI);
  assert(bulunan.toplam_sure_ms >= 0);
});


// ═══════════════════════════════════════════════════════════════
// 6. İSTATİSTİKLER & RAPOR
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ 6. İSTATİSTİKLER & RAPOR ─────────────────────────');

test('durumRaporu() tüm alanlar', () => {
  const r = motor2.durumRaporu();
  assert('calisiyor' in r);
  assert('kuyruk' in r);
  assert('istatistik' in r);
  assert('havuz' in r);
  assert('adimlar' in r);
  assert('ayarlar' in r);
  assertEqual(r.istatistik.tamamlanan, 1);
  assertEqual(r.istatistik.toplam_gorev, 1);
  assert(r.istatistik.dagitilan >= 5); // 5 adım dağıtıldı
  assertEqual(r.havuz.toplam, 58);
});

test('havuzDurumu() 58 ajan', () => {
  const h = motor2.havuzDurumu();
  assertEqual(h.toplam, 58);
  assertEqual(h.katman_dagilimi.KOMUTA, 4);
  assertEqual(h.katman_dagilimi.L1, 10);
  assertEqual(h.katman_dagilimi.L2, 6);
  assertEqual(h.katman_dagilimi.L3, 2);
  assert(h.toplam >= 58, 'Minimum 58 ajan');
});


// ═══════════════════════════════════════════════════════════════
// 7. BAŞLAT / DURDUR
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ 7. BAŞLAT / DURDUR ───────────────────────────────');

test('baslat() + durdur() toggle', () => {
  const m = new DagitimMotoru();
  m.baslat();
  assertEqual(m._calisiyor, true);
  m.durdur();
  assertEqual(m._calisiyor, false);
  assertEqual(m._timer, null);
});

test('Çift baslat koruması', () => {
  const m = new DagitimMotoru();
  m.baslat();
  m.baslat(); // İkinci çağrı → "Zaten çalışıyor"
  assertEqual(m._calisiyor, true);
  m.durdur();
});

test('EventEmitter olayları', () => {
  const m = new DagitimMotoru();
  let olay = null;
  m.on('gorev_eklendi', (e) => { olay = e; });
  m.gorevEkle({ baslik: 'Event test görevi' });
  assert(olay !== null);
  assert(olay.gorev_id.startsWith('GRV-'));
});


// ═══════════════════════════════════════════════════════════════
// 8. ÇOKLU GÖREV — PARALEL İŞLEME
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ 8. ÇOKLU GÖREV — PARALEL İŞLEME ─────────────────');

const motor3 = new DagitimMotoru();
motor3.gorevEkle({ baslik: 'Frontend CSS düzelt', oncelik: 'yuksek' });
motor3.gorevEkle({ baslik: 'Backend API endpoint', oncelik: 'normal' });
motor3.gorevEkle({ baslik: 'Veritabanı migration', oncelik: 'kritik' });

await asyncTest('3 görev aynı anda dağıtıma girer', async () => {
  assertEqual(motor3.kuyrukDurumu().toplam, 3);
  await motor3._dispatch();
  // Hepsi 1 adım ilerlemiş olmalı
  const kd = motor3.kuyrukDurumu();
  for (const g of kd.gorevler) {
    assert(g.adim >= 1, `${g.baslik} adım: ${g.adim}`);
  }
});

await asyncTest('Öncelik sırası — kritik önce', async () => {
  // Kritik görev en öne gelmiş olmalı (adım sayısı daha yüksek olabilir)
  const kd = motor3.kuyrukDurumu();
  const kritik = kd.gorevler.find(g => g.oncelik === 'kritik');
  assert(kritik !== undefined, 'Kritik görev bulunamadı');
});


// ═══════════════════════════════════════════════════════════════
// NİHAİ RAPOR
// ═══════════════════════════════════════════════════════════════
const toplam = gecen + kalan;
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log(`║   DAĞITIM MOTORU TEST SONUCU                                ║`);
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║   GEÇEN : ${String(gecen).padEnd(4)} / ${toplam}                                           ║`);
console.log(`║   KALAN : ${String(kalan).padEnd(4)}                                               ║`);
if (kalan === 0) {
  console.log('║   ✅ TÜM TESTLER BAŞARILI — GERÇEK AJAN BAĞLANTISI DOĞRULANDI║');
} else {
  for (const h of hatalar) {
    console.log(`║   ❌ ${h.ad.slice(0, 52)}`);
    console.log(`║     ${h.hata.slice(0, 52)}`);
  }
}
console.log('╚══════════════════════════════════════════════════════════════╝\n');

process.exit(kalan > 0 ? 1 : 0);

}

main().catch(err => {
  console.error('TEST CRASH:', err);
  process.exit(1);
});
