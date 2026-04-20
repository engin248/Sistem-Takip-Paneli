// ============================================================
// agents/worker_core.test.js — A2 TEST DOSYASI
// ============================================================
// A2 görevinin tüm fonksiyonlarını doğrular.
// Çalıştırma: node agents/worker_core.test.js
// ============================================================

'use strict';

const {
  generateAgentId,
  parseAgentId,
  generateJobId,
  YETENEK_TIPLERI,
  YETENEK_MATRISI,
  eslestir,
  AgentWorker,
  WorkerPool,
  KATMAN_PREFIX,
  WORKER_DURUMLARI,
} = require('./worker_core');

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

// ═══════════════════════════════════════════════════
// TEST GRUPLARI
// ═══════════════════════════════════════════════════

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║   A2 WORKER CORE — KAPSAMLI TEST RAPORU         ║');
console.log('╠══════════════════════════════════════════════════╣');
console.log(`║   Tarih: ${new Date().toISOString().slice(0, 19)}            ║`);
console.log('╚══════════════════════════════════════════════════╝\n');

// ── 1. AGENT_ID SİSTEMİ ────────────────────────────────────
console.log('┌─ 1. AGENT_ID SİSTEMİ ─────────────────────────────');

test('KOMUTA ID üretimi: K-1', () => {
  assertEqual(generateAgentId('KOMUTA', 1), 'K-1');
});

test('KOMUTA ID üretimi: K-4', () => {
  assertEqual(generateAgentId('KOMUTA', 4), 'K-4');
});

test('L1 ID üretimi: A-01', () => {
  assertEqual(generateAgentId('L1', 1), 'A-01');
});

test('L1 ID üretimi: A-10', () => {
  assertEqual(generateAgentId('L1', 10), 'A-10');
});

test('L2 ID üretimi: B-03', () => {
  assertEqual(generateAgentId('L2', 3), 'B-03');
});

test('L3 ID üretimi: C-02', () => {
  assertEqual(generateAgentId('L3', 2), 'C-02');
});

test('DESTEK ID üretimi: D-15', () => {
  assertEqual(generateAgentId('DESTEK', 15), 'D-15');
});

test('Özel prefix: ANTI-01', () => {
  assertEqual(generateAgentId('L1', 1, 'ANTI'), 'ANTI-01');
});

test('Özel prefix: IVDE-02', () => {
  assertEqual(generateAgentId('L1', 2, 'IVDE'), 'IVDE-02');
});

test('Özel prefix: CNTRL-04', () => {
  assertEqual(generateAgentId('L2', 4, 'CNTRL'), 'CNTRL-04');
});

test('Geçersiz katman hatası', () => {
  let hataFirladi = false;
  try { generateAgentId('GECERSIZ', 1); } catch { hataFirladi = true; }
  assert(hataFirladi, 'Geçersiz katman hatası fırlatılmalıydı');
});

// ── 2. AGENT_ID PARSE ──────────────────────────────────────
console.log('\n┌─ 2. AGENT_ID PARSE ───────────────────────────────');

test('K-1 parse → KOMUTA, sıra 1', () => {
  const p = parseAgentId('K-1');
  assertEqual(p.katman, 'KOMUTA');
  assertEqual(p.sira, 1);
  assertEqual(p.ozelEkip, false);
});

test('A-07 parse → L1, sıra 7', () => {
  const p = parseAgentId('A-07');
  assertEqual(p.katman, 'L1');
  assertEqual(p.sira, 7);
});

test('B-03 parse → L2, sıra 3', () => {
  const p = parseAgentId('B-03');
  assertEqual(p.katman, 'L2');
  assertEqual(p.sira, 3);
});

test('C-01 parse → L3, sıra 1', () => {
  const p = parseAgentId('C-01');
  assertEqual(p.katman, 'L3');
  assertEqual(p.sira, 1);
});

test('D-28 parse → DESTEK, sıra 28', () => {
  const p = parseAgentId('D-28');
  assertEqual(p.katman, 'DESTEK');
  assertEqual(p.sira, 28);
});

test('ANTI-01 parse → özel ekip', () => {
  const p = parseAgentId('ANTI-01');
  assertEqual(p.ozelEkip, true);
  assertEqual(p.prefix, 'ANTI');
  assertEqual(p.sira, 1);
});

test('IVDE-02 parse → özel ekip', () => {
  const p = parseAgentId('IVDE-02');
  assertEqual(p.ozelEkip, true);
  assertEqual(p.prefix, 'IVDE');
});

test('CNTRL-03 parse → L2 özel ekip', () => {
  const p = parseAgentId('CNTRL-03');
  assertEqual(p.katman, 'L2');
  assertEqual(p.ozelEkip, true);
});

test('Geçersiz ID parse hatası', () => {
  let hata = false;
  try { parseAgentId('ZZZ-99'); } catch { hata = true; }
  assert(hata, 'Geçersiz ID parsing hatası beklendi');
});

// ── 3. JOB ID ÜRETİMİ ────────────────────────────────────
console.log('\n┌─ 3. JOB_ID ÜRETİMİ ──────────────────────────────');

test('Job ID formatı doğru', () => {
  const jid = generateJobId('K-1');
  assert(jid.startsWith('K-1_'), `Job ID K-1_ ile başlamalı: ${jid}`);
  assert(jid.length > 10, `Job ID minimum uzunluk: ${jid}`);
});

test('Her Job ID benzersiz', () => {
  const id1 = generateJobId('A-02');
  const id2 = generateJobId('A-02');
  assert(id1 !== id2, 'İki ardışık Job ID aynı olmamalı');
});

// ── 4. YETENEK MATRİSİ ──────────────────────────────────
console.log('\n┌─ 4. YETENEK MATRİSİ ────────────────────────────');

test('Matris 22 ajan içeriyor (KOMUTA+L1+L2+L3)', () => {
  const sayisi = Object.keys(YETENEK_MATRISI).length;
  assert(sayisi >= 22, `Minimum 22 ajan beklendi, ${sayisi} bulundu`);
});

test('K-3 İSTİHBARAT scraping yetenekli', () => {
  assertEqual(YETENEK_MATRISI['K-3'].scraping, true);
});

test('K-4 MUHAFIZ AI kullanmaz', () => {
  assertEqual(YETENEK_MATRISI['K-4'].ai, false);
  assertEqual(YETENEK_MATRISI['K-4'].kural_tabanli, true);
});

test('A-04 İCRACI-BOT scraping + AI hibrit', () => {
  assertEqual(YETENEK_MATRISI['A-04'].scraping, true);
  assertEqual(YETENEK_MATRISI['A-04'].ai, true);
  assertEqual(YETENEK_MATRISI['A-04'].kural_tabanli, true);
});

test('A-08 İCRACI-DATA scraping modu aktif', () => {
  assertEqual(YETENEK_MATRISI['A-08'].scraping, true);
});

test('B-03 maliyet SIFIR', () => {
  assertEqual(YETENEK_MATRISI['B-03'].maliyet_sinifi, 'SIFIR');
});

test('YETENEK_TIPLERI sabitleri doğru', () => {
  assertEqual(YETENEK_TIPLERI.SCRAPING, 'SCRAPING');
  assertEqual(YETENEK_TIPLERI.AI, 'AI');
  assertEqual(YETENEK_TIPLERI.KURAL, 'KURAL');
  assertEqual(YETENEK_TIPLERI.HIBRIT, 'HIBRIT');
});

test('Her ajanın araçlar dizisi var', () => {
  for (const [id, m] of Object.entries(YETENEK_MATRISI)) {
    assert(Array.isArray(m.araçlar), `${id} araçlar eksik`);
    assert(m.araçlar.length > 0, `${id} boş araç listesi`);
  }
});

test('Her ajanın beceriler dizisi var', () => {
  for (const [id, m] of Object.entries(YETENEK_MATRISI)) {
    assert(Array.isArray(m.beceriler), `${id} beceriler eksik`);
    assert(m.beceriler.length >= 3, `${id} minimum 3 beceri beklendi`);
  }
});

// ── 5. BECERİ EŞLEŞTİRME ────────────────────────────────
console.log('\n┌─ 5. BECERİ EŞLEŞTİRME MOTORU ───────────────────');

test('Frontend görevi → A-01 İCRACI-FE', () => {
  const sonuc = eslestir('React bileşen oluştur ve CSS düzenle');
  assert(sonuc.length > 0, 'En az 1 eşleşme beklendi');
  assertEqual(sonuc[0].ajanId, 'A-01');
});

test('Backend API görevi → A-02 İCRACI-BE', () => {
  const sonuc = eslestir('API endpoint yaz REST servis oluştur');
  assert(sonuc.length > 0);
  assertEqual(sonuc[0].ajanId, 'A-02');
});

test('Veritabanı SQL görevi → A-03 İCRACI-DB', () => {
  const sonuc = eslestir('Supabase SQL migration tablosu oluştur');
  assert(sonuc.length > 0);
  assertEqual(sonuc[0].ajanId, 'A-03');
});

test('Güvenlik görevi → K-4 veya A-06', () => {
  const sonuc = eslestir('Güvenlik denetimi yetki kontrolü RLS');
  assert(sonuc.length > 0);
  const ilk = sonuc[0].ajanId;
  assert(ilk === 'K-4' || ilk === 'A-06', `Güvenlik ajanı bekleniyordu: ${ilk}`);
});

test('Scraping görevi → scraping yetenekli ajan', () => {
  const sonuc = eslestir('Web sayfasını tara veri çek scrape et data topla');
  assert(sonuc.length > 0, 'Scraping eşleşmesi beklendi');
  const scraping = sonuc.filter(s => YETENEK_MATRISI[s.ajanId].scraping);
  assert(scraping.length > 0, 'Scraping yetenekli ajan bulunmalı');
});

test('Boş görev → boş sonuç', () => {
  const sonuc = eslestir('xyz123abc');
  // Eşleşme olmayabilir veya düşük skor olur
  if (sonuc.length > 0) {
    assert(sonuc[0].skor <= 4, 'Düşük skor beklendi');
  }
});

// ── 6. AGENT WORKER SINIFI ──────────────────────────────
console.log('\n┌─ 6. AGENT WORKER SINIFI ──────────────────────────');

test('Worker oluşturma: K-1', () => {
  const w = new AgentWorker('K-1');
  assertEqual(w.agentId, 'K-1');
  assertEqual(w.ad, 'KOMUTAN');
  assertEqual(w.katman, 'KOMUTA');
  assertEqual(w.durum, 'IDLE');
});

test('Worker oluşturma: geçersiz ID hatası', () => {
  let hata = false;
  try { new AgentWorker('X-99'); } catch { hata = true; }
  assert(hata, 'Geçersiz ID için hata beklendi');
});

test('Worker kural tabanlı execute: K-4', async () => {
  const w = new AgentWorker('K-4');
  const sonuc = await w.execute('Güvenlik denetimi çalıştır');
  assertEqual(sonuc.durum, 'TAMAM');
  assertEqual(sonuc.mod, 'KURAL');
  assert(sonuc.sonuc.includes('KURAL-YANIT'), 'Kural yanıtı beklendi');
  assert(sonuc.sure_ms >= 0, 'Süre >= 0 olmalı');
  assertEqual(sonuc.ai_kullanildi, false);
});

test('Worker AI placeholder execute: K-1', async () => {
  const w = new AgentWorker('K-1');
  const sonuc = await w.execute('Strateji planı oluştur');
  assertEqual(sonuc.durum, 'TAMAM');
  assertEqual(sonuc.mod, 'AI');
  assert(sonuc.sonuc.includes('AI-HAZIR'), 'AI placeholder yanıtı beklendi');
});

test('Worker hibrit execute: K-3', async () => {
  const w = new AgentWorker('K-3');
  const sonuc = await w.execute('Veri topla ve analiz et');
  assertEqual(sonuc.durum, 'TAMAM');
  assert(sonuc.mod.includes('HIBRIT') || sonuc.mod.includes('AI'), 'Hibrit/AI modu beklendi');
});

test('Worker geçersiz görev → RED', async () => {
  const w = new AgentWorker('A-01');
  const sonuc = await w.execute('ab');
  assertEqual(sonuc.durum, 'RED');
});

test('Worker istatistikleri', async () => {
  const w = new AgentWorker('A-05');
  await w.execute('Unit test yaz');
  const ist = w.istatistikler();
  assertEqual(ist.tamamlanan, 1);
  assertEqual(ist.hata, 0);
  assertEqual(ist.scraping, false);
  assertEqual(ist.maliyet, 'SIFIR');
});

// ── 7. WORKER POOL ──────────────────────────────────────
console.log('\n┌─ 7. WORKER POOL ──────────────────────────────────');

test('WorkerPool 22+ ajan içeriyor', () => {
  const pool = new WorkerPool();
  assert(pool.tumu().length >= 22, `22+ ajan beklendi: ${pool.tumu().length}`);
});

test('WorkerPool.get() çalışıyor', () => {
  const pool = new WorkerPool();
  const w = pool.get('A-01');
  assert(w !== null, 'A-01 worker bulunmalı');
  assertEqual(w.ad, 'İCRACI-FE');
});

test('WorkerPool.get() bilinmeyen → null', () => {
  const pool = new WorkerPool();
  assertEqual(pool.get('X-99'), null);
});

test('WorkerPool katman filtresi', () => {
  const pool = new WorkerPool();
  const komuta = pool.katmanaGore('KOMUTA');
  assertEqual(komuta.length, 4);
});

test('WorkerPool scraping filtresi', () => {
  const pool = new WorkerPool();
  const sc = pool.scrapingYetenekli();
  assert(sc.length >= 3, `En az 3 scraping ajan: ${sc.length}`);
  for (const w of sc) {
    assertEqual(w.scraping, true);
  }
});

test('WorkerPool AI filtresi', () => {
  const pool = new WorkerPool();
  const ai = pool.aiYetenekli();
  assert(ai.length >= 10, `En az 10 AI ajan: ${ai.length}`);
});

test('WorkerPool sıfır maliyet filtresi', () => {
  const pool = new WorkerPool();
  const sm = pool.sifirMaliyetli();
  assert(sm.length >= 5, `En az 5 sıfır maliyetli: ${sm.length}`);
});

test('WorkerPool istatistikleri', () => {
  const pool = new WorkerPool();
  const ist = pool.istatistikler();
  assert(ist.toplam >= 22, `Toplam: ${ist.toplam}`);
  assert(ist.scraping_sayisi >= 3, `Scraping: ${ist.scraping_sayisi}`);
  assert(ist.katman_dagilimi.KOMUTA === 4, 'KOMUTA: 4');
  assert(ist.katman_dagilimi.L1 === 10, `L1: ${ist.katman_dagilimi.L1}`);
  assert(ist.katman_dagilimi.L2 === 6, `L2: ${ist.katman_dagilimi.L2}`);
  assert(ist.katman_dagilimi.L3 === 2, `L3: ${ist.katman_dagilimi.L3}`);
});

// ═══════════════════════════════════════════════════
// SONUÇLAR
// ═══════════════════════════════════════════════════

// Promise-based testlerin bitmesini bekle
setTimeout(() => {
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
}, 2000);
