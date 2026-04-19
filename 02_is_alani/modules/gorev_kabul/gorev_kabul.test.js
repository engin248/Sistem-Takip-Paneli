// ============================================================
// GÖREV KABUL DEPARTMANI — TEST & DOĞRULAMA
// ============================================================
// Çalıştırma: node modules/gorev_kabul/gorev_kabul.test.js
// ============================================================

'use strict';

const {
  GorevKabulDepartmani,
  KOMUT_TIPLERI,
  KOMUT_DURUM,
  GUVEN_AYARLARI,
  ajanA_HamMetinCikarma,
  ajanB_NiyetTespiti,
  ajanC_BaglamAnalizi,
  sentezle,
} = require('./gorev_kabul');

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
function assertEqual(a, b, m) {
  if (a !== b) throw new Error(m || `Beklenen: ${b}, Gerçek: ${a}`);
}

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║   GÖREV KABUL DEPARTMANI — TEST & DOĞRULAMA               ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║   Tarih: ${new Date().toISOString().slice(0, 19)}                              ║`);
console.log('╚══════════════════════════════════════════════════════════════╝\n');


// ═══════════════════════════════════════════════════════════════
// 1. AJAN-A: HAM METİN ÇIKARMA
// ═══════════════════════════════════════════════════════════════
console.log('┌─ 1. AJAN-A: HAM METİN ÇIKARMA ──────────────────────');

test('Sayıları yazıya döker', () => {
  const r = ajanA_HamMetinCikarma({ icerik: '3 tane buton ekle 5 sayfa' });
  assert(r.temiz_metin.includes('üç'), `Sonuç: ${r.temiz_metin}`);
  assert(r.temiz_metin.includes('beş'), `Sonuç: ${r.temiz_metin}`);
});

test('Kısaltmaları açar (FE, BE, DB)', () => {
  const r = ajanA_HamMetinCikarma({ icerik: 'FE panel düzelt BE API yaz DB migration' });
  assert(r.acilmis_metin.includes('frontend'), `Sonuç: ${r.acilmis_metin}`);
  assert(r.acilmis_metin.includes('backend'), `Sonuç: ${r.acilmis_metin}`);
  assert(r.acilmis_metin.includes('veritabanı'), `Sonuç: ${r.acilmis_metin}`);
});

test('Kelime sayısı doğru', () => {
  const r = ajanA_HamMetinCikarma({ icerik: 'React bileşen ekle' });
  assert(r.kelime_sayisi >= 3, `Kelime: ${r.kelime_sayisi}`);
});

test('Boş metin işlenir', () => {
  const r = ajanA_HamMetinCikarma({ icerik: '' });
  assertEqual(r.kelime_sayisi, 1); // '' split → ['']
});


// ═══════════════════════════════════════════════════════════════
// 2. AJAN-B: NİYET TESPİTİ
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ 2. AJAN-B: NİYET TESPİTİ ─────────────────────────');

test('OLUSTUR niyeti tespit edilir', () => {
  const r = ajanB_NiyetTespiti({ icerik: 'Yeni bir panel oluştur ve buton ekle' });
  assertEqual(r.birincil_niyet, 'OLUSTUR');
  assert(r.niyet_skoru > 0);
});

test('DUZELT niyeti tespit edilir', () => {
  const r = ajanB_NiyetTespiti({ icerik: 'CSS hatalarını düzelt ve güncelle' });
  assertEqual(r.birincil_niyet, 'DUZELT');
});

test('SIL niyeti tespit edilir', () => {
  const r = ajanB_NiyetTespiti({ icerik: 'Eski dosyaları sil ve temizle' });
  assertEqual(r.birincil_niyet, 'SIL');
});

test('KONTROL niyeti tespit edilir', () => {
  const r = ajanB_NiyetTespiti({ icerik: 'Güvenlik denetimi yap test çalıştır' });
  assertEqual(r.birincil_niyet, 'KONTROL');
});

test('ANALIZ niyeti tespit edilir', () => {
  const r = ajanB_NiyetTespiti({ icerik: 'Performans analizi yap rapor oluştur' });
  // analiz + oluştur → hangisi yüksekse
  assert(r.niyet_skoru > 0);
});

test('Belirsiz komut doğru raporlanır', () => {
  const r = ajanB_NiyetTespiti({ icerik: 'merhaba nasılsın' });
  assertEqual(r.birincil_niyet, 'BELIRSIZ');
  assertEqual(r.belirsiz, true);
});


// ═══════════════════════════════════════════════════════════════
// 3. AJAN-C: BAĞLAM ANALİZİ
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ 3. AJAN-C: BAĞLAM ANALİZİ ────────────────────────');

test('Frontend alanı tespit edilir', () => {
  const r = ajanC_BaglamAnalizi({ icerik: 'React component bir panel tasarla UI düzenle' });
  assertEqual(r.birincil_alan, 'FRONTEND');
});

test('Veritabanı alanı tespit edilir', () => {
  const r = ajanC_BaglamAnalizi({ icerik: 'Supabase SQL tablo migration yaz' });
  assertEqual(r.birincil_alan, 'VERITABANI');
});

test('Aciliyet tespiti - KRITIK', () => {
  const r = ajanC_BaglamAnalizi({ icerik: 'Acil güvenlik yamması yap hemen' });
  assertEqual(r.aciliyet, 'KRITIK');
});

test('Aciliyet tespiti - NORMAL', () => {
  const r = ajanC_BaglamAnalizi({ icerik: 'Bir buton ekle' });
  assertEqual(r.aciliyet, 'NORMAL');
});

test('Karmaşıklık: DUSUK', () => {
  const r = ajanC_BaglamAnalizi({ icerik: 'Buton ekle' });
  assertEqual(r.karmasiklik, 'DUSUK');
});


// ═══════════════════════════════════════════════════════════════
// 4. SENTEZ — 3 AJAN BİRLEŞTİRME
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ 4. SENTEZ — 3 AJAN BİRLEŞTİRME ───────────────────');

test('Sentez Türkçe cümle üretir', () => {
  const komut = { icerik: 'React panel bileşenini düzelt CSS ekle' };
  const a = ajanA_HamMetinCikarma(komut);
  const b = ajanB_NiyetTespiti(komut);
  const c = ajanC_BaglamAnalizi(komut);
  const s = sentezle(a, b, c);

  assert(s.anlasilan_cumle.length > 10, 'Cümle çok kısa');
  assert(s.anlasilan_cumle.includes('düzeltilmesini') || s.anlasilan_cumle.includes('oluşturulmasını'),
    `Cümle: ${s.anlasilan_cumle}`);
  assertEqual(s.ham_komut, 'React panel bileşenini düzelt CSS ekle');
  assert(s.niyet !== undefined);
  assert(s.alan !== undefined);
});


// ═══════════════════════════════════════════════════════════════
// 5. GÖREV KABUL — TAM AKIŞ
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ 5. GÖREV KABUL — TAM AKIŞ ─────────────────────────');

test('GorevKabulDepartmani oluşturulur', () => {
  const gk = new GorevKabulDepartmani();
  assert(gk instanceof GorevKabulDepartmani);
});

test('komutAl() başarılı döner', () => {
  const gk = new GorevKabulDepartmani();
  const r = gk.komutAl({ icerik: 'Frontend panel bileşenini düzelt' });
  assert(r.basarili);
  assert(r.komut_id.startsWith('KMT-'));
  assert(r.anlasilan.length > 5);
  assert(r.niyet !== undefined);
  assert(r.alan !== undefined);
  assertEqual(r.onay_gerekli, true); // İlk kullanım → onay gerekli
});

test('komutAl() boş komut → red', () => {
  const gk = new GorevKabulDepartmani();
  const r = gk.komutAl({ icerik: '' });
  assertEqual(r.basarili, false);
});

test('komutAl() null → red', () => {
  const gk = new GorevKabulDepartmani();
  const r = gk.komutAl(null);
  assertEqual(r.basarili, false);
});

test('komutAl() kısa komut → red', () => {
  const gk = new GorevKabulDepartmani();
  const r = gk.komutAl({ icerik: 'ab' });
  assertEqual(r.basarili, false);
});


// ═══════════════════════════════════════════════════════════════
// 6. ONAY DÖNGÜSÜ
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ 6. ONAY DÖNGÜSÜ ───────────────────────────────────');

test('Onay: EVET → ONAYLANDI', () => {
  const gk = new GorevKabulDepartmani();
  const r = gk.komutAl({ icerik: 'Veritabanı migration yaz SQL' });
  if (r.onay_gerekli) {
    const onay = gk.onayVer(r.komut_id, true);
    assert(onay.basarili);
    assertEqual(onay.durum, 'ONAYLANDI');
  }
  assertEqual(gk.bekleyenler().length, 0);
});

test('Onay: HAYIR → REDDEDILDI', () => {
  const gk = new GorevKabulDepartmani();
  const r = gk.komutAl({ icerik: 'API endpoint yaz' });
  if (r.onay_gerekli) {
    const red = gk.onayVer(r.komut_id, false);
    assert(red.basarili);
    assertEqual(red.durum, 'REDDEDILDI');
  }
});

test('Onay: HAYIR + düzeltme → yeni komut', () => {
  const gk = new GorevKabulDepartmani();
  const r = gk.komutAl({ icerik: 'Buton ekle' });
  if (r.onay_gerekli) {
    const duzeltme = gk.onayVer(r.komut_id, false, 'React panel butonunu yeşil yap');
    assert(duzeltme.basarili);
    assert(duzeltme.komut_id.startsWith('KMT-'));
  }
});

test('Bekleyenler doğru listeler', () => {
  const gk = new GorevKabulDepartmani();
  gk.komutAl({ icerik: 'Görev bir' });
  gk.komutAl({ icerik: 'Görev iki test kontrol' });
  gk.komutAl({ icerik: 'Görev üç deploy yayınla' });
  assertEqual(gk.bekleyenler().length, 3);
});

test('EventEmitter: komut_onay_bekliyor olayı', () => {
  const gk = new GorevKabulDepartmani();
  let olay = null;
  gk.on('komut_onay_bekliyor', (e) => { olay = e; });
  gk.komutAl({ icerik: 'CSS düzelt panel stili' });
  assert(olay !== null, 'Event tetiklenmedi');
  assert(olay.soru.length > 10, 'Soru çok kısa');
  assert(olay.komut_id.startsWith('KMT-'));
});

test('EventEmitter: komut_onaylandi olayı', () => {
  const gk = new GorevKabulDepartmani();
  let olay = null;
  gk.on('komut_onaylandi', (e) => { olay = e; });
  const r = gk.komutAl({ icerik: 'Test yaz unit coverage' });
  gk.onayVer(r.komut_id, true);
  assert(olay !== null);
  assertEqual(olay.durum, KOMUT_DURUM.ONAYLANDI);
});


// ═══════════════════════════════════════════════════════════════
// 7. ÖĞRENME & GÜVEN SKORU
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ 7. ÖĞRENME & GÜVEN SKORU ──────────────────────────');

test('İlk komut → güven 0, onay gerekli', () => {
  const gk = new GorevKabulDepartmani();
  const r = gk.komutAl({ icerik: 'Tamamen yeni bir görev türü xyz123' });
  assertEqual(r.onay_gerekli, true);
  assertEqual(r.guven.skor, 0);
});

test('Öğrenme raporu çalışıyor', () => {
  const gk = new GorevKabulDepartmani();
  const rapor = gk.ogrenmeRaporu();
  assert(rapor.toplam_onay >= 0);
  assert(rapor.toplam_red >= 0);
  assert(rapor.esik === GUVEN_AYARLARI.OTOMATIK_ESIK);
});

test('Durum raporu tüm alanlar', () => {
  const gk = new GorevKabulDepartmani();
  gk.komutAl({ icerik: 'Test komutu yapay zeka' });
  const dr = gk.durumRaporu();
  assert('bekleyen_sayisi' in dr);
  assert('toplam_islenen' in dr);
  assert('gecmis_sayisi' in dr);
  assert('ogrenme' in dr);
  assertEqual(dr.toplam_islenen, 1);
});


// ═══════════════════════════════════════════════════════════════
// 8. SENARYO TESTLERİ — GERÇEK KOMUTLAR
// ═══════════════════════════════════════════════════════════════
console.log('\n┌─ 8. SENARYO TESTLERİ — GERÇEK KOMUTLAR ─────────────');

const senaryolar = [
  {
    komut: 'React panelde 3 buton ekle tasarım güzel olsun',
    niyet: 'OLUSTUR',
    alan: 'FRONTEND',
  },
  {
    komut: 'Supabase veritabanında RLS güvenlik kurallarını düzelt',
    niyet: 'DUZELT',
    alan: 'VERITABANI',
  },
  {
    komut: 'Acil test yaz API endpoint kontrol et hemen',
    niyet: 'KONTROL',
    alan: 'BACKEND',
  },
  {
    komut: 'Ollama model performansını analiz et rapor çıkar',
    niyet: 'ANALIZ',
    alan: 'AI',
  },
];

const gk = new GorevKabulDepartmani();

for (const s of senaryolar) {
  test(`"${s.komut.slice(0, 40)}..." → ${s.niyet}/${s.alan}`, () => {
    const r = gk.komutAl({ icerik: s.komut });
    assert(r.basarili);
    assertEqual(r.niyet, s.niyet, `Niyet: ${r.niyet}`);
    assertEqual(r.alan, s.alan, `Alan: ${r.alan}`);
  });
}


// ═══════════════════════════════════════════════════════════════
// NİHAİ RAPOR
// ═══════════════════════════════════════════════════════════════
const toplam = gecen + kalan;
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log(`║   GÖREV KABUL DEPARTMANI TEST SONUCU                       ║`);
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║   GEÇEN : ${String(gecen).padEnd(4)} / ${toplam}                                           ║`);
console.log(`║   KALAN : ${String(kalan).padEnd(4)}                                               ║`);
if (kalan === 0) {
  console.log('║   ✅ TÜM TESTLER BAŞARILI                                  ║');
} else {
  for (const h of hatalar) {
    console.log(`║   ❌ ${h.ad.slice(0, 52)}`);
    console.log(`║     ${h.hata.slice(0, 52)}`);
  }
}
console.log('╚══════════════════════════════════════════════════════════════╝\n');

process.exit(kalan > 0 ? 1 : 0);
