#!/usr/bin/env node
// ============================================================
// STP BAŞLAT — Master Launcher
// ============================================================
// Projesi : Sistem Takip Paneli (STP)
// Görevli : A4
// Konum   : stp_baslat.js
// Tarih   : 2026-04-19
//
// GÖREV: Tüm sistemi tek komutla, hatasız ayağa kaldıran
//        ana tetikleyiciyi hazırlar.
//
// BAŞLATMA SIRASI:
//   1. Ortam değişkenleri doğrulama
//   2. Hat-1 Connection (Auto-Reconnect) başlat
//   3. Hat-1 Hub V3 başlat
//   4. Worker Pool hazırla
//   5. Next.js dev server başlat (opsiyonel)
//   6. Sistem sağlık kontrolü
//
// KULLANIM:
//   node stp_baslat.js              → Tüm sistemi başlat
//   node stp_baslat.js --no-server  → Sunucu olmadan (sadece core)
//   node stp_baslat.js --check      → Sadece kontrol (başlatma)
//   node stp_baslat.js --status     → Durum raporu
// ============================================================

'use strict';

const path = require('path');
const { execSync, spawn } = require('child_process');

// ── YAPILANDIRMA ─────────────────────────────────────────────
const PROJE_KOK = __dirname;
const AYARLAR = {
  NEXT_PORT       : 3000,
  HUB_PORT        : 3001,
  BEKLEME_MS      : 3000,      // Modüller arası bekleme
  LOG_PREFIX      : '[STP]',
  ENV_DOSYA       : '.env.local',
};

// ── RENKLER (Terminal) ───────────────────────────────────────
const RENK = {
  sifirla : '\x1b[0m',
  kirmizi : '\x1b[31m',
  yesil   : '\x1b[32m',
  sari    : '\x1b[33m',
  mavi    : '\x1b[34m',
  cyan    : '\x1b[36m',
  beyaz   : '\x1b[37m',
  kalin   : '\x1b[1m',
  soluk   : '\x1b[2m',
};

function log(msg, renk = '') {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`${renk}${AYARLAR.LOG_PREFIX} ${ts} ${msg}${RENK.sifirla}`);
}

function baslik(msg) {
  console.log('');
  log(`${'═'.repeat(50)}`, RENK.cyan);
  log(`  ${msg}`, RENK.kalin + RENK.cyan);
  log(`${'═'.repeat(50)}`, RENK.cyan);
}

function basari(msg) { log(`✅ ${msg}`, RENK.yesil); }
function hata(msg)   { log(`❌ ${msg}`, RENK.kirmizi); }
function uyari(msg)  { log(`⚠️  ${msg}`, RENK.sari); }
function bilgi(msg)  { log(`ℹ️  ${msg}`, RENK.soluk); }

// ══════════════════════════════════════════════════════════════
// 1. ORTAM DEĞİŞKEN DOĞRULAMA
// ══════════════════════════════════════════════════════════════
function ortamKontrol() {
  baslik('1/6 ORTAM DEĞİŞKEN KONTROLÜ');

  // .env.local varsa yükle
  const envPath = path.join(PROJE_KOK, AYARLAR.ENV_DOSYA);
  try {
    const fs = require('fs');
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx < 0) continue;
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        // Tırnakları kaldır
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
      basari('.env.local yüklendi');
    } else {
      uyari('.env.local bulunamadı — ortam değişkenleri eksik olabilir');
    }
  } catch (e) {
    uyari('.env.local okunamadı: ' + e.message);
  }

  // Zorunlu değişkenler
  const zorunlu = {
    'NEXT_PUBLIC_SUPABASE_URL'      : process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY' : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  // Opsiyonel değişkenler
  const opsiyonel = {
    'TELEGRAM_BOT_TOKEN'            : process.env.TELEGRAM_BOT_TOKEN,
    'TELEGRAM_NOTIFICATION_CHAT_ID' : process.env.TELEGRAM_NOTIFICATION_CHAT_ID,
    'OLLAMA_BASE_URL'               : process.env.OLLAMA_BASE_URL,
    'OPENAI_API_KEY'                : process.env.OPENAI_API_KEY,
  };

  let eksik = 0;
  for (const [key, val] of Object.entries(zorunlu)) {
    if (val && val.trim() && !val.includes('placeholder') && !val.includes('your-')) {
      basari(`${key} ✓`);
    } else {
      hata(`${key} — TANIMLI DEĞİL`);
      eksik++;
    }
  }

  for (const [key, val] of Object.entries(opsiyonel)) {
    if (val && val.trim()) {
      bilgi(`${key} ✓ (opsiyonel)`);
    } else {
      bilgi(`${key} — tanımsız (opsiyonel)`);
    }
  }

  if (eksik > 0) {
    hata(`${eksik} zorunlu değişken eksik — sistem kısıtlı çalışacak`);
    return false;
  }

  basari('Tüm zorunlu ortam değişkenleri hazır');
  return true;
}

// ══════════════════════════════════════════════════════════════
// 2. HAT-1 CONNECTION BAŞLAT
// ══════════════════════════════════════════════════════════════
async function hat1Baslat() {
  baslik('2/6 HAT-1 AUTO-RECONNECT');

  try {
    const hat1 = require('./core/hat1_connection');
    await hat1.basla();

    const rapor = hat1.durumRaporu();
    basari(`Hat-1 başlatıldı — ${Object.keys(rapor.hatlar).length} hat izleniyor`);

    for (const [hatId, hat] of Object.entries(rapor.hatlar)) {
      const emoji = hat.durum === 'BAGLI' ? '🟢' : hat.durum === 'DEVRE_DISI' ? '⚫' : '🔴';
      bilgi(`  ${emoji} ${hatId}: ${hat.durum} (${hat.gecikme_ms}ms)`);
    }

    return true;
  } catch (e) {
    hata('Hat-1 başlatılamadı: ' + e.message);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
// 3. HAT-1 HUB V3 BAŞLAT
// ══════════════════════════════════════════════════════════════
async function hubBaslat() {
  baslik('3/6 HAT-1 HUB V3');

  try {
    const hub = require('./core/hat1_hub');
    const sonuc = await hub.basla(AYARLAR.HUB_PORT);
    basari(`Hub V3 başlatıldı — Port: ${sonuc.port}`);

    const rapor = hub.durumRaporu();
    bilgi(`  Kuyruk limit: ${rapor.kuyruk_limit}`);
    bilgi(`  Hayalet eşik: ${rapor.hayalet_esik_ms / 1000}s`);

    return true;
  } catch (e) {
    hata('Hub V3 başlatılamadı: ' + e.message);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
// 4. WORKER POOL HAZIRLA
// ══════════════════════════════════════════════════════════════
function workerHazirla() {
  baslik('4/6 WORKER POOL');

  try {
    const { WorkerPool } = require('./agents/worker_core');
    const pool = new WorkerPool();
    const stat = pool.istatistikler();

    basari(`Worker Pool hazır — ${stat.toplam} ajan`);
    bilgi(`  KOMUTA: ${stat.katman_dagilimi.KOMUTA} | L1: ${stat.katman_dagilimi.L1} | L2: ${stat.katman_dagilimi.L2} | L3: ${stat.katman_dagilimi.L3}`);
    bilgi(`  Scraping: ${stat.scraping_sayisi} | AI: ${stat.ai_sayisi} | Kural: ${stat.kural_sayisi} | Hibrit: ${stat.hibrit_sayisi}`);
    bilgi(`  Sıfır maliyet: ${stat.sifir_maliyet}/${stat.toplam}`);

    return true;
  } catch (e) {
    hata('Worker Pool yüklenemedi: ' + e.message);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
// 5. NEXT.JS DEV SERVER (Opsiyonel)
// ══════════════════════════════════════════════════════════════
function nextBaslat(noServer) {
  baslik('5/6 NEXT.JS DEV SERVER');

  if (noServer) {
    bilgi('--no-server parametresi — Next.js başlatılmıyor');
    return true;
  }

  try {
    // Port kontrolü
    const net = require('net');
    const server = net.createServer();
    const portKontrol = new Promise((resolve) => {
      server.once('error', () => {
        uyari(`Port ${AYARLAR.NEXT_PORT} zaten kullanılıyor — Next.js zaten çalışıyor olabilir`);
        resolve(false);
      });
      server.once('listening', () => {
        server.close(() => resolve(true));
      });
      server.listen(AYARLAR.NEXT_PORT, '127.0.0.1');
    });

    // Senkron kontrol
    try {
      execSync(`netstat -ano | findstr :${AYARLAR.NEXT_PORT}`, { encoding: 'utf-8', stdio: 'pipe' });
      uyari(`Port ${AYARLAR.NEXT_PORT} meşgul — Next.js zaten çalışıyor`);
      basari('Next.js zaten aktif');
      return true;
    } catch {
      // Port boş — başlatabiliriz
    }

    bilgi('Next.js dev server başlatılıyor...');
    const child = spawn('npm', ['run', 'dev'], {
      cwd    : PROJE_KOK,
      stdio  : 'ignore',
      detached: true,
      shell  : true,
    });
    child.unref();

    basari(`Next.js başlatıldı (PID: ${child.pid}) — http://localhost:${AYARLAR.NEXT_PORT}`);
    return true;

  } catch (e) {
    uyari('Next.js başlatılamadı: ' + e.message);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
// 6. SİSTEM SAĞLIK KONTROLÜ
// ══════════════════════════════════════════════════════════════
function saglikKontrol(sonuclar) {
  baslik('6/6 SİSTEM SAĞLIK KONTROLÜ');

  const toplam = Object.keys(sonuclar).length;
  const basariliSayisi = Object.values(sonuclar).filter(v => v === true).length;
  const saglik = Math.round((basariliSayisi / toplam) * 100);

  console.log('');
  log('┌────────────────────────────┬──────────┐', RENK.cyan);
  log('│ MODÜL                      │ DURUM    │', RENK.cyan + RENK.kalin);
  log('├────────────────────────────┼──────────┤', RENK.cyan);

  for (const [modul, durum] of Object.entries(sonuclar)) {
    const emoji = durum ? '✅' : '❌';
    const durumStr = durum ? 'HAZIR' : 'HATA';
    const renk = durum ? RENK.yesil : RENK.kirmizi;
    log(`│ ${modul.padEnd(26)} │ ${emoji} ${durumStr.padEnd(5)} │`, renk);
  }

  log('└────────────────────────────┴──────────┘', RENK.cyan);
  console.log('');

  if (saglik >= 100) {
    log(`  🟢 SİSTEM SAĞLIĞI: ${saglik}% — TÜM MODÜLLER HAZIR`, RENK.kalin + RENK.yesil);
  } else if (saglik >= 60) {
    log(`  🟡 SİSTEM SAĞLIĞI: ${saglik}% — KISITLI ÇALIŞMA`, RENK.kalin + RENK.sari);
  } else {
    log(`  🔴 SİSTEM SAĞLIĞI: ${saglik}% — KRİTİK HATALAR`, RENK.kalin + RENK.kirmizi);
  }

  console.log('');
  return saglik;
}

// ══════════════════════════════════════════════════════════════
// DURUM KOMUTU
// ══════════════════════════════════════════════════════════════
function durumGoster() {
  baslik('SİSTEM DURUM RAPORU');

  try {
    const hat1 = require('./core/hat1_connection');
    const rapor = hat1.durumRaporu();
    bilgi('Hat-1 Çalışıyor: ' + rapor.calisiyor);
    for (const [id, h] of Object.entries(rapor.hatlar)) {
      bilgi(`  ${id}: ${h.durum} (${h.gecikme_ms}ms, basari:${h.basari}, hata:${h.hata})`);
    }
  } catch { uyari('Hat-1 modülü yüklenemedi'); }

  try {
    const hub = require('./core/hat1_hub');
    const rapor = hub.durumRaporu();
    bilgi('Hub V3 Çalışıyor: ' + rapor.calisiyor + ' (Port: ' + rapor.port + ')');
    bilgi('  İstatistik: ' + JSON.stringify(rapor.istatistik));
  } catch { uyari('Hub V3 modülü yüklenemedi'); }

  try {
    const { WorkerPool } = require('./agents/worker_core');
    const stat = new WorkerPool().istatistikler();
    bilgi('Worker Pool: ' + stat.toplam + ' ajan');
  } catch { uyari('Worker Pool yüklenemedi'); }
}

// ══════════════════════════════════════════════════════════════
// ANA FONKSİYON
// ══════════════════════════════════════════════════════════════
async function main() {
  const args = process.argv.slice(2);
  const noServer = args.includes('--no-server');
  const checkOnly = args.includes('--check');
  const statusOnly = args.includes('--status');

  console.log('');
  console.log(`${RENK.kalin}${RENK.cyan}  ███████╗████████╗██████╗${RENK.sifirla}`);
  console.log(`${RENK.kalin}${RENK.cyan}  ██╔════╝╚══██╔══╝██╔══██╗${RENK.sifirla}`);
  console.log(`${RENK.kalin}${RENK.cyan}  ███████╗   ██║   ██████╔╝${RENK.sifirla}`);
  console.log(`${RENK.kalin}${RENK.cyan}  ╚════██║   ██║   ██╔═══╝${RENK.sifirla}`);
  console.log(`${RENK.kalin}${RENK.cyan}  ███████║   ██║   ██║${RENK.sifirla}`);
  console.log(`${RENK.kalin}${RENK.cyan}  ╚══════╝   ╚═╝   ╚═╝${RENK.sifirla}`);
  console.log(`${RENK.soluk}  Sistem Takip Paneli — Master Launcher${RENK.sifirla}`);
  console.log(`${RENK.soluk}  Tarih: ${new Date().toISOString()}${RENK.sifirla}`);
  console.log('');

  // --status: Sadece durum göster
  if (statusOnly) {
    durumGoster();
    return;
  }

  // Modülleri sırayla başlat
  const sonuclar = {};

  // 1. Ortam kontrol
  sonuclar['Ortam Değişkenleri'] = ortamKontrol();

  if (checkOnly) {
    basari('--check modu: Sadece kontrol yapıldı, başlatma yok');
    saglikKontrol(sonuclar);
    return;
  }

  // 2. Hat-1 Connection
  sonuclar['Hat-1 Connection'] = await hat1Baslat();

  // 3. Hub V3
  sonuclar['Hat-1 Hub V3'] = await hubBaslat();

  // 4. Worker Pool
  sonuclar['Worker Pool'] = workerHazirla();

  // 5. Next.js (opsiyonel)
  sonuclar['Next.js Server'] = nextBaslat(noServer);

  // 6. Sağlık kontrolü
  const saglik = saglikKontrol(sonuclar);

  if (saglik >= 80) {
    console.log(`${RENK.kalin}${RENK.yesil}  Sistem Takip Paneli hazır.${RENK.sifirla}`);
    console.log(`${RENK.soluk}  Panel: http://localhost:${AYARLAR.NEXT_PORT}${RENK.sifirla}`);
  }
  console.log('');
}

// ── ÇALIŞTIR ─────────────────────────────────────────────────
main().catch(err => {
  hata('FATAL: ' + err.message);
  process.exit(1);
});

module.exports = { ortamKontrol, hat1Baslat, hubBaslat, workerHazirla, saglikKontrol };
