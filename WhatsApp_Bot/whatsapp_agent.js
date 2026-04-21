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
const qrcode = require('qrcode-terminal');
const fs     = require('fs');
const path   = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { promptEnjeksiyon, kuralKontrol, yanitDenetim, ihlalLog } = require('../shared/sistemKurallari');

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
const STP_API_KEY      = process.env.STP_API_KEY || '';
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

// ── GEMINI AI (SADECE SES→YAZI İÇİN) ────────────────────────
let geminiModel = null;
if (GEMINI_KEY) {
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  log('✅ Gemini AI bağlandı (SADECE ses→yazı için).', 'INFO');
} else {
  log('⚠️ GEMINI_API_KEY yok — sesli mesaj desteği devre dışı.', 'WARN');
}

// ── LOG ──────────────────────────────────────────────────────
function log(msg, level = 'INFO') {
  const ts   = new Date().toISOString();
  const line = `[${ts}] [${level}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8'); } catch {}
}

// ── YETKİ KONTROL ───────────────────────────────────────────
function isAuthorized(from) {
  if (AUTHORIZED_NUMBERS.length === 0) return true;
  return AUTHORIZED_NUMBERS.includes(from);
}

// ── STP API ÇAĞRISI — Görev oluşturma ────────────────────────
// Doğrudan Supabase'e yazmaz! /api/tasks endpoint'i 15 kontrol noktasından geçirir.
async function createTaskViaAPI(title, senderName, source = 'whatsapp_text') {
  const url = `${STP_API_BASE}/api/tasks`;
  const headers = { 'Content-Type': 'application/json' };
  if (STP_API_KEY) headers['Authorization'] = `Bearer ${STP_API_KEY}`;

  const body = JSON.stringify({
    title: title.substring(0, 200),
    description: `WhatsApp üzerinden gönderildi (${source})`,
    priority: 'normal',
    assigned_to: senderName,
    operator_name: senderName,
  });

  const response = await fetch(url, { method: 'POST', headers, body });
  const result = await response.json();
  return result;
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
    if (STP_API_KEY) headers['Authorization'] = `Bearer ${STP_API_KEY}`;
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

// ── SESLİ MESAJ → YAZIYA ÇEVİR (Gemini STT) ─────────────────
async function transcribeVoice(msg) {
  if (!geminiModel) throw new Error('Gemini AI bağlı değil — sesli mesaj çevrilemez');

  const media = await msg.downloadMedia();
  if (!media || !media.data) throw new Error('Ses dosyası indirilemedi');

  const audioBuffer = Buffer.from(media.data, 'base64');
  log(`SES DOSYASI: ${audioBuffer.length} byte, mime: ${media.mimetype}`, 'INFO');

  const result = await geminiModel.generateContent([
    {
      inlineData: {
        mimeType: media.mimetype || 'audio/ogg',
        data: media.data, // zaten base64
      },
    },
    { text: 'Bu ses kaydını Türkçe olarak yazıya çevir. Sadece çevrilen metni döndür, başka bir şey ekleme.' },
  ]);

  const transcript = result.response.text()?.trim();
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

client.on('qr', qr => {
  log('QR KOD — WhatsApp → Bağlı Cihazlar → Cihaz Bağla → Tara', 'INFO');
  qrcode.generate(qr, { small: true });
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

// ── GELEN MESAJ ───────────────────────────────────────────────
client.on('message', async msg => {
  try {
    const from = msg.from;
    const type = msg.type;

    // Yetki kontrol
    if (!isAuthorized(from)) return;

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

    // ═══════════════════════════════════════════════════════════
    // 2. SESLİ MESAJ → Gemini STT → Onay Bekle
    // ═══════════════════════════════════════════════════════════
    if (type === 'ptt' || type === 'audio') {
      await msg.reply('🎤 *Sesli mesaj alındı.* Yazıya çevriliyor...');

      try {
        const transcript = await transcribeVoice(msg);

        // Sistem kuralları ön kontrol
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
    // Sistem kuralları ön kontrol (WhatsApp tarafında hızlı filtre)
    const girisKontrol = kuralKontrol('WHATSAPP_GOREV', metin);
    if (!girisKontrol.gecti) {
      const logMsg = ihlalLog('WHATSAPP_BOT', girisKontrol);
      if (logMsg) log(logMsg, 'WARN');
      await msg.reply(`🚫 *Görev reddedildi*\n\nSistem kuralları ihlali:\n${girisKontrol.ihlaller.map(i => `• [${i.kural_no}] ${i.aciklama}`).join('\n')}`);
      return;
    }

    await msg.reply('📥 *Görev alındı.* Kontrol noktalarından geçiriliyor...');

    // /api/tasks POST — 15 kontrol noktası burada çalışır
    const result = await createTaskViaAPI(metin, senderName, 'whatsapp_text');

    if (result.success) {
      const taskCode = result.data?.task_code || '';
      const priority = analyzeLocalPriority(metin);
      await msg.reply(
        `✅ *GÖREV OLUŞTURULDU*\n\n` +
        `📋 Kod: \`${taskCode}\`\n` +
        `📝 ${metin.substring(0, 100)}\n` +
        `${PE[priority]} Öncelik: ${priority.toUpperCase()}\n` +
        `👤 Atanan: ${senderName}\n` +
        `📌 Durum: Beklemede`
      );
      log(`GÖREV OLUŞTURULDU: ${taskCode} — ${metin.substring(0, 60)}`, 'INFO');
    } else {
      await msg.reply(`❌ Görev oluşturulamadı: ${result.error || 'bilinmeyen hata'}\n\n_15 kontrol noktasından biri tarafından reddedilmiş olabilir._`);
      log(`GÖREV REDDEDİLDİ: ${result.error}`, 'WARN');
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
