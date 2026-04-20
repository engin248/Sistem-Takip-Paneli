// ============================================================
// ui/ops_stats_validate.js — ÇAPRAZ DOĞRULAMA
// ============================================================
// ops_stats.js'nin mevcut STP altyapısıyla uyumunu doğrular.
// ============================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { OpsStatsConnector, bosSnapshot } = require('./ops_stats');

let gecen = 0;
const hatalar = [];

function kontrol(ad, kosul, detay) {
  if (kosul) {
    gecen++;
    console.log(`  ✅ ${ad}`);
  } else {
    hatalar.push({ ad, detay });
    console.log(`  ❌ ${ad} → ${detay}`);
  }
}

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║   OPS_STATS ÇAPRAZ DOĞRULAMA — STP Altyapı Uyum Raporu     ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║   Tarih : ${new Date().toISOString().slice(0, 19)}                             ║`);
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════
// 1. DOSYA MEVCUDIYET
// ═══════════════════════════════════════════════════
console.log('┌─ 1. DOSYA MEVCUDIYET VE BAĞIMLILIKLAR ──────────');

const BASE = path.join(__dirname, '..');

kontrol('ui/ops_stats.js mevcut',
  fs.existsSync(path.join(__dirname, 'ops_stats.js')),
  'Dosya bulunamadı');

// STP bileşenleri kontrolü
const kritikDosyalar = [
  { yol: 'src/components/Stats.tsx',        ad: 'Stats.tsx bileşeni' },
  { yol: 'src/components/LiveMetrics.tsx',   ad: 'LiveMetrics.tsx bileşeni' },
  { yol: 'src/store/useTaskStore.ts',        ad: 'useTaskStore.ts store' },
  { yol: 'src/core/taskQueue.ts',            ad: 'taskQueue.ts core' },
  { yol: 'src/app/api/queue/route.ts',       ad: 'Queue API route' },
  { yol: 'src/app/api/tasks/route.ts',       ad: 'Tasks API route' },
  { yol: 'src/app/api/agents',               ad: 'Agents API dizini' },
];

for (const d of kritikDosyalar) {
  kontrol(d.ad, fs.existsSync(path.join(BASE, d.yol)), `${d.yol} bulunamadı`);
}

// ═══════════════════════════════════════════════════
// 2. API ENDPOINT UYUMU
// ═══════════════════════════════════════════════════
console.log('\n┌─ 2. API ENDPOINT UYUMU ───────────────────────────');

// ops_stats.js'nin çağırdığı endpoint'ler
const opsStatsIcerik = fs.readFileSync(path.join(__dirname, 'ops_stats.js'), 'utf-8');

kontrol('/api/queue endpoint referansı mevcut',
  opsStatsIcerik.includes('/api/queue'),
  'ops_stats.js /api/queue referansı yok');

kontrol('/api/tasks endpoint referansı mevcut',
  opsStatsIcerik.includes('/api/tasks'),
  'ops_stats.js /api/tasks referansı yok');

kontrol('/api/agents endpoint referansı mevcut',
  opsStatsIcerik.includes('/api/agents'),
  'ops_stats.js /api/agents referansı yok');

// Queue route'un getQueueStats kullandığını doğrula
const queueRoute = fs.readFileSync(path.join(BASE, 'src/app/api/queue/route.ts'), 'utf-8');
kontrol('Queue route getQueueStats() çağırıyor',
  queueRoute.includes('getQueueStats'),
  'Queue route getQueueStats kullanmıyor');

kontrol('Queue route getJobHistory() çağırıyor',
  queueRoute.includes('getJobHistory'),
  'Queue route getJobHistory kullanmıyor');

// ═══════════════════════════════════════════════════
// 3. VERİ MODELİ UYUMU
// ═══════════════════════════════════════════════════
console.log('\n┌─ 3. VERİ MODELİ UYUMU (TaskStatus / QueueStats) ─');

// TaskStatus değerleri — useTaskStore.ts'den
const storeIcerik = fs.readFileSync(path.join(BASE, 'src/store/useTaskStore.ts'), 'utf-8');

const durumlar = ['beklemede', 'devam_ediyor', 'dogrulama', 'tamamlandi', 'reddedildi', 'iptal'];
for (const d of durumlar) {
  kontrol(`TaskStatus '${d}' → store'da tanımlı`,
    storeIcerik.includes(`'${d}'`),
    `${d} useTaskStore'da bulunamadı`);

  // ops_stats.js'de bu durum kullanılıyor mu?
  kontrol(`TaskStatus '${d}' → ops_stats'da filtreleniyor`,
    opsStatsIcerik.includes(d),
    `${d} ops_stats.js'de kullanılmıyor`);
}

// QueueStats alanları — taskQueue.ts'den
const queueIcerik = fs.readFileSync(path.join(BASE, 'src/core/taskQueue.ts'), 'utf-8');

const queueAlanlar = ['tamamlandi', 'hata', 'reddedildi', 'basari_orani', 'ort_sure_ms'];
for (const a of queueAlanlar) {
  kontrol(`QueueStats '${a}' → taskQueue'da tanımlı`,
    queueIcerik.includes(a),
    `${a} taskQueue.ts'de bulunamadı`);

  kontrol(`QueueStats '${a}' → ops_stats'da tüketiliyor`,
    opsStatsIcerik.includes(a),
    `${a} ops_stats.js'de kullanılmıyor`);
}

// ═══════════════════════════════════════════════════
// 4. Stats.tsx BİLEŞEN UYUMU
// ═══════════════════════════════════════════════════
console.log('\n┌─ 4. Stats.tsx BİLEŞEN UYUMU ──────────────────────');

const statsIcerik = fs.readFileSync(path.join(BASE, 'src/components/Stats.tsx'), 'utf-8');

// Stats.tsx'deki status filtreleri ops_stats ile aynı mı?
const statsFilterler = ['beklemede', 'devam_ediyor', 'dogrulama', 'tamamlandi', 'reddedildi', 'iptal'];
for (const f of statsFilterler) {
  kontrol(`Stats.tsx '${f}' filtresi → ops_stats ile eşleşiyor`,
    statsIcerik.includes(f) && opsStatsIcerik.includes(f),
    `${f} eşleşme hatası`);
}

// Stats.tsx useTaskStore kullanıyor
kontrol('Stats.tsx useTaskStore bağımlılığı',
  statsIcerik.includes('useTaskStore'),
  'Stats.tsx useTaskStore kullanmıyor');

// ═══════════════════════════════════════════════════
// 5. LiveMetrics.tsx BİLEŞEN UYUMU
// ═══════════════════════════════════════════════════
console.log('\n┌─ 5. LiveMetrics.tsx BİLEŞEN UYUMU ────────────────');

const liveIcerik = fs.readFileSync(path.join(BASE, 'src/components/LiveMetrics.tsx'), 'utf-8');

kontrol('LiveMetrics polling mekanizması var',
  liveIcerik.includes('setInterval') || liveIcerik.includes('Interval'),
  'Polling mekanizması bulunamadı');

kontrol('LiveMetrics /api/agents endpoint çağırıyor',
  liveIcerik.includes('/api/agents'),
  '/api/agents referansı yok');

kontrol('LiveMetrics /api/queue endpoint çağırıyor',
  liveIcerik.includes('/api/queue'),
  '/api/queue referansı yok');

kontrol('LiveMetrics TAMAMLANAN metriği var',
  liveIcerik.includes('TAMAMLANAN'),
  'TAMAMLANAN metrık bulunamadı');

kontrol('LiveMetrics 5sn yenileme',
  liveIcerik.includes('5_000') || liveIcerik.includes('5000'),
  '5sn polling bulunamadı');

// ═══════════════════════════════════════════════════
// 6. OpsStatsConnector FONKSİYONEL DOĞRULAMA
// ═══════════════════════════════════════════════════
console.log('\n┌─ 6. OpsStatsConnector FONKSİYONEL DOĞRULAMA ─────');

// Tam yaşam döngüsü testi
const c = new OpsStatsConnector();

// 1. Boş snapshot
const s0 = c.getSnapshot();
kontrol('Başlangıç snapshot tamamlanan=0', s0.tamamlanan === 0, `${s0.tamamlanan}`);
kontrol('Başlangıç snapshot bekleyen=0', s0.bekleyen === 0, `${s0.bekleyen}`);
kontrol('Başlangıç snapshot kaynak=bos', s0.kaynak === 'bos', `${s0.kaynak}`);

// 2. Listener testi
let bildirimSayisi = 0;
let sonBildirim = null;
const unsub = c.subscribe((snap) => {
  bildirimSayisi++;
  sonBildirim = snap;
});

kontrol('subscribe() hemen 1 bildirim gönderir', bildirimSayisi === 1, `${bildirimSayisi}`);
kontrol('İlk bildirim snapshot döner', sonBildirim !== null, 'null');
kontrol('İlk bildirim tamamlanan=0', sonBildirim.tamamlanan === 0, `${sonBildirim?.tamamlanan}`);

// 3. Snapshot güncelleme simülasyonu
c._snapshot = {
  ...bosSnapshot(),
  tamamlanan: 15,
  bekleyen: 5,
  devam_eden: 3,
  hata: 2,
  toplam: 25,
  basari_orani: 60,
  aktif_ajan: 12,
  toplam_ajan: 50,
  kaynak: 'hat2_tasks',
  timestamp: new Date().toISOString(),
};
c._bildir();

kontrol('Güncelleme sonrası bildirim geldi', bildirimSayisi === 2, `${bildirimSayisi}`);
kontrol('Güncelleme tamamlanan=15', sonBildirim.tamamlanan === 15, `${sonBildirim?.tamamlanan}`);
kontrol('Güncelleme bekleyen=5', sonBildirim.bekleyen === 5, `${sonBildirim?.bekleyen}`);

// 4. Sayaçlar
const sayaclar = c.getSayaclar();
kontrol('getSayaclar() tamamlanan=15', sayaclar.tamamlanan === 15, `${sayaclar.tamamlanan}`);
kontrol('getSayaclar() bekleyen=5', sayaclar.bekleyen === 5, `${sayaclar.bekleyen}`);
kontrol('getSayaclar() oran=60', sayaclar.oran === 60, `${sayaclar.oran}`);

// 5. Özet
const ozet = c.getOzet();
kontrol('getOzet() aktif_ajan=12', ozet.aktif_ajan === 12, `${ozet.aktif_ajan}`);
kontrol('getOzet() toplam_ajan=50', ozet.toplam_ajan === 50, `${ozet.toplam_ajan}`);
kontrol('getOzet() durum=DURDU', ozet.durum === 'DURDU', `${ozet.durum}`);

// 6. Unsubscribe
unsub();
c._bildir();
kontrol('Unsubscribe sonrası bildirim gelmez', bildirimSayisi === 2, `${bildirimSayisi}`);

// 7. Trend simülasyonu
c._gecmis.push({ ...bosSnapshot(), tamamlanan: 10, bekleyen: 8, hata: 1 });
c._gecmis.push({ ...bosSnapshot(), tamamlanan: 15, bekleyen: 5, hata: 2 });
const trend = c.getTrend();
kontrol('Trend tamamlanan ↑5', trend.tamamlanan_trend === '↑5', trend.tamamlanan_trend);
kontrol('Trend bekleyen ↓3', trend.bekleyen_trend === '↓3', trend.bekleyen_trend);
kontrol('Trend hata ↑1', trend.hata_trend === '↑1', trend.hata_trend);

// 8. Sağlık
const saglik = c.getSaglik();
kontrol('Sağlık durumu SAĞLIKLI', saglik.saglik === 'SAĞLIKLI', saglik.saglik);
kontrol('Sağlık gorev_durumu mevcut', saglik.gorev_durumu.includes('tamamlandı'), saglik.gorev_durumu);

// 9. Polling toggle
c.baslat(99999);
kontrol('Polling başlatıldı', c._aktif === true, `${c._aktif}`);
c.durdur();
kontrol('Polling durduruldu', c._aktif === false, `${c._aktif}`);

// ═══════════════════════════════════════════════════
// 7. EXPORT VERİFİKASYONU
// ═══════════════════════════════════════════════════
console.log('\n┌─ 7. EXPORT VERİFİKASYONU ─────────────────────────');

const opsModule = require('./ops_stats');

kontrol('OpsStatsConnector export var', typeof opsModule.OpsStatsConnector === 'function', 'yok');
kontrol('opsStats singleton export var', typeof opsModule.opsStats === 'object', 'yok');
kontrol('bosSnapshot export var', typeof opsModule.bosSnapshot === 'function', 'yok');

kontrol('Singleton subscribe fonksiyonu', typeof opsModule.opsStats.subscribe === 'function', 'yok');
kontrol('Singleton guncelle fonksiyonu', typeof opsModule.opsStats.guncelle === 'function', 'yok');
kontrol('Singleton baslat fonksiyonu', typeof opsModule.opsStats.baslat === 'function', 'yok');
kontrol('Singleton durdur fonksiyonu', typeof opsModule.opsStats.durdur === 'function', 'yok');
kontrol('Singleton getSayaclar fonksiyonu', typeof opsModule.opsStats.getSayaclar === 'function', 'yok');
kontrol('Singleton getOzet fonksiyonu', typeof opsModule.opsStats.getOzet === 'function', 'yok');
kontrol('Singleton getGecmis fonksiyonu', typeof opsModule.opsStats.getGecmis === 'function', 'yok');
kontrol('Singleton getTrend fonksiyonu', typeof opsModule.opsStats.getTrend === 'function', 'yok');
kontrol('Singleton getSaglik fonksiyonu', typeof opsModule.opsStats.getSaglik === 'function', 'yok');

// ═══════════════════════════════════════════════════
// SONUÇ
// ═══════════════════════════════════════════════════
const toplam = gecen + hatalar.length;
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log(`║   ÇAPRAZ DOĞRULAMA SONUCU                                   ║`);
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║   GEÇEN : ${String(gecen).padEnd(4)} / ${toplam}                                          ║`);
console.log(`║   KALAN : ${String(hatalar.length).padEnd(4)}                                              ║`);
if (hatalar.length === 0) {
  console.log('║   ✅ TÜM DOĞRULAMALAR BAŞARILI — %100 UYUM                  ║');
} else {
  console.log('║   ❌ UYUMSUZLUKLAR:                                         ║');
  for (const h of hatalar) {
    console.log(`║     → ${h.ad.slice(0, 50)}`);
  }
}
console.log('╚══════════════════════════════════════════════════════════════╝\n');

process.exit(hatalar.length > 0 ? 1 : 0);
