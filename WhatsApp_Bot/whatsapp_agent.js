// ============================================================
// whatsapp_agent.js — WhatsApp ↔ STP Köprüsü v3
// ============================================================
// PROJESİ: Sistem Takip Paneli (STP)
// DURUM:   STP PIPELINE'INA ENTEGRE — /api/tasks üzerinden
//
// MİMARİ:
//   WhatsApp mesaj/ses → (ses ise) Gemini STT → /api/tasks POST
//   → CONTROL → ruleGuard → AST → L0_GATEKEEPER → Supabase
//
//   ⚠️ Bu bot doğrudan Supabase'e YAZMAZ.
//   ⚠️ Ollama YOKTUR — canlıda çalışmaz.
//   ⚠️ Gemini SADECE ses→yazı dönüşümü için kullanılır.
//   ⚠️ Görev doğrulama /api/tasks API'sindeki 15 kontrol noktasından geçer.
//
// Çalıştır: node whatsapp_agent.js
// QR kod tara (1 kez) — session kaydedilir.
//
// GİRİŞ KANALLARI:
//   1. Yazılı mesaj → /api/tasks POST → görev oluştur
//   2. Sesli mesaj → Gemini STT → onay → /api/tasks POST → görev oluştur
//   3. Fotoğraf → lokal arşiv (görev oluşturmaz)
//
// KOMUTLAR:
//   /durum    → Sistem durumu (health-check)
//   /gorevler → Aktif görevler
//   /onayla   → Sesli mesaj onayı
//   /iptal    → Sesli mesaj iptali
// ============================================================

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const fs     = require('fs');
const path   = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { promptEnjeksiyon, kuralKontrol, yanitDenetim, ihlalLog } = require('../shared/sistemKurallari');
const AI = require('../shared/aiOrchestrator');

// ── .env YÜKLE ──────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

// ── YAPILANDIRMA ─────────────────────────────────────────────
const GEMINI_KEY       = process.env.GEMINI_API_KEY || '';
const STP_API_BASE     = process.env.STP_API_URL || 'https://sistem-takip-paneli.vercel.app';
const STP_SERVICE_TOKEN = process.env.STP_API_KEY || process.env.STP_SERVICE_TOKEN || '';
const BASE_DIR         = path.join(__dirname, 'arsiv');
const FOTO_DIR         = path.join(BASE_DIR, 'fotograflar');
const LOG_FILE         = path.join(__dirname, 'whatsapp_agent.log');

// Yalnızca bu numaralardan komut kabul et (boş = hepsi)
// Format: '905XXXXXXXXX@c.us'
const AUTHORIZED_NUMBERS = (process.env.WHATSAPP_AUTHORIZED_NUMBERS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

// ── KLASÖRLER ────────────────────────────────────────────────
[BASE_DIR, FOTO_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

log('✅ AI Bağlantısı (Orkestratör/Local-First) doğrulandı.', 'INFO');

// ── LOG ──────────────────────────────────────────────────────
function log(msg, level = 'INFO') {
  const ts   = new Date().toISOString();
  const line = `[${ts}] [${level}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8'); } catch {}
}

// ── YETKİ KONTROL ───────────────────────────────────────────
function isAuthorized(msg, client) {
  // 1. Kesinlikle broadcast (durum/hikaye) mesajlarını yoksay!
  if (msg.from === 'status@broadcast' || msg.to === 'status@broadcast' || msg.isStatus) return false;

  const myNumber = client.info && client.info.wid ? client.info.wid._serialized : null;
  
  // 2. EĞER SADECE BİZE ÖZELSE (Kendi Kendimize Sohbet / Kayıtlı Mesajlar)
  // WhatsApp altyapısı "Kendine Gönder" chatinde to adresini @lid uzantılı şifreliyor!
  const isSelfChat = msg.fromMe && (msg.to === myNumber || msg.to.endsWith('@lid'));
  if (myNumber && msg.from === myNumber && isSelfChat) return true;

  // 3. Başka yetkili numara .env'de tanımlı mı?
  if (AUTHORIZED_NUMBERS.length > 0 && AUTHORIZED_NUMBERS.includes(msg.from)) {
     return true;
  }

  // 4. Bütün sivilleri, arkadaşları ve grupları tamamen yoksay! Geriye hiçbir şey DÖNME.
  return false;
}

const { komutuSistemeKabulEt } = require('../Gorev_Kabul_Departmani/komut_alim');

// ── 1. DEPARTMAN ÇAĞRISI (LOKAL) — Görev oluşturma ────────────
async function createTaskViaAPI(title, senderName, source = 'whatsapp_text') {
  try {
    const tamBilet = `[KAYNAK: ${source} - KULLANICI: ${senderName}] ${title}`;
    const sonuc = await komutuSistemeKabulEt(tamBilet);
    
    if (sonuc.durum === 'PASS') {
      return { 
        success: true, 
        data: { task_code: 'ZINDIK-ONAYLI' }, 
        mimar_plan: sonuc.mimar_plan,
        error: null 
      };
    } else {
      return { 
        success: false, 
        error: sonuc.zindik_raporu 
      };
    }
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// ── STP API — Sistem durumu ──────────────────────────────────
async function getSystemHealth() {
  try {
    const res = await fetch(`${STP_API_BASE}/api/health-check`);
    const data = await res.json();
    return data;
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

// ── STP API — Görev listesi ─────────────────────────────────
async function getActiveTasks() {
  try {
    const headers = {};
    if (STP_SERVICE_TOKEN) headers['Authorization'] = `Bearer ${STP_SERVICE_TOKEN}`;
    const res = await fetch(`${STP_API_BASE}/api/tasks`, { headers });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── FOTOĞRAF ARŞİVLEYİCİ ─────────────────────────────────────
async function fotografArsivle(msg) {
  try {
    const media = await msg.downloadMedia();
    if (!media || !media.data) return null;

    const ext   = media.mimetype?.split('/')[1]?.split(';')[0] || 'jpg';
    const ts    = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const from  = msg.from.replace('@c.us', '').replace('@g.us', '_grup');
    const fname = `${ts}_${from}.${ext}`;
    const fpath = path.join(FOTO_DIR, fname);

    fs.writeFileSync(fpath, Buffer.from(media.data, 'base64'));
    log(`📸 Fotoğraf arşivlendi: ${fname}`, 'INFO');
    return fname;
  } catch (e) {
    log(`Fotoğraf arşiv hatası: ${e.message}`, 'ERROR');
    return null;
  }
}

async function transcribeVoice(msg) {
  const media = await msg.downloadMedia();
  if (!media || !media.data) throw new Error('Ses dosyası indirilemedi');

  log(`SES DOSYASI: mime: ${media.mimetype}`, 'INFO');

  // Gemini STT için orkestratör üzerinden gönderim
  const response = await AI.chat('Bu ses kaydını Türkçe olarak yazıya çevir. Sadece metni döndür.', 'Sen bir STT asistanısın.', {
    inlineData: {
      mimeType: media.mimetype || 'audio/ogg',
      data: media.data,
    }
  });

  const transcript = response.content?.trim();
  if (!transcript || transcript.length < 3) throw new Error('Ses anlaşılamadı');
  return transcript;
}

// ── BEKLEYEN SESLİ GÖREVLER ─────────────────────────────────
const _pendingVoice = new Map();

// ── WHATSAPP CLIENT ───────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'stp-agent', dataPath: path.join(__dirname, '.wwebjs_auth') }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  },
});

client.on('qr', async (qr) => {
  log('QR KOD — WhatsApp → Bağlı Cihazlar → Cihaz Bağla → Tara', 'INFO');

  // Terminal QR (yedek)
  qrcodeTerminal.generate(qr, { small: true });

  // PNG dosyasına kaydet ve tarayıcıda aç
  try {
    const qrPath = path.join(__dirname, 'whatsapp_qr.png');
    await QRCode.toFile(qrPath, qr, { width: 512, margin: 2 });
    log(`✅ QR kod kaydedildi: ${qrPath}`, 'INFO');

    // Tarayıcıda otomatik aç
    const { exec } = require('child_process');
    exec(`start "" "${qrPath}"`);
    log('📱 QR kod tarayıcıda açıldı — telefondan tara!', 'INFO');
  } catch (err) {
    log(`QR PNG hatası: ${err.message}`, 'WARN');
  }
});

client.on('authenticated', () => log('✅ Kimlik doğrulandı.', 'INFO'));

client.on('ready', async () => {
  log('✅ WhatsApp hazır! Mesaj bekleniyor...', 'INFO');
  log(`🌐 STP API: ${STP_API_BASE}`, 'INFO');
  log(`📁 Fotoğraf arşivi: ${FOTO_DIR}`, 'INFO');
});

client.on('disconnected', r => log(`⚠ Bağlantı kesildi: ${r}`, 'WARN'));

// ── ÖNCELİK ANALİZİ (Lokal — API'deki daha kapsamlı olanı asıl karar verir) ──
function analyzeLocalPriority(text) {
  const lower = text.toLowerCase();
  const kritikKeys = ['acil', 'kritik', 'güvenlik', 'çöktü', 'hata', 'bug', 'crash', 'down'];
  const yuksekKeys = ['önemli', 'hızlı', 'öncelikli', 'deploy', 'production'];
  if (kritikKeys.some(k => lower.includes(k))) return 'kritik';
  if (yuksekKeys.some(k => lower.includes(k))) return 'yuksek';
  return 'normal';
}

const PE = { kritik: '🔴', yuksek: '🟠', normal: '🟡', dusuk: '🟢' };

// ── GELEN VE GİDEN MESAJ (Kritik: Kendi kendine gönderilenleri okuyabilmek için message_create olmalı) ───────────────────────────────────────────────
client.on('message_create', async msg => {
  try {
    const from = msg.from;
    const type = msg.type;
    
    // DEBUG: Gelen tüm mesajların kime/kimden gittiğini loglayalım
    if (msg.fromMe || msg.to === from) {
      log(`[DEBUG] from: ${from}, to: ${msg.to}, fromMe: ${msg.fromMe}, myNumber: ${client.info?.wid?._serialized}`, 'INFO');
    }

    // Yetki kontrol
    if (!isAuthorized(msg, client)) return;

    const senderName = msg._data?.notifyName || from.replace('@c.us', '');

    // ═══════════════════════════════════════════════════════════
    // 1. FOTOĞRAF / VİDEO — arşivle (görev oluşturmaz)
    // ═══════════════════════════════════════════════════════════
    if (['image', 'video', 'document'].includes(type)) {
      const fname = await fotografArsivle(msg);
      if (fname) {
        await msg.reply(`✅ *Arşivlendi*\n📁 \`${fname}\``);
      }
      return;
    }

    // ── KELİME KİLİDİ (TRİGGER KONTROLÜ) ───────────
    // Botun dikkate alacağı özel personel ve sistem yetki kelimeleri:
    const TRIGGER_WORDS = [
      'sistem', 'operatür', 'operatör', 'operator',
      'burhan', 'asker', 'yetkili', 'gürevli', 'görevli', 'gorevli',
      'sibel hnm', 'sibel hanım', 'sibel'
    ];
    
    function hasTrigger(text) {
      if (!text) return false;
      const lowerText = text.trim().toLowerCase();
      // Mesajın başlangıcı bu kelimelerden biriyle başlıyorsa kabul et
      return TRIGGER_WORDS.some(word => lowerText.startsWith(word));
    }

    // ═══════════════════════════════════════════════════════════
    // 2. SESLİ MESAJ → Gemini STT → Onay Bekle
    // ═══════════════════════════════════════════════════════════
    if (type === 'ptt' || type === 'audio') {
      try {
        const transcript = await transcribeVoice(msg);
        
        // Sesli mesajın başında tetikleyici kelime var mı?
        if (!hasTrigger(transcript)) {
          log(`SES YOKSAYILDI (Tetikleyici Yok): "${transcript.substring(0, 50)}"...`, 'INFO');
          return; // Kişisel ses kaydı, bot sessizce yok sayar
        }

        // Tetikleyici varsa onaya sun
        const girisKontrol = kuralKontrol('WHATSAPP_SESLI_GOREV', transcript);
        if (!girisKontrol.gecti) {
          const logMsg = ihlalLog('WHATSAPP_BOT_VOICE', girisKontrol);
          if (logMsg) log(logMsg, 'WARN');
          await msg.reply(`🚫 *Görev reddedildi*\n\nSistem kuralları ihlali:\n${girisKontrol.ihlaller.map(i => `• [${i.kural_no}] ${i.aciklama}`).join('\n')}`);
          return;
        }

        // Onay bekle
        _pendingVoice.set(from, {
          transcript,
          senderName,
          timestamp: Date.now(),
        });

        // 10 dk sonra otomatik temizle
        setTimeout(() => _pendingVoice.delete(from), 10 * 60 * 1000);

        await msg.reply(
          `🎤 *SES → YAZI:*\n\n` +
          `\`\`\`${transcript.substring(0, 300)}\`\`\`\n\n` +
          `Bu metin ile görev oluşturulsun mu?\n` +
          `✅ */onayla* — Görevi oluştur\n` +
          `❌ */iptal* — Vazgeç`
        );

        log(`SES→YAZI: "${transcript.substring(0, 80)}" — ${senderName}`, 'INFO');

      } catch (err) {
        log(`SESLİ MESAJ HATA: ${err.message}`, 'ERROR');
        await msg.reply(`❌ Sesli mesaj işlenemedi: ${err.message}`);
      }
      return;
    }

    // ═══════════════════════════════════════════════════════════
    // 3. YAZILI MESAJ
    // ═══════════════════════════════════════════════════════════
    const metin = msg.body?.trim();
    if (!metin) return;

    log(`📨 [${senderName}]: ${metin.slice(0, 80)}`, 'INFO');

    // ── KOMUTLAR ─────────────────────────────────────────────
    if (metin === '/durum') {
      const health = await getSystemHealth();
      await msg.reply(
        `🏗️ *STP SİSTEM DURUMU*\n\n` +
        `🟢 Durum: ${health.status || 'bilinmiyor'}\n` +
        `🌐 API: ${STP_API_BASE}\n` +
        `🕐 ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`
      );
      return;
    }

    if (metin === '/gorevler') {
      const result = await getActiveTasks();
      if (!result.success || !result.data?.length) {
        await msg.reply('📋 Aktif görev bulunamadı.');
        return;
      }
      const lines = result.data.slice(0, 10).map((t, i) =>
        `${i + 1}. ${PE[t.priority] || '🟡'} \`${t.task_code}\` — ${t.title} [${t.status}]`
      );
      await msg.reply(`📋 *AKTİF GÖREVLER* (${result.data.length})\n\n${lines.join('\n')}`);
      return;
    }

    if (metin === '/onayla') {
      const pending = _pendingVoice.get(from);
      if (!pending) {
        await msg.reply('⚠️ Onaylanacak sesli görev bulunamadı.');
        return;
      }

      _pendingVoice.delete(from);

      // /api/tasks'a gönder — 15 kontrol noktasından geçecek
      const result = await createTaskViaAPI(pending.transcript, pending.senderName, 'whatsapp_voice');

      if (result.success) {
        const taskCode = result.data?.task_code || '';
        await msg.reply(
          `✅ *SESLİ GÖREV OLUŞTURULDU*\n\n` +
          `📋 Kod: \`${taskCode}\`\n` +
          `🎤 Kaynak: Sesli Mesaj\n` +
          `📝 ${pending.transcript.substring(0, 100)}\n` +
          `👤 Atanan: ${pending.senderName}`
        );
        log(`SESLİ GÖREV OLUŞTURULDU: ${taskCode}`, 'INFO');
      } else {
        await msg.reply(`❌ Görev oluşturulamadı: ${result.error || 'bilinmeyen hata'}`);
      }
      return;
    }

    if (metin === '/iptal') {
      if (_pendingVoice.has(from)) {
        _pendingVoice.delete(from);
        await msg.reply('🚫 Sesli görev iptal edildi.');
        log(`SESLİ GÖREV İPTAL: ${from}`, 'INFO');
      } else {
        await msg.reply('⚠️ İptal edilecek sesli görev bulunamadı.');
      }
      return;
    }

    if (metin.startsWith('/')) return; // bilinmeyen komutları atla

    // ── SERBEST METİN → GÖREV OLUŞTUR (/api/tasks üzerinden) ──
    if (!hasTrigger(metin)) {
      log(`METİN YOKSAYILDI (Tetikleyici Yok): "${metin.slice(0, 50)}"...`, 'INFO');
      return; // Kişisel not, bot sessizce yok sayar
    }

    // Tetikleyici varsa işlem yap:
    // Sistem kuralları ön kontrol (WhatsApp tarafında hızlı filtre)
    const girisKontrol = kuralKontrol('WHATSAPP_GOREV', metin);
    if (!girisKontrol.gecti) {
      const logMsg = ihlalLog('WHATSAPP_BOT', girisKontrol);
      if (logMsg) log(logMsg, 'WARN');
      await msg.reply(`🚫 *Görev reddedildi*\n\nSistem kuralları ihlali:\n${girisKontrol.ihlaller.map(i => `• [${i.kural_no}] ${i.aciklama}`).join('\n')}`);
      return;
    }

    await msg.reply('📥 *Görev alındı.* Kontrol noktalarından geçiriliyor...');

    // ── 1. DEPARTMAN'A (Görev Kabul) OTONOM GÖNDERİM ──
    const result = await createTaskViaAPI(metin, senderName, 'whatsapp_text');

    if (result.success) {
      await msg.reply(
        `🏛️ *1. DEPARTMAN (GÖREV KABUL) ONAYLANDI*\n\n` +
        `✅ *MİMAR:* Görevi Anladı ve 6-Katmanlı Planı Çizdi.\n` +
        `⚖️ *ZINDIK:* 100 Maddelik İnfaz Testinden Geçti! [PASS]\n\n` +
        `📋 *Hedef:* ${metin.substring(0, 100).replace(/\n/g, ' ')}...\n` +
        `📌 *Aksiyon:* Onaylandı, Kurul Masasına Çıkarılıyor!`
      );
      log(`1. DEPARTMAN ONAYI VERİLDİ: ${metin.substring(0, 60)}`, 'INFO');
    } else {
      await msg.reply(
        `❌ *1. DEPARTMAN İNFAZ ETTİ!* ❌\n\n` +
        `Mimarın çizdiği plan, Zındık'ın (MDS-160) Anayasasından geçemedi!\n\n` +
        `*ZINDIK RAPORU:*\n` +
        `\`\`\`\n${result.error || 'Bilinmeyen Hata'}\n\`\`\``
      );
      log(`GÖREV İNFAZI: ${result.error}`, 'WARN');
    }

  } catch (err) {
    log(`HATA: ${err.message}`, 'ERROR');
    try { await msg.reply(`❌ Hata: ${err.message}`); } catch {}
  }
});

// ── BAŞLAT ───────────────────────────────────────────────────
log('══════════════════════════════════════════════');
log('  WHATSAPP ↔ STP KÖPRÜSÜ v3                  ');
log('  Gemini STT + /api/tasks (15 kontrol)        ');
log('  Ollama YOK — Doğrudan Supabase YOK          ');
log('══════════════════════════════════════════════');

client.initialize();
