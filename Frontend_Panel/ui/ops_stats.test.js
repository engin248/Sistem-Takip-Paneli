// ============================================================
// ui/ops_stats.test.js — İSTATİSTİK ENTEGRASYONU TESTLERİ
// ============================================================
// Çalıştırma: node ui/ops_stats.test.js
// ============================================================

'use strict';

const { OpsStatsConnector, bosSnapshot } = require('./ops_stats');

let gecen = 0;
let kalan = 0;
const hatalar = [];

function test(ad, fn) {
  try {
    fn();
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

function assertEqual(gercek, beklenen, mesaj) {
  if (gercek !== beklenen) {
    throw new Error(mesaj || `Beklenen: ${beklenen}, Gerçek: ${gercek}`);
  }
}

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║   OPS_STATS — İSTATİSTİK ENTEGRASYON TESTLERİ  ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log(`║   Tarih: ${new Date().toISOString().slice(0, 19)}            ║`);
console.log('╚══════════════════════════════════════════════════╝\n');

// ── 1. BOŞ SNAPSHOT ────────────────────────────────────
console.log('┌─ 1. BOŞ SNAPSHOT ─────────────────────────────────');

test('bosSnapshot() tüm alanları sıfır döner', () => {
  const s = bosSnapshot();
  assertEqual(s.tamamlanan, 0);
  assertEqual(s.bekleyen, 0);
  assertEqual(s.devam_eden, 0);
  assertEqual(s.hata, 0);
  assertEqual(s.toplam, 0);
  assertEqual(s.basari_orani, 0);
  assertEqual(s.kaynak, 'bos');
});

test('bosSnapshot() timestamp içeriyor', () => {
  const s = bosSnapshot();
  assert(s.timestamp.length > 0, 'Timestamp boş');
  assert(s.timestamp.includes('T'), 'ISO formatta olmalı');
});

// ── 2. CONNECTOR OLUŞTURMA ────────────────────────────
console.log('\n┌─ 2. CONNECTOR OLUŞTURMA ──────────────────────────');

test('OpsStatsConnector başarılı oluşturulur', () => {
  const c = new OpsStatsConnector();
  assert(c !== null);
  assertEqual(typeof c.subscribe, 'function');
  assertEqual(typeof c.guncelle, 'function');
  assertEqual(typeof c.baslat, 'function');
  assertEqual(typeof c.durdur, 'function');
});

test('Başlangıç snapshot sıfırlarla dolu', () => {
  const c = new OpsStatsConnector();
  const s = c.getSnapshot();
  assertEqual(s.tamamlanan, 0);
  assertEqual(s.bekleyen, 0);
  assertEqual(s.toplam, 0);
});

// ── 3. SUBSCRIBE/LISTENER ─────────────────────────────
console.log('\n┌─ 3. SUBSCRIBE / LISTENER ─────────────────────────');

test('subscribe() ilk çağrıda snapshot bildirir', () => {
  const c = new OpsStatsConnector();
  let alindi = false;
  c.subscribe((snapshot) => {
    alindi = true;
    assert(typeof snapshot.tamamlanan === 'number');
    assert(typeof snapshot.bekleyen === 'number');
  });
  assert(alindi, 'Callback çağrılmalıydı');
});

test('subscribe() unsubscribe fonksiyonu döner', () => {
  const c = new OpsStatsConnector();
  const unsub = c.subscribe(() => {});
  assertEqual(typeof unsub, 'function');
});

test('unsubscribe sonrası listener çalışmaz', () => {
  const c = new OpsStatsConnector();
  let sayac = 0;
  const unsub = c.subscribe(() => { sayac++; });
  // İlk subscribe'da 1 kez çağrılır
  assertEqual(sayac, 1);
  unsub();
  // Artık _bildir çağrılsa bile sayac artmaz
  c._bildir();
  assertEqual(sayac, 1, 'Unsubscribe sonrası listener çağrılmamalı');
});

test('subscribe() fonksiyon olmayan parametre → hata', () => {
  const c = new OpsStatsConnector();
  let fi = false;
  try { c.subscribe('string'); } catch { fi = true; }
  assert(fi, 'Hata beklendi');
});

test('Birden fazla listener kayıt ve bildirim', () => {
  const c = new OpsStatsConnector();
  let sayac1 = 0, sayac2 = 0;
  c.subscribe(() => { sayac1++; });
  c.subscribe(() => { sayac2++; });
  // Her ikisi de ilk subscribe'da çağrılır
  assertEqual(sayac1, 1);
  assertEqual(sayac2, 1);
  // _bildir ile tekrar
  c._bildir();
  assertEqual(sayac1, 2);
  assertEqual(sayac2, 2);
});

// ── 4. SAYAÇLAR ───────────────────────────────────────
console.log('\n┌─ 4. SAYAÇLAR ─────────────────────────────────────');

test('getSayaclar() başlangıçta sıfır', () => {
  const c = new OpsStatsConnector();
  const s = c.getSayaclar();
  assertEqual(s.tamamlanan, 0);
  assertEqual(s.bekleyen, 0);
  assertEqual(s.oran, 0);
});

test('getSayaclar() snapshot değişince güncellenir', () => {
  const c = new OpsStatsConnector();
  // Snapshot'ı elle güncelle (test amaçlı)
  c._snapshot.tamamlanan = 7;
  c._snapshot.bekleyen = 3;
  c._snapshot.toplam = 10;
  const s = c.getSayaclar();
  assertEqual(s.tamamlanan, 7);
  assertEqual(s.bekleyen, 3);
  assertEqual(s.oran, 70);
});

// ── 5. ÖZET VE SAĞLIK ────────────────────────────────
console.log('\n┌─ 5. ÖZET VE SAĞLIK ───────────────────────────────');

test('getOzet() tüm alanları içeriyor', () => {
  const c = new OpsStatsConnector();
  const o = c.getOzet();
  assert('tamamlanan' in o);
  assert('bekleyen' in o);
  assert('hata' in o);
  assert('toplam' in o);
  assert('basari_orani' in o);
  assert('aktif_ajan' in o);
  assert('son_guncelleme' in o);
  assertEqual(o.durum, 'DURDU');
});

test('getSaglik() sağlıklı başlangıç', () => {
  const c = new OpsStatsConnector();
  const s = c.getSaglik();
  assertEqual(s.saglik, 'SAĞLIKLI');
  assertEqual(s.polling_aktif, false);
  assertEqual(s.ardisik_hata, 0);
  assertEqual(s.son_hata, null);
});

test('getSaglik() hata sayacı kontrolü', () => {
  const c = new OpsStatsConnector();
  c._basarisizFetch = 3;
  c._sonHata = 'Test hatası';
  const s = c.getSaglik();
  assertEqual(s.saglik, 'UYARI');
  assertEqual(s.ardisik_hata, 3);
  assertEqual(s.son_hata, 'Test hatası');
});

// ── 6. GEÇMİŞ VE TREND ──────────────────────────────
console.log('\n┌─ 6. GEÇMİŞ VE TREND ─────────────────────────────');

test('getGecmis() başlangıçta boş', () => {
  const c = new OpsStatsConnector();
  assertEqual(c.getGecmis().length, 0);
});

test('getGecmis(son) parametresi çalışıyor', () => {
  const c = new OpsStatsConnector();
  // Geçmişe elle veri ekle
  for (let i = 0; i < 10; i++) {
    c._gecmis.push({ ...bosSnapshot(), tamamlanan: i });
  }
  assertEqual(c.getGecmis().length, 10);
  assertEqual(c.getGecmis(3).length, 3);
  assertEqual(c.getGecmis(3)[2].tamamlanan, 9);
});

test('getTrend() az veriyle "—" döner', () => {
  const c = new OpsStatsConnector();
  const t = c.getTrend();
  assertEqual(t.tamamlanan_trend, '—');
  assertEqual(t.bekleyen_trend, '—');
});

test('getTrend() artış tespiti', () => {
  const c = new OpsStatsConnector();
  c._gecmis.push({ ...bosSnapshot(), tamamlanan: 5, bekleyen: 3, hata: 1 });
  c._gecmis.push({ ...bosSnapshot(), tamamlanan: 8, bekleyen: 1, hata: 2 });
  const t = c.getTrend();
  assertEqual(t.tamamlanan_trend, '↑3');
  assertEqual(t.bekleyen_trend, '↓2');
  assertEqual(t.hata_trend, '↑1');
});

test('getTrend() değişiklik yok → "→"', () => {
  const c = new OpsStatsConnector();
  c._gecmis.push({ ...bosSnapshot(), tamamlanan: 5, bekleyen: 3, hata: 1 });
  c._gecmis.push({ ...bosSnapshot(), tamamlanan: 5, bekleyen: 3, hata: 1 });
  const t = c.getTrend();
  assertEqual(t.tamamlanan_trend, '→');
  assertEqual(t.bekleyen_trend, '→');
});

// ── 7. POLLING KONTROL ──────────────────────────────
console.log('\n┌─ 7. POLLING KONTROL ──────────────────────────────');

test('baslat/durdur toggle', () => {
  const c = new OpsStatsConnector();
  assertEqual(c._aktif, false);
  c.baslat(60000); // çok uzun interval — test bitmeden tetiklenmez
  assertEqual(c._aktif, true);
  assert(c._pollTimer !== null, 'Timer oluşmuş olmalı');
  c.durdur();
  assertEqual(c._aktif, false);
  assertEqual(c._pollTimer, null);
});

test('Çift baslat çağrısı koruma', () => {
  const c = new OpsStatsConnector();
  c.baslat(60000);
  const timer1 = c._pollTimer;
  c.baslat(60000); // tekrar çağrılmamalı
  assert(c._pollTimer === timer1, 'Aynı timer korunmalı');
  c.durdur();
});

// ── 8. SNAPSHOT KOPYALANABİLİRLİK ──────────────────
console.log('\n┌─ 8. SNAPSHOT KOPYALANABİLİRLİK ───────────────────');

test('getSnapshot() snapshot kopyası döner (mutasyon güvenliği)', () => {
  const c = new OpsStatsConnector();
  const s1 = c.getSnapshot();
  s1.tamamlanan = 999;
  const s2 = c.getSnapshot();
  assertEqual(s2.tamamlanan, 0, 'Orijinal snapshot mutasyona uğramamalı');
});

// ═══════════════════════════════════════════════════
// SONUÇLAR
// ═══════════════════════════════════════════════════

const toplam = gecen + kalan;
console.log('\n╔══════════════════════════════════════════════════╗');
console.log(`║   SONUÇ: ${gecen} GEÇEN | ${kalan} KALAN                     ║`);
if (kalan === 0) {
  console.log('║   ✅ TÜM TESTLER BAŞARILI                        ║');
} else {
  console.log('║   ❌ BAŞARISIZ TESTLER:                           ║');
  for (const h of hatalar) {
    console.log(`║     → ${h.ad.slice(0, 40)}`);
  }
}
console.log('╚══════════════════════════════════════════════════╝\n');

process.exit(kalan > 0 ? 1 : 0);
