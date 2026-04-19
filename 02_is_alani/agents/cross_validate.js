// ============================================================
// agents/cross_validate.js — A2 ÇAPRAZ DOĞRULAMA
// ============================================================
// worker_core.js ile mevcut TypeScript katmanının uyumunu doğrular.
// agentProfiles.ts ve agentRegistry.ts dosyalarını parse ederek
// AGENT_ID, katman, çalışma modu ve beceri eşlemelerini karşılaştırır.
// ============================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { YETENEK_MATRISI, parseAgentId, WorkerPool, eslestir } = require('./worker_core');

const PROFILLER_YOLU  = path.join(__dirname, '..', 'src', 'core', 'agentProfiles.ts');
const REGISTRY_YOLU   = path.join(__dirname, '..', 'src', 'services', 'agentRegistry.ts');

let gecen = 0;
let hatalar = [];

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
console.log('║   A2 ÇAPRAZ DOĞRULAMA — TypeScript Katman Uyum Raporu      ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║   Tarih : ${new Date().toISOString().slice(0, 19)}                             ║`);
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ═════════════════════════════════════════════════════
// 1. DOSYA MEVCUDIYET KONTROLLERİ
// ═════════════════════════════════════════════════════
console.log('┌─ 1. DOSYA MEVCUDIYET ──────────────────────────────');

kontrol('worker_core.js mevcut',
  fs.existsSync(path.join(__dirname, 'worker_core.js')),
  'Dosya bulunamadı');

kontrol('agentProfiles.ts mevcut',
  fs.existsSync(PROFILLER_YOLU),
  `Yol: ${PROFILLER_YOLU}`);

kontrol('agentRegistry.ts mevcut',
  fs.existsSync(REGISTRY_YOLU),
  `Yol: ${REGISTRY_YOLU}`);

// ═════════════════════════════════════════════════════
// 2. AGENT_ID UYUMU — TS profil dosyasındaki ID'ler
// ═════════════════════════════════════════════════════
console.log('\n┌─ 2. AGENT_ID UYUMU (agentProfiles.ts) ───────────');

const profilIcerik = fs.readFileSync(PROFILLER_YOLU, 'utf-8');

// TS dosyasından id: 'X-XX' ifadelerini çıkar
const tsProfilIdleri = [];
const idRegex = /id:\s*'([A-Z]+-?\d+)'/g;
let match;
while ((match = idRegex.exec(profilIcerik)) !== null) {
  tsProfilIdleri.push(match[1]);
}

// Benzersiz yap
const benzersizTsIds = [...new Set(tsProfilIdleri)];

console.log(`  ℹ️  agentProfiles.ts'de ${benzersizTsIds.length} benzersiz ID bulundu`);

// worker_core matrisindeki ID'ler
const coreIds = Object.keys(YETENEK_MATRISI);

// Core'daki her ID TS'de var mı?
let uyumsuzCore = 0;
for (const cid of coreIds) {
  const var_mi = benzersizTsIds.includes(cid);
  // Özel ekip (ANTI, IVDE, CNTRL) profilleri de TS'de var
  if (!var_mi && !cid.startsWith('ANTI') && !cid.startsWith('IVDE') && !cid.startsWith('CNTRL')) {
    uyumsuzCore++;
  }
}

kontrol(`Core matris ID'leri (${coreIds.length}) TS profilleriyle uyumlu`,
  uyumsuzCore === 0,
  `${uyumsuzCore} uyumsuz ID`);

// Ana kadro (K, A, B, C) ID'lerini karşılaştır 
const anaKadroTs = benzersizTsIds.filter(id => /^[KABC]-\d+$/.test(id));
const anaKadroCore = coreIds.filter(id => /^[KABC]-\d+$/.test(id));

kontrol(`Ana kadro ID sayısı eşleşiyor (TS:${anaKadroTs.length} vs Core:${anaKadroCore.length})`,
  anaKadroTs.length === anaKadroCore.length,
  `TS: ${anaKadroTs.length}, Core: ${anaKadroCore.length}`);

// Tekil eşleşme kontrolü
for (const tsId of anaKadroTs) {
  kontrol(`${tsId} → Core matrisinde mevcut`,
    coreIds.includes(tsId),
    `${tsId} worker_core.js YETENEK_MATRISI'nde bulunamadı`);
}

// ═════════════════════════════════════════════════════
// 3. ÇALIŞMA MODU UYUMU
// ═════════════════════════════════════════════════════
console.log('\n┌─ 3. ÇALIŞMA MODU UYUMU ──────────────────────────');

// TS'den çalışma modlarını çıkar
const modRegex = /id:\s*'([^']+)'[\s\S]*?calisma_modu\s*:\s*'([^']+)'/g;
const tsModMap = {};
let modMatch;
while ((modMatch = modRegex.exec(profilIcerik)) !== null) {
  tsModMap[modMatch[1]] = modMatch[2];
}

let modUyumsuz = 0;
for (const [coreId, matris] of Object.entries(YETENEK_MATRISI)) {
  const tsMod = tsModMap[coreId];
  if (!tsMod) continue; // Özel ekipler TS'de farklı section'da

  // Core modunu belirle
  let coreMod;
  if (matris.ai && matris.kural_tabanli) coreMod = 'hibrit';
  else if (matris.ai && !matris.kural_tabanli) coreMod = 'ai';
  else coreMod = 'kural_tabanli';

  const uyumlu = (coreMod === tsMod);
  if (!uyumlu) modUyumsuz++;
  kontrol(`${coreId} mod uyumu: Core(${coreMod}) ↔ TS(${tsMod})`,
    uyumlu,
    `${coreId}: Core=${coreMod}, TS=${tsMod}`);
}

// ═════════════════════════════════════════════════════
// 4. REGISTRY UYUMU — 58 AJAN KADROSU
// ═════════════════════════════════════════════════════
console.log('\n┌─ 4. REGISTRY UYUMU (agentRegistry.ts) ───────────');

const registryIcerik = fs.readFileSync(REGISTRY_YOLU, 'utf-8');

// Registry'den ID'leri çıkar
const registryIds = [];
const regIdRegex = /id:\s*'([^']+)',\s*kod_adi:/g;
let regMatch;
while ((regMatch = regIdRegex.exec(registryIcerik)) !== null) {
  registryIds.push(regMatch[1]);
}

console.log(`  ℹ️  agentRegistry.ts'de ${registryIds.length} ajan kaydı bulundu`);

// Core'daki her ID registry'de var mı?
let regUyumsuz = 0;
for (const cid of coreIds) {
  const found = registryIds.includes(cid);
  if (!found) regUyumsuz++;
}

kontrol(`Tüm Core ID'ler Registry'de mevcut (${coreIds.length}/${coreIds.length})`,
  regUyumsuz === 0,
  `${regUyumsuz} ID Registry'de bulunamadı`);

// Katman dağılımı doğrula
const pool = new WorkerPool();
const ist = pool.istatistikler();

kontrol(`KOMUTA kadrosu: ${ist.katman_dagilimi.KOMUTA} ajan`, ist.katman_dagilimi.KOMUTA === 4, `Beklenen 4`);
kontrol(`L1 icra kadrosu: ${ist.katman_dagilimi.L1} ajan`, ist.katman_dagilimi.L1 === 10, `Beklenen 10`);
kontrol(`L2 denetim kadrosu: ${ist.katman_dagilimi.L2} ajan`, ist.katman_dagilimi.L2 === 6, `Beklenen 6`);
kontrol(`L3 hakem kadrosu: ${ist.katman_dagilimi.L3} ajan`, ist.katman_dagilimi.L3 === 2, `Beklenen 2`);

// ═════════════════════════════════════════════════════
// 5. BECERİ EŞLEŞTİRME DOĞRULAMA
// ═════════════════════════════════════════════════════
console.log('\n┌─ 5. BECERİ EŞLEŞTİRME — SENARYO TESTLERİ ───────');

const senaryolar = [
  { gorev: 'React bileşen tasarla, UI düzenle', beklenen: 'A-01', aciklama: 'Frontend' },
  { gorev: 'API endpoint oluştur, REST servis yaz', beklenen: 'A-02', aciklama: 'Backend' },
  { gorev: 'Supabase SQL migration schema tablo', beklenen: 'A-03', aciklama: 'Veritabanı' },
  { gorev: 'Telegram bot webhook bildirim mesaj', beklenen: 'A-04', aciklama: 'Bot' },
  { gorev: 'Vitest unit test yaz mock oluştur', beklenen: 'A-05', aciklama: 'Test' },
  { gorev: 'JWT token OWASP güvenlik kriptografi', beklenen: 'A-06', aciklama: 'Güvenlik' },
  { gorev: 'Ollama LLM prompt engineering model', beklenen: 'A-07', aciklama: 'AI' },
  { gorev: 'Veri analizi ETL rapor istatistik', beklenen: 'A-08', aciklama: 'Data' },
  { gorev: 'Karar ver strateji onayla görev ata', beklenen: 'K-1', aciklama: 'Komuta' },
  { gorev: 'Güvenlik denetimi RLS yetki kontrol', beklenen: 'K-4', aciklama: 'Muhafız' },
];

for (const s of senaryolar) {
  const sonuc = eslestir(s.gorev);
  const ilk = sonuc.length > 0 ? sonuc[0].ajanId : 'BOŞ';
  kontrol(
    `"${s.aciklama}" → ${s.beklenen} (skor:${sonuc.length > 0 ? sonuc[0].skor : 0})`,
    ilk === s.beklenen,
    `Beklenen: ${s.beklenen}, Gerçek: ${ilk}`
  );
}

// ═════════════════════════════════════════════════════
// 6. SCRAPING / AI YETENEK DAĞILIMI
// ═════════════════════════════════════════════════════
console.log('\n┌─ 6. SCRAPING / AI YETENEK DAĞILIMI ──────────────');

const scrapingAjanlar = [];
const aiAjanlar = [];
const kuralAjanlar = [];
const hibritAjanlar = [];

for (const [id, m] of Object.entries(YETENEK_MATRISI)) {
  if (m.scraping) scrapingAjanlar.push(id);
  if (m.ai && !m.kural_tabanli) aiAjanlar.push(id);
  if (!m.ai && m.kural_tabanli) kuralAjanlar.push(id);
  if (m.ai && m.kural_tabanli) hibritAjanlar.push(id);
}

kontrol(`Scraping yetenekli: ${scrapingAjanlar.length} ajan [${scrapingAjanlar.join(', ')}]`,
  scrapingAjanlar.length >= 3, `${scrapingAjanlar.length} < 3`);

kontrol(`Saf AI: ${aiAjanlar.length} ajan [${aiAjanlar.join(', ')}]`,
  aiAjanlar.length >= 5, `${aiAjanlar.length} < 5`);

kontrol(`Saf Kural: ${kuralAjanlar.length} ajan [${kuralAjanlar.join(', ')}]`,
  kuralAjanlar.length >= 5, `${kuralAjanlar.length} < 5`);

kontrol(`Hibrit (AI+Kural): ${hibritAjanlar.length} ajan [${hibritAjanlar.join(', ')}]`,
  hibritAjanlar.length >= 3, `${hibritAjanlar.length} < 3`);

// Maliyet dağılımı
const sifirMaliyet = Object.entries(YETENEK_MATRISI).filter(([,m]) => m.maliyet_sinifi === 'SIFIR');
const ortaMaliyet = Object.entries(YETENEK_MATRISI).filter(([,m]) => m.maliyet_sinifi === 'ORTA');
const dusukMaliyet = Object.entries(YETENEK_MATRISI).filter(([,m]) => m.maliyet_sinifi === 'DÜŞÜK');

kontrol(`Sıfır maliyetli: ${sifirMaliyet.length} ajan`, sifirMaliyet.length >= 5, `${sifirMaliyet.length} < 5`);
console.log(`  ℹ️  ORTA: ${ortaMaliyet.length} | DÜŞÜK: ${dusukMaliyet.length} | SIFIR: ${sifirMaliyet.length}`);

// ═════════════════════════════════════════════════════
// 7. WORKER EXECUTE ENTEGRASYON TESTİ
// ═════════════════════════════════════════════════════
console.log('\n┌─ 7. WORKER EXECUTE ENTEGRASYON ───────────────────');

async function entegrasyonTestleri() {
  const { AgentWorker } = require('./worker_core');
  
  // K-4 kural tabanlı
  const k4 = new AgentWorker('K-4');
  const r1 = await k4.execute('RLS güvenlik denetimi çalıştır');
  kontrol('K-4 kural tabanlı execute başarılı', r1.durum === 'TAMAM', `Durum: ${r1.durum}`);
  kontrol('K-4 AI kullanmadı', r1.ai_kullanildi === false, `AI: ${r1.ai_kullanildi}`);
  kontrol('K-4 süre < 100ms', r1.sure_ms < 100, `Süre: ${r1.sure_ms}ms`);
  kontrol('K-4 maliyet SIFIR', r1.maliyet === 'SIFIR', `Maliyet: ${r1.maliyet}`);

  // A-05 kural tabanlı
  const a5 = new AgentWorker('A-05');
  const r2 = await a5.execute('Vitest unit test yaz');
  kontrol('A-05 kural tabanlı execute başarılı', r2.durum === 'TAMAM', `Durum: ${r2.durum}`);
  kontrol('A-05 istatistik güncellendi', a5._tamamlanan === 1, `Tamamlanan: ${a5._tamamlanan}`);

  // K-1 AI placeholder
  const k1 = new AgentWorker('K-1');
  const r3 = await k1.execute('Kriz yönetimi stratejisi belirle');
  kontrol('K-1 AI placeholder execute başarılı', r3.durum === 'TAMAM', `Durum: ${r3.durum}`);
  kontrol('K-1 sonuç AI-HAZIR içeriyor', r3.sonuc.includes('AI-HAZIR'), 'İçerik hatası');

  // K-3 hibrit scraping
  const k3 = new AgentWorker('K-3');
  const r4 = await k3.execute('Web kaynakları tara trend analiz et');
  kontrol('K-3 hibrit execute başarılı', r4.durum === 'TAMAM', `Durum: ${r4.durum}`);
  kontrol('K-3 scraping yetenekli', r4.scraping_kullanildi === true, `Scraping: ${r4.scraping_kullanildi}`);

  // Geçersiz görev
  const a1 = new AgentWorker('A-01');
  const r5 = await a1.execute('');
  kontrol('Boş görev → RED', r5.durum === 'RED', `Durum: ${r5.durum}`);

  // JOB_ID benzersizlik
  kontrol('Her execute benzersiz job_id üretir', r1.job_id !== r2.job_id, 'Tekrarlı ID');

  // WorkerPool toplu execute
  const pool2 = new WorkerPool();
  const b03 = pool2.get('B-03');
  const r6 = await b03.execute('OWASP güvenlik taraması yap');
  kontrol('Pool üzerinden B-03 execute başarılı', r6.durum === 'TAMAM', `Durum: ${r6.durum}`);

  // ═════════════════════════════════════════════════════
  // SONUÇ
  // ═════════════════════════════════════════════════════
  const toplam = gecen + hatalar.length;
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║   ÇAPRAZ DOĞRULAMA SONUCU                                   ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║   GEÇEN : ${String(gecen).padEnd(4)} / ${toplam}                                          ║`);
  console.log(`║   KALAN : ${String(hatalar.length).padEnd(4)}                                              ║`);
  if (hatalar.length === 0) {
    console.log('║   ✅ TÜM DOĞRULAMALAR BAŞARILI — %100 UYUM                  ║');
  } else {
    console.log('║   ❌ UYUMSUZLUKLAR TESPİT EDİLDİ                           ║');
    for (const h of hatalar) {
      console.log(`║     → ${h.ad.slice(0, 50)}`);
    }
  }
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  process.exit(hatalar.length > 0 ? 1 : 0);
}

entegrasyonTestleri();
