// ============================================================
// TELEGRAM BOT — Bağımsız Modül v1
// ============================================================
// PROJESİ: Sistem Takip Paneli (STP)
// DURUM:   BAĞIMSIZ MODÜL — Frontend_Panel'den ayrı çalışır.
//
// ÖZELLİKLER:
//   1. /start, /durum, /yardim — Temel bilgi komutları
//   2. /gorevler — Aktif görevleri listeler (Supabase)
//   3. /gorev TSK-xxx — Görev detayı
//   4. /tamamla TSK-xxx — Görevi tamamlar
//   5. /iptal TSK-xxx — Görevi iptal eder
//   6. /ara <kelime> — Görevlerde arama
//   7. /rapor — Sistem özet raporu
//   8. Yazılı mesaj → AI ile analiz → Görev oluşturma
//
// Çalıştır: npm start  (veya: node index.js)
// ============================================================

const { Bot } = require('grammy');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const http = require('http');
const fs   = require('fs');
const path = require('path');

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
const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN || '';
const AUTH_IDS     = (process.env.TELEGRAM_AUTHORIZED_CHAT_IDS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';
const OLLAMA_URL   = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3:latest';
const GEMINI_KEY   = process.env.GEMINI_API_KEY || '';
const LOG_FILE     = path.join(__dirname, 'bot.log');

// ── GEMINI AI CLIENT ────────────────────────────────────────
let geminiModel = null;
if (GEMINI_KEY) {
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  log('✅ Gemini AI bağlandı (gemini-2.5-flash).', 'INFO');
}

// ── SUPABASE CLIENT ─────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── LOG ─────────────────────────────────────────────────────
function log(msg, level = 'INFO') {
  const ts   = new Date().toISOString();
  const line = `[${ts}] [${level}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8');
}

// ── YETKİ KONTROL ───────────────────────────────────────────
function isAuthorized(chatId) {
  if (AUTH_IDS.length === 0) return true;
  return AUTH_IDS.includes(String(chatId));
}

// ── GÖREV KODU ÜRET ─────────────────────────────────────────
function generateTaskCode() {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TSK-${date}-${rand}`;
}

// ── OLLAMA AI ÇAĞRISI ───────────────────────────────────────
function ollamaChat(system, user) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user },
      ],
      stream: false,
      options: { temperature: 0.3, num_predict: 400 },
    });
    const req = http.request(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000,
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).message?.content || 'Yanıt alınamadı.'); }
        catch { reject(new Error('parse hatası')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body); req.end();
  });
}

// ── GEMINI AI ÇAĞRISI ───────────────────────────────────────
async function geminiChat(system, user) {
  if (!geminiModel) throw new Error('Gemini API key tanımlı değil');
  const prompt = `${system}\n\nKullanıcı mesajı: ${user}`;
  const result = await geminiModel.generateContent(prompt);
  return result.response.text();
}

// ── AI ÇAĞRISI (Gemini öncelikli, Ollama yedek) ─────────────
async function aiChat(system, user) {
  if (geminiModel) {
    try { return { text: await geminiChat(system, user), source: 'gemini' }; }
    catch (e) { log(`Gemini hata: ${e.message}, Ollama'ya geçiliyor...`, 'WARN'); }
  }
  try { return { text: await ollamaChat(system, user), source: 'ollama' }; }
  catch (e) { throw new Error(`AI yanıt alınamadı: ${e.message}`); }
}

// ── ÖNCELİK ANALİZİ (Lokal Kural Motoru) ───────────────────
function analyzeLocalPriority(text) {
  const lower = text.toLowerCase();
  const kritikKeys = ['acil', 'kritik', 'güvenlik', 'çöktü', 'hata', 'bug', 'crash', 'down'];
  const yuksekKeys = ['önemli', 'hızlı', 'öncelikli', 'deploy', 'production'];
  const dusukKeys  = ['düşük', 'ileride', 'not', 'fikir', 'belki'];

  if (kritikKeys.some(k => lower.includes(k)))   return { priority: 'kritik',  confidence: 0.9, reasoning: 'Kritik anahtar kelime tespit edildi' };
  if (yuksekKeys.some(k => lower.includes(k)))    return { priority: 'yuksek',  confidence: 0.8, reasoning: 'Yüksek öncelik anahtar kelimesi tespit edildi' };
  if (dusukKeys.some(k => lower.includes(k)))     return { priority: 'dusuk',   confidence: 0.7, reasoning: 'Düşük öncelik anahtar kelimesi tespit edildi' };
  return { priority: 'normal', confidence: 0.6, reasoning: 'Varsayılan öncelik atandı' };
}

// ── EMOJI YARDIMCILARI ──────────────────────────────────────
const PE = { kritik: '🔴', yuksek: '🟠', normal: '🟡', dusuk: '🟢' };
const SE = { beklemede: '⏳', devam_ediyor: '⚡', dogrulama: '🔍', tamamlandi: '✅', reddedildi: '❌', iptal: '🚫' };

// ══════════════════════════════════════════════════════════════
// BOT BAŞLAT
// ══════════════════════════════════════════════════════════════
if (!BOT_TOKEN || BOT_TOKEN.includes('your-')) {
  console.error('❌ TELEGRAM_BOT_TOKEN tanımlı değil! .env dosyasını kontrol et.');
  process.exit(1);
}

const bot = new Bot(BOT_TOKEN);

// ── /start ──────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  const chatId = ctx.chat?.id ?? 0;
  await ctx.reply([
    `🏗️ <b>STP TELEGRAM BOT</b> (Bağımsız Modül)`,
    ``,
    `Merhaba! Ben Sistem Takip Paneli'nin Telegram botu.`,
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
  let dbStatus = '🔴 BAĞLANTI YOK';
  try {
    const { error } = await supabase.from('tasks').select('id').limit(1);
    dbStatus = error ? `🔴 HATA: ${error.message}` : '🟢 OPERASYONEL';
  } catch { /* default */ }

  const geminiStatus = geminiModel ? '🟢 AKTİF (Gemini 2.0 Flash)' : '🔴 API KEY YOK';

  let ollamaStatus = '🔴 ÇEVRİMDIŞI';
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    ollamaStatus = res.ok ? '🟢 AKTİF (Yedek)' : '🔴 ÇEVRİMDIŞI';
  } catch { /* default */ }

  await ctx.reply([
    `📊 <b>SİSTEM DURUMU</b>`,
    ``,
    `🗄️ <b>Veritabanı:</b> ${dbStatus}`,
    `🧠 <b>Gemini AI:</b> ${geminiStatus}`,
    `🤖 <b>Ollama:</b> ${ollamaStatus}`,
    `📡 <b>Telegram Bot:</b> 🟢 AKTİF (POLLING)`,
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
    `<b>🧠 AI:</b>`,
    `/sor <soru> — Gemini AI'a soru sor`,
    ``,
    `<b>ℹ️ DİĞER:</b>`,
    `/start — Başlangıç`,
    `/durum — Sistem durumu`,
    `/yardim — Bu liste`,
  ].join('\n'), { parse_mode: 'HTML' });
});

// ── /sor <soru> — Gemini AI ile soru-cevap ──────────────────
bot.command('sor', async (ctx) => {
  if (!isAuthorized(ctx.chat?.id)) { await ctx.reply('⛔ YETKİSİZ ERİŞİM.'); return; }
  const soru = ctx.match?.trim();
  if (!soru) { await ctx.reply('⚠️ Kullanım: /sor <sorunuz>'); return; }

  await ctx.reply('🧠 Düşünüyorum...');

  try {
    const system = 'Sen Sistem Takip Paneli\'nin AI asistanısın. Türkçe, kısa ve net yanıt ver. Maksimum 300 kelime.';
    const { text, source } = await aiChat(system, soru);
    const motorIcon = source === 'gemini' ? '🧠 Gemini' : '🤖 Ollama';
    await ctx.reply([
      `💬 <b>AI YANIT</b> (${motorIcon})`,
      ``,
      text.substring(0, 3500),
    ].join('\n'), { parse_mode: 'HTML' }).catch(() => {
      // HTML parse hatası durumunda düz metin gönder
      ctx.reply(`💬 AI YANIT (${motorIcon})\n\n${text.substring(0, 3500)}`);
    });
    log(`AI SORU: ${soru.substring(0, 50)} → ${source}`, 'INFO');
  } catch (err) {
    log(`AI HATA: ${err.message}`, 'ERROR');
    await ctx.reply(`❌ AI yanıt alınamadı: ${err.message}`);
  }
});

// ── /gorevler ───────────────────────────────────────────────
bot.command('gorevler', async (ctx) => {
  if (!isAuthorized(ctx.chat?.id)) { await ctx.reply('⛔ YETKİSİZ ERİŞİM.'); return; }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('task_code, title, status, priority, assigned_to')
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(15);

    if (error) { await ctx.reply(`❌ Hata: ${error.message}`); return; }
    if (!data || data.length === 0) { await ctx.reply('📭 Aktif görev bulunamadı.'); return; }

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
    const { data, error } = await supabase.from('tasks').select('*').eq('task_code', taskCode.toUpperCase()).single();
    if (error || !data) { await ctx.reply(`❌ Görev bulunamadı: <code>${taskCode}</code>`, { parse_mode: 'HTML' }); return; }

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
    const { data, error } = await supabase.from('tasks')
      .update({ status: 'tamamlandi', updated_at: new Date().toISOString() })
      .eq('task_code', taskCode.toUpperCase()).select();
    if (error || !data?.length) { await ctx.reply(`❌ Görev bulunamadı: <code>${taskCode}</code>`, { parse_mode: 'HTML' }); return; }

    log(`GÖREV TAMAMLANDI: ${taskCode}`, 'INFO');
    await ctx.reply(`✅ <b>GÖREV TAMAMLANDI</b>\n\nKod: <code>${taskCode}</code>\nBaşlık: ${data[0]?.title ?? ''}`, { parse_mode: 'HTML' });
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
    const { data, error } = await supabase.from('tasks')
      .update({ status: 'iptal', updated_at: new Date().toISOString() })
      .eq('task_code', taskCode.toUpperCase()).select();
    if (error || !data?.length) { await ctx.reply(`❌ Görev bulunamadı: <code>${taskCode}</code>`, { parse_mode: 'HTML' }); return; }

    log(`GÖREV İPTAL: ${taskCode}`, 'INFO');
    await ctx.reply(`🚫 <b>GÖREV İPTAL EDİLDİ</b>\n\nKod: <code>${taskCode}</code>\nBaşlık: ${data[0]?.title ?? ''}`, { parse_mode: 'HTML' });
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
    const { data: tasks } = await supabase.from('tasks')
      .select('task_code, title, status, priority')
      .or(`title.ilike.%${query}%,task_code.ilike.%${query}%`)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!tasks?.length) { await ctx.reply(`🔍 <b>"${query}"</b> için sonuç bulunamadı.`, { parse_mode: 'HTML' }); return; }

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
    const { data: tasks } = await supabase.from('tasks').select('status, priority').eq('is_archived', false);
    const all = tasks ?? [];
    const byStatus = {}, byPriority = {};
    all.forEach(t => {
      byStatus[t.status]     = (byStatus[t.status] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    });

    await ctx.reply([
      `📊 <b>SİSTEM RAPORU</b>`,
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

// ── YAZILI MESAJ → GÖREV OLUŞTUR ────────────────────────────
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith('/')) return; // komutları atla
  if (!isAuthorized(ctx.chat?.id)) return;

  const senderName = ctx.from?.first_name
    ? `${ctx.from.first_name}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}`
    : 'Bilinmeyen';

  // Öncelik analizi
  const analysis = analyzeLocalPriority(text);

  await ctx.reply(`📥 <b>Görev alındı.</b> Analiz ediliyor...`, { parse_mode: 'HTML' });

  // Görev oluştur
  const taskCode = generateTaskCode();
  try {
    const { error } = await supabase.from('tasks').insert([{
      title: text.trim().substring(0, 200),
      task_code: taskCode,
      status: 'beklemede',
      priority: analysis.priority,
      assigned_to: senderName,
      assigned_by: 'TELEGRAM-BOT-STANDALONE',
      evidence_required: true,
      evidence_provided: false,
      retry_count: 0,
      is_archived: false,
      metadata: {
        kaynak: 'telegram_standalone',
        chat_id: ctx.chat.id,
        gonderen: senderName,
        ai_analiz: analysis,
      },
    }]);

    if (error) {
      log(`GÖREV OLUŞTURMA HATA: ${error.message}`, 'ERROR');
      await ctx.reply(`❌ Hata: ${error.message}`);
      return;
    }

    log(`GÖREV OLUŞTURULDU: ${taskCode} — ${text.substring(0, 60)}`, 'INFO');
    await ctx.reply([
      `✅ <b>GÖREV OLUŞTURULDU</b>`,
      ``,
      `📋 <b>Kod:</b> <code>${taskCode}</code>`,
      `📝 <b>Başlık:</b> ${text.substring(0, 100)}`,
      `${PE[analysis.priority]} <b>Öncelik:</b> ${analysis.priority.toUpperCase()}`,
      `📊 <b>Güven:</b> %${Math.round(analysis.confidence * 100)}`,
      `💬 <b>Gerekçe:</b> ${analysis.reasoning}`,
      ``,
      `👤 <b>Atanan:</b> ${senderName}`,
      `📌 <b>Durum:</b> Beklemede`,
    ].join('\n'), { parse_mode: 'HTML' });
  } catch (err) {
    log(`GÖREV OLUŞTURMA HATA: ${err.message}`, 'ERROR');
    await ctx.reply('❌ Görev oluşturulurken hata oluştu.');
  }
});

// ── BAŞLAT ──────────────────────────────────────────────────
log('══════════════════════════════════════════════');
log('  STP TELEGRAM BOT — Bağımsız Modül v2       ');
log('  Supabase + Gemini AI + Görev Yönetimi       ');
log('══════════════════════════════════════════════');

bot.start({
  onStart: () => log('✅ Telegram bot başlatıldı (POLLING modu).'),
});

// Graceful shutdown
process.once('SIGINT', () => { bot.stop(); log('Bot durduruldu (SIGINT).'); });
process.once('SIGTERM', () => { bot.stop(); log('Bot durduruldu (SIGTERM).'); });
