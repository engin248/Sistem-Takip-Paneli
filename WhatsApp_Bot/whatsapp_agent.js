// ============================================================
// whatsapp_agent.js — WhatsApp ↔ Ajan Köprüsü v2
// ============================================================
// PROJESİ: Sistem Takip Paneli (STP)
// DURUM:   BAĞIMSIZ MODÜL — STP pipeline'ına entegre DEĞİLDİR.
//
// ⚠️ İZOLASYON UYARISI:
//   Bu script STP web uygulamasından (Next.js) BAĞIMSIZ çalışır.
//   Kendi Ollama bağlantısını kullanır, STP veritabanına YAZMAZ.
//   Telegram Bot (@Sistem_takip_bot) ile karıştırılmamalıdır.
//   Pipeline entegrasyonu yapılana kadar bağımsız kalacaktır.
//
// Çalıştır: node whatsapp_agent.js
// QR kod tara (1 kez) — session kaydedilir.
//
// ÖZELLİKLER:
//   1. @AJAN: komut → AI yanıtı (Ollama)
//   2. Fotoğraf gelince → lokal diske arşivle
//   3. Tüm mesajlar → lokal dosyaya log kaydı
//
// KULLANIM:
//   @K0: sistem durumunu raporla
//   @ARES: veritabanını kontrol et
//   (resim gönder) → otomatik arşivlenir
// ============================================================

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');

// ── YAPILANDIRMA ─────────────────────────────────────────────
const OLLAMA_URL    = 'http://localhost:11434';
const OLLAMA_MODEL  = 'llama3:latest';
const BASE_DIR      = 'C:\\Users\\Esisya\\Desktop\\WHATSAPP_ARSIV';
const FOTO_DIR      = path.join(BASE_DIR, 'fotograflar');
const MESAJ_LOG     = path.join(BASE_DIR, 'mesajlar.log');
const SCRIPT_LOG    = path.join(BASE_DIR, 'sistem.log');

// Yalnızca bu numaralardan komut kabul et (boş = hepsi)
// Format: '905XXXXXXXXX@c.us'
const AUTHORIZED_NUMBERS = [];

// ── KLASÖRLER ────────────────────────────────────────────────
[BASE_DIR, FOTO_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── LOG ──────────────────────────────────────────────────────
function log(msg, level = 'INFO') {
  const ts   = new Date().toISOString();
  const line = `[${ts}] [${level}] ${msg}`;
  console.log(line);
  fs.appendFileSync(SCRIPT_LOG, line + '\n', 'utf-8');
}

function logMesaj(from, type, content) {
  const ts   = new Date().toISOString();
  const line = `${ts} | ${from} | ${type} | ${content.slice(0, 200)}\n`;
  fs.appendFileSync(MESAJ_LOG, line, 'utf-8');
}

// ── AJAN KADROSU ─────────────────────────────────────────────
const AJANLAR = {
  'K0':     { isim: 'K0-KOMUTAN',    katman: 'KOMUTA', rol: 'Baş Komutan. Stratejik kararlar, sistem bütünlüğü.' },
  'K1':     { isim: 'K1-STRATEJIST', katman: 'KOMUTA', rol: 'Stratejik planlama ve koordinasyon.' },
  'K2':     { isim: 'K2-ANALIST',    katman: 'KOMUTA', rol: 'Sistem analizi ve risk değerlendirmesi.' },
  'K3':     { isim: 'K3-MIMAR',      katman: 'KOMUTA', rol: 'Teknik mimari ve tasarım kararları.' },
  'ARES':   { isim: 'ARES',          katman: 'L1', rol: 'Veritabanı operasyonları ve veri yönetimi.' },
  'HERMES': { isim: 'HERMES',        katman: 'L1', rol: 'API ve sistem entegrasyonları.' },
  'APOLLO': { isim: 'APOLLO',        katman: 'L1', rol: 'Frontend ve arayüz geliştirme.' },
  'ZEUS':   { isim: 'ZEUS',          katman: 'L1', rol: 'Güvenlik ve kimlik doğrulama.' },
  'ATHENA': { isim: 'ATHENA',        katman: 'L2', rol: 'Kod kalitesi ve denetim.' },
  'ORION':  { isim: 'ORION',         katman: 'L2', rol: 'Test ve doğrulama.' },
  'HERA':   { isim: 'HERA',          katman: 'L2', rol: 'Kalite kontrol ve süreç denetimi.' },
  'TITAN':  { isim: 'TITAN',         katman: 'L3', rol: 'Hakem. Objektif karar ve değerlendirme.' },
};

// ── SİSTEM PROMPT ─────────────────────────────────────────────
function buildPrompt(ajanId) {
  const a = AJANLAR[ajanId] || AJANLAR['K0'];
  return `Sen ${a.isim} ajanısın (${a.katman} katmanı).
ROL: ${a.rol}

KURALLAR:
1. Kısa, net, Türkçe yanıt ver (max 400 kelime).
2. Yanıt: "✅ ${a.isim}:" ile başla.
3. Varsayım yapma — sadece verilen bilgiyle çalış.
4. WhatsApp formatı: *kalın*, _italik_ kullanabilirsin.`;
}

// ── OLLAMA ───────────────────────────────────────────────────
function ollamaChat(system, user) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model   : OLLAMA_MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      stream  : false,
      options : { temperature: 0.3, num_predict: 800 },
    });
    const req = http.request(`${OLLAMA_URL}/api/chat`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 60000,
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

// ── MESAJ PARSERİ ─────────────────────────────────────────────
function parseMessage(text) {
  const match = text.match(/^@([A-Za-z0-9]+):\s*(.+)/s);
  if (match) {
    const ajanId = match[1].toUpperCase();
    return { ajanId: AJANLAR[ajanId] ? ajanId : 'K0', gorev: match[2].trim(), isKomut: true };
  }
  return { ajanId: 'K0', gorev: text.trim(), isKomut: false };
}

// ── FOTOĞRAF ARŞİVLEYİCİ ─────────────────────────────────────
async function fotografArsivle(msg) {
  try {
    const media = await msg.downloadMedia();
    if (!media || !media.data) return null;

    const ext     = media.mimetype?.split('/')[1]?.split(';')[0] || 'jpg';
    const ts      = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const from    = msg.from.replace('@c.us', '').replace('@g.us', '_grup');
    const fname   = `${ts}_${from}.${ext}`;
    const fpath   = path.join(FOTO_DIR, fname);

    fs.writeFileSync(fpath, Buffer.from(media.data, 'base64'));
    log(`📸 Fotoğraf arşivlendi: ${fname}`, 'INFO');
    return fname;
  } catch (e) {
    log(`Fotoğraf arşiv hatası: ${e.message}`, 'ERROR');
    return null;
  }
}

// ── WHATSAPP CLIENT ───────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'stp-agent', dataPath: BASE_DIR }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'],
  },
});

client.on('qr', qr => {
  log('QR KOD — WhatsApp → Bağlı Cihazlar → Cihaz Bağla → Tara', 'INFO');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => log('✅ Kimlik doğrulandı.', 'INFO'));

client.on('ready', async () => {
  log('✅ WhatsApp hazır! Mesaj bekleniyor...', 'INFO');
  log(`📁 Fotoğraf arşivi: ${FOTO_DIR}`, 'INFO');
  log(`📋 Mesaj logu: ${MESAJ_LOG}`, 'INFO');
});

client.on('disconnected', r => log(`⚠ Bağlantı kesildi: ${r}`, 'WARN'));

// ── GELEN MESAJ ───────────────────────────────────────────────
client.on('message', async msg => {
  try {
    const from  = msg.from;
    const type  = msg.type;

    // Yetki kontrol
    if (AUTHORIZED_NUMBERS.length > 0 && !AUTHORIZED_NUMBERS.includes(from)) return;

    // 1. FOTOĞRAF / VİDEO — arşivle
    if (['image', 'video', 'document'].includes(type)) {
      logMesaj(from, type.toUpperCase(), msg.body || '(medya)');
      const fname = await fotografArsivle(msg);
      if (fname) {
        await msg.reply(`✅ *Arşivlendi*\n📁 \`${fname}\`\n_Fotoğraf: ${FOTO_DIR}_`);
      }
      return;
    }

    // 2. METİN MESAJ — logla
    const metin = msg.body?.trim();
    if (!metin) return;
    logMesaj(from, 'MESAJ', metin);
    log(`📨 [${from}]: ${metin.slice(0, 80)}`, 'INFO');

    // 3. @AJAN KOMUTU ise işle
    const { ajanId, gorev, isKomut } = parseMessage(metin);
    if (!isKomut) return; // Komut değilse yanıtlama (sadece logla)

    const ajan = AJANLAR[ajanId];
    log(`→ Ajan: ${ajanId}, Görev: ${gorev.slice(0, 60)}`, 'INFO');

    await msg.reply(`⏳ *${ajan.isim}* işliyor...\n_Model: ${OLLAMA_MODEL}_`);

    const yanit = await ollamaChat(buildPrompt(ajanId), gorev);
    await msg.reply(yanit);
    log(`✓ Yanıt [${ajanId}]: ${yanit.slice(0, 60)}`, 'INFO');

  } catch (err) {
    log(`HATA: ${err.message}`, 'ERROR');
    try { await msg.reply(`❌ Hata: ${err.message}`); } catch {}
  }
});

// ── BAŞLAT ───────────────────────────────────────────────────
log('══════════════════════════════════════════════');
log('  WHATSAPP AJAN KÖPRÜSÜ v2                    ');
log('  Fotoğraf arşivi + Mesaj logu + AI yanıtı    ');
log('══════════════════════════════════════════════');

client.initialize();
