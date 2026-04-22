// ============================================================
// TELEGRAM BOT — Bağımsız Modül v3 (API KANALI)
// ============================================================
// PROJESİ: Sistem Takip Paneli (STP)
// DURUM:   STP PIPELINE'INA ENTEGRE — /api/tasks üzerinden
//
// MİMARİ:
//   - Doğrudan Supabase erişimi YASAKTIR.
//   - Tüm işlemler /api/tasks API endpoint'i üzerinden yapılır.
//   - Güvenlik: STP_SERVICE_TOKEN + Origin header zorunludur.
//
// Çalıştır: node index.js
// ============================================================

const { Bot } = require('grammy');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const http = require('http');
const fs   = require('fs');
const path = require('path');
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

// ── YAPILANDIRMA ────────────────────────────────────────────
const BOT_TOKEN         = process.env.TELEGRAM_BOT_TOKEN || '';
const AUTH_IDS          = (process.env.TELEGRAM_AUTHORIZED_CHAT_IDS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
const STP_API_BASE      = process.env.STP_API_URL || 'https://sistem-takip-paneli.vercel.app';
const STP_SERVICE_TOKEN = process.env.STP_SERVICE_TOKEN || '';
const GEMINI_KEY        = process.env.GEMINI_API_KEY || '';
const OLLAMA_URL        = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL      = process.env.OLLAMA_MODEL || 'llama3:latest';
const LOG_FILE          = path.join(__dirname, 'bot.log');

// ── LOG ──────────────────────────────────────────────────────
function log(msg, level = 'INFO') {
  const ts   = new Date().toISOString();
  const line = `[${ts}] [${level}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8'); } catch {}
}

// ── GEMINI AI CLIENT ────────────────────────────────────────
let geminiModel = null;
if (GEMINI_KEY) {
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  log('✅ Gemini AI bağlandı (gemini-2.5-flash).', 'INFO');
}

// ── YETKİ KONTROL ───────────────────────────────────────────
function isAuthorized(chatId) {
  if (AUTH_IDS.length === 0) return true;
  return AUTH_IDS.includes(String(chatId));
}

// ── STP API ÇAĞRILARI ────────────────────────────────────────

const { komutuSistemeKabulEt } = require('../Gorev_Kabul_Departmani/komut_alim');

// 1. Görev Oluştur (LOKAL - MİMAR VE ZINDIK)
async function createTaskViaAPI(title, senderName, source = 'telegram_text') {
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

// 2. Görev Güncelle (PUT)
async function updateTaskViaAPI(taskCode, updates) {
  const url = `${STP_API_BASE}/api/tasks`;
  const headers = { 
    'Content-Type': 'application/json',
    'Origin': STP_API_BASE,
    'Authorization': `Bearer ${STP_SERVICE_TOKEN}`
  };

  const body = JSON.stringify({
    task_code: taskCode.toUpperCase(),
    ...updates
  });

  const response = await fetch(url, { method: 'PUT', headers, body });
  return await response.json();
}

// 3. Görev Listele / Süz (GET)
async function getTasksViaAPI(params = {}) {
  const query = new URLSearchParams({ action: 'list', ...params });
  const url = `${STP_API_BASE}/api/tasks?${query.toString()}`;
  const headers = { 
    'Origin': STP_API_BASE,
    'Authorization': `Bearer ${STP_SERVICE_TOKEN}`
  };

  const response = await fetch(url, { headers });
  return await response.json();
}

// 4. Sistem Durumu (Health Check)
async function getSystemHealth() {
  try {
    const res = await fetch(`${STP_API_BASE}/api/health-check`);
    return await res.json();
  } catch (err) {
    return { status: 'error', error: err.message };
  }
}

// ── AI ÇAĞRISI (Aynı kaldı ancak API üzerinden görev oluşturacak) ──
async function aiChat(system, user) {
  const kuralBlok = promptEnjeksiyon('TELEGRAM');
  const prompt = `${system}\n\n${kuralBlok}\n\nKullanıcı mesajı: ${user}`;
  
  if (geminiModel) {
    try {
      const result = await geminiModel.generateContent(prompt);
      const yanit = result.response.text();
      const denetim = yanitDenetim(yanit, 'L1');
      if (!denetim.gecti) return '[FİLTRELENDİ]';
      return { text: yanit, source: 'gemini' };
    } catch (e) { log(`Gemini hata: ${e.message}`, 'WARN'); }
  }
  
  // Ollama fallback path (eğer lokal ise)
  return { text: "AI Servisi şu an meşgul (API).", source: 'system' };
}

// ── EMOJI YARDIMCILARI ──────────────────────────────────────
const PE = { kritik: '🔴', yuksek: '🟠', normal: '🟡', dusuk: '🟢' };
const SE = { beklemede: '⏳', devam_ediyor: '⚡', dogrulama: '🔍', tamamlandi: '✅', reddedildi: '❌', iptal: '🚫' };

// ══════════════════════════════════════════════════════════════
// BOT BAŞLAT
// ══════════════════════════════════════════════════════════════
if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN tanımlı değil!');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// ── /start ──────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  const chatId = ctx.chat?.id ?? 0;
  await ctx.reply([
    `🏗️ <b>STP TELEGRAM BOT</b> (v3 API Channel)`,
    ``,
    `Merhaba! Ben Sistem Takip Paneli'nin Telegram botu.`,
    `Tüm komutlar 15 kontrol noktasından geçerek API üzerinden işlenir.`,
    ``,
    `<b>Kullanım:</b>`,
    `• Mesaj yaz → Görev oluşturulur`,
    `• /durum → Sistem durumu`,
    `• /gorevler → Aktif görevler`,
    `• /yardim → Komut listesi`,
    ``,
    `📡 Chat ID: <code>${chatId}</code>`,
  ].join('\n'), { parse_mode: 'HTML' });
});

// ── /durum ──────────────────────────────────────────────────
bot.command('durum', async (ctx) => {
  const health = await getSystemHealth();
  const geminiStatus = geminiModel ? '🟢 AKTİF' : '🔴 API KEY YOK';

  await ctx.reply([
    `📊 <b>SİSTEM DURUMU</b>`,
    ``,
    `🏗️ <b>API Durumu:</b> ${health.status === 'ok' ? '🟢 OPERASYONEL' : '🔴 HATA'}`,
    `🧠 <b>Gemini AI:</b> ${geminiStatus}`,
    `📡 <b>Telegram Bot:</b> 🟢 AKTİF (API)`,
    `🌐 <b>Endpoint:</b> ${STP_API_BASE}`,
    `🕐 <b>Zaman:</b> ${new Date().toISOString()}`,
  ].join('\n'), { parse_mode: 'HTML' });
});

// ── /yardim ─────────────────────────────────────────────────
bot.command('yardim', async (ctx) => {
  await ctx.reply([
    `📖 <b>KOMUT LİSTESİ</b>`,
    ``,
    `<b>📋 GÖREV YÖNETİMİ:</b>`,
    `💬 Mesaj yaz → Görev olarak kaydedilir`,
    `/gorevler — Aktif görev listesi`,
    `/gorev TSK-xxx — Görev detayı`,
    `/tamamla TSK-xxx — Görevi tamamla`,
    `/iptal TSK-xxx — Görevi iptal et`,
    ``,
    `<b>🔍 ARAMA & RAPOR:</b>`,
    `/ara <kelime> — Görevlerde arama`,
    `/rapor — Sistem özet raporu`,
    ``,
    `<b>ℹ️ DİĞER:</b>`,
    `/start — Başlangıç`,
    `/durum — Sistem durumu`,
    `/yardim — Bu liste`,
  ].join('\n'), { parse_mode: 'HTML' });
});

// ── /gorevler ───────────────────────────────────────────────
bot.command('gorevler', async (ctx) => {
  if (!isAuthorized(ctx.chat?.id)) { await ctx.reply('⛔ YETKİSİZ ERİŞİM.'); return; }

  try {
    const result = await getTasksViaAPI({ limit: 15 });
    if (!result.success) { await ctx.reply(`❌ API Hatası: ${result.error}`); return; }
    
    const data = result.data || [];
    if (data.length === 0) { await ctx.reply('📭 Aktif görev bulunamadı.'); return; }

    const lines = data.map((t, i) =>
      `${i + 1}. ${PE[t.priority] ?? '🟡'}${SE[t.status] ?? '⏳'} <code>${t.task_code}</code>\n   ${t.title}\n   → ${t.assigned_to} | ${t.status}`
    );
    await ctx.reply([`📋 <b>AKTİF GÖREVLER</b> (${data.length})`, '', ...lines].join('\n'), { parse_mode: 'HTML' });
  } catch (err) {
    log(`GOREVLER HATA: ${err.message}`, 'ERROR');
    await ctx.reply('❌ Görevler alınamadı.');
  }
});

// ── /gorev TSK-xxx ──────────────────────────────────────────
bot.command('gorev', async (ctx) => {
  if (!isAuthorized(ctx.chat?.id)) { await ctx.reply('⛔ YETKİSİZ ERİŞİM.'); return; }
  const taskCode = ctx.match?.trim();
  if (!taskCode) { await ctx.reply('⚠️ Kullanım: /gorev TSK-xxx'); return; }

  try {
    const result = await getTasksViaAPI({ task_code: taskCode.toUpperCase() });
    const data = result.data?.[0];
    
    if (!result.success || !data) { await ctx.reply(`❌ Görev bulunamadı: <code>${taskCode}</code>`, { parse_mode: 'HTML' }); return; }

    const created = new Date(data.created_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
    await ctx.reply([
      `📋 <b>GÖREV DETAYI</b>`, '',
      `<b>Kod:</b> <code>${data.task_code}</code>`,
      `<b>Başlık:</b> ${data.title}`,
      `${PE[data.priority] ?? '🟡'} <b>Öncelik:</b> ${data.priority.toUpperCase()}`,
      `<b>Durum:</b> ${data.status}`,
      `<b>Atanan:</b> ${data.assigned_to}`,
      `<b>Oluşturulma:</b> ${created}`,
      '', `✅ /tamamla ${data.task_code}`, `🚫 /iptal ${data.task_code}`,
    ].join('\n'), { parse_mode: 'HTML' });
  } catch (err) {
    log(`GOREV_DETAY HATA: ${err.message}`, 'ERROR');
    await ctx.reply('❌ Görev detayı alınamadı.');
  }
});

// ── /tamamla TSK-xxx ────────────────────────────────────────
bot.command('tamamla', async (ctx) => {
  if (!isAuthorized(ctx.chat?.id)) { await ctx.reply('⛔ YETKİSİZ ERİŞİM.'); return; }
  const taskCode = ctx.match?.trim();
  if (!taskCode) { await ctx.reply('⚠️ Kullanım: /tamamla TSK-xxx'); return; }

  try {
    const result = await updateTaskViaAPI(taskCode, { status: 'tamamlandi' });
    if (!result.success) { await ctx.reply(`❌ Hata: ${result.error}`); return; }

    log(`GÖREV TAMAMLANDI: ${taskCode}`, 'INFO');
    await ctx.reply(`✅ <b>GÖREV TAMAMLANDI</b>\n\nKod: <code>${taskCode}</code>\nBaşlık: ${result.task?.title ?? ''}`, { parse_mode: 'HTML' });
  } catch (err) {
    await ctx.reply('❌ Görev tamamlanırken hata oluştu.');
  }
});

// ── /iptal TSK-xxx ──────────────────────────────────────────
bot.command('iptal', async (ctx) => {
  if (!isAuthorized(ctx.chat?.id)) { await ctx.reply('⛔ YETKİSİZ ERİŞİM.'); return; }
  const taskCode = ctx.match?.trim();
  if (!taskCode) { await ctx.reply('⚠️ Kullanım: /iptal TSK-xxx'); return; }

  try {
    const result = await updateTaskViaAPI(taskCode, { status: 'iptal' });
    if (!result.success) { await ctx.reply(`❌ Hata: ${result.error}`); return; }

    log(`GÖREV İPTAL: ${taskCode}`, 'INFO');
    await ctx.reply(`🚫 <b>GÖREV İPTAL EDİLDİ</b>\n\nKod: <code>${taskCode}</code>\nBaşlık: ${result.task?.title ?? ''}`, { parse_mode: 'HTML' });
  } catch (err) {
    await ctx.reply('❌ Görev iptal edilirken hata oluştu.');
  }
});

// ── /ara <kelime> ───────────────────────────────────────────
bot.command('ara', async (ctx) => {
  if (!isAuthorized(ctx.chat?.id)) { await ctx.reply('⛔ YETKİSİZ ERİŞİM.'); return; }
  const query = ctx.match?.trim();
  if (!query) { await ctx.reply('⚠️ Kullanım: /ara <aranacak kelime>'); return; }

  try {
    const result = await getTasksViaAPI({ search: query, limit: 10 });
    if (!result.success) { await ctx.reply(`❌ API Hatası: ${result.error}`); return; }
    
    const tasks = result.data || [];
    if (tasks.length === 0) { await ctx.reply(`🔍 <b>"${query}"</b> için sonuç bulunamadı.`, { parse_mode: 'HTML' }); return; }

    const lines = tasks.map((t, i) =>
      `${i + 1}. ${PE[t.priority] ?? '🟡'} <code>${t.task_code}</code> — ${t.title} [${t.status}]`
    );
    await ctx.reply([`🔎 <b>ARAMA: "${query}"</b> (${tasks.length})`, '', ...lines].join('\n'), { parse_mode: 'HTML' });
  } catch (err) {
    await ctx.reply('❌ Arama sırasında hata oluştu.');
  }
});

// ── /rapor ──────────────────────────────────────────────────
bot.command('rapor', async (ctx) => {
  if (!isAuthorized(ctx.chat?.id)) { await ctx.reply('⛔ YETKİSİZ ERİŞİM.'); return; }

  try {
    const result = await getTasksViaAPI({ limit: 100 });
    if (!result.success) { await ctx.reply(`❌ API Hatası: ${result.error}`); return; }

    const all = result.data || [];
    const byStatus = {}, byPriority = {};
    all.forEach(t => {
      byStatus[t.status]     = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    });

    await ctx.reply([
      `📊 <b>SİSTEM RAPORU (API)</b>`,
      `🕐 ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`,
      ``,
      `<b>📋 Görev Durumu (${all.length} aktif):</b>`,
      `⏳ Beklemede: ${byStatus['beklemede'] ?? 0}`,
      `⚡ Devam: ${byStatus['devam_ediyor'] ?? 0}`,
      `✅ Tamamlanan: ${byStatus['tamamlandi'] ?? 0}`,
      `🚫 İptal: ${byStatus['iptal'] ?? 0}`,
      ``,
      `<b>🎯 Öncelik Dağılımı:</b>`,
      `🔴 Kritik: ${byPriority['kritik'] ?? 0}`,
      `🟠 Yüksek: ${byPriority['yuksek'] ?? 0}`,
      `🟡 Normal: ${byPriority['normal'] ?? 0}`,
      `🟢 Düşük: ${byPriority['dusuk'] ?? 0}`,
    ].join('\n'), { parse_mode: 'HTML' });
  } catch (err) {
    await ctx.reply('❌ Rapor alınırken hata oluştu.');
  }
});

// ── BEKLEYEN SESLİ GÖREVLER (In-memory) ─────────────────────
const _pendingVoiceTasks = new Map();

// ── SESLİ MESAJ → YAZIYA ÇEVİR → ONAY BEKLE ────────────────
bot.on('message:voice', async (ctx) => {
  if (!isAuthorized(ctx.chat?.id)) return;

  const senderName = ctx.from?.first_name
    ? `${ctx.from.first_name}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}`
    : 'Bilinmeyen';

  await ctx.reply('🎤 <b>Sesli mesaj alındı.</b> Yazıya çevriliyor...', { parse_mode: 'HTML' });

  try {
    if (!geminiModel) {
      await ctx.reply('⚠️ Gemini AI bağlı değil.');
      return;
    }

    const file = await ctx.getFile();
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    const response = await fetch(fileUrl);
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    const result = await geminiModel.generateContent([
      { inlineData: { mimeType: 'audio/ogg', data: audioBuffer.toString('base64') } },
      { text: 'Bu ses kaydını Türkçe olarak yazıya çevir. Sadece çevrilen metni döndür.' },
    ]);

    const transcript = result.response.text()?.trim();
    if (!transcript || transcript.length < 3) {
      await ctx.reply('⚠️ Ses anlaşılamadı.');
      return;
    }

    await ctx.reply([
      `🎤 <b>SES → YAZI:</b>`, ``,
      `<code>${transcript.substring(0, 300)}</code>`, ``,
      `Bu metin ile görev oluşturulsun mu?`,
      `✅ /onayla — Görevi oluştur`,
      `❌ /iptal_ses — Vazgeç`,
    ].join('\n'), { parse_mode: 'HTML' });

    _pendingVoiceTasks.set(String(ctx.chat.id), { transcript, senderName, timestamp: Date.now() });
    setTimeout(() => _pendingVoiceTasks.delete(String(ctx.chat.id)), 10 * 60 * 1000);

  } catch (err) {
    log(`SESLİ MESAJ HATA: ${err.message}`, 'ERROR');
    await ctx.reply(`❌ Sesli mesaj işlenemedi.`);
  }
});

// ── /onayla — Sesli mesaj onayı ─────────────────────────────
bot.command('onayla', async (ctx) => {
  if (!isAuthorized(ctx.chat?.id)) return;
  const chatId = String(ctx.chat.id);
  const pending = _pendingVoiceTasks.get(chatId);

  if (!pending) { await ctx.reply('⚠️ Bekleyen sesli görev yok.'); return; }
  _pendingVoiceTasks.delete(chatId);

  try {
    const result = await createTaskViaAPI(pending.transcript, pending.senderName, 'telegram_voice');
    if (result.success) {
      await ctx.reply(`✅ <b>GÖREV OLUŞTURULDU</b>\n\nKod: <code>${result.data?.task_code}</code>`, { parse_mode: 'HTML' });
    } else {
      await ctx.reply(`❌ Hata: ${result.error}`);
    }
  } catch (err) {
    await ctx.reply('❌ Görev oluşturulamadı.');
  }
});

bot.command('iptal_ses', (ctx) => {
  _pendingVoiceTasks.delete(String(ctx.chat.id));
  ctx.reply('🚫 İptal edildi.');
});

// ── YAZILI MESAJ → GÖREV OLUŞTUR ────────────────────────────
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return;
  if (!isAuthorized(ctx.chat?.id)) return;

  const senderName = ctx.from?.first_name || 'Bilinmeyen';
  await ctx.reply(`📥 <b>Görev alındı.</b> Pipeline'a gönderiliyor...`, { parse_mode: 'HTML' });

  try {
    const result = await createTaskViaAPI(text, senderName, 'telegram_text');
    if (result.success) {
      await ctx.reply(
        `🏛️ <b>1. DEPARTMAN (GÖREV KABUL) ONAYLANDI</b>\n\n` +
        `✅ <b>MİMAR:</b> Görevi Anladı ve 6-Katmanlı Planı Çizdi.\n` +
        `⚖️ <b>ZINDIK:</b> 100 Maddelik İnfaz Testinden Geçti! [PASS]\n\n` +
        `📋 <b>Hedef:</b> ${text.substring(0, 100).replace(/\n/g, ' ')}...\n` +
        `📌 <b>Aksiyon:</b> Onaylandı, Kurul Masasına Çıkarılıyor!`,
        { parse_mode: 'HTML' }
      );
      log(`1. DEPARTMAN ONAYI VERİLDİ: ${text.substring(0, 60)}`, 'INFO');
    } else {
      await ctx.reply(
        `❌ <b>1. DEPARTMAN İNFAZ ETTİ!</b> ❌\n\n` +
        `Mimarın çizdiği plan, Zındık'ın Anayasasından geçemedi!\n\n` +
        `<b>ZINDIK RAPORU:</b>\n` +
        `<pre>${result.error || 'Bilinmeyen Hata'}</pre>`,
        { parse_mode: 'HTML' }
      );
      log(`GÖREV İNFAZI: ${result.error}`, 'WARN');
    }
  } catch (err) {
    await ctx.reply(`❌ Lokal departman bağlantı hatası: ${err.message}`);
  }
});

// ── BAŞLAT ──────────────────────────────────────────────────
log('══════════════════════════════════════════════');
log('  STP TELEGRAM BOT — API Channel v3          ');
log('  Sıfır DB Erişimi — Tam API Pipeline         ');
log('══════════════════════════════════════════════');

bot.start({ onStart: () => log('✅ Telegram bot başlatıldı (API Mode).') });
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
