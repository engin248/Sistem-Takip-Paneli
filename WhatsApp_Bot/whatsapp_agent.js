// ============================================================
// whatsapp_agent.js — WhatsApp ↔ STP Köprüsü v4
// ============================================================
// Sorumluluk: Bağlantı kurma, QR yönetimi, mesaj dağıtımı.
// Komutlar   → wa_komut_yonetici.js
// Onay Kanalı → wa_onay_kanali.js (komut yöneticisi üzerinden)
// ============================================================

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal         = require('qrcode-terminal');
const QRCode                 = require('qrcode');
const fs                     = require('fs');
const path                   = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient }       = require('@supabase/supabase-js');
const { kuralKontrol, ihlalLog } = require('../shared/sistemKurallari');
const AI                     = require('../shared/aiOrchestrator');
const { komutYonet, hasTrigger } = require('./wa_komut_yonetici');
const { komutuSistemeKabulEt }   = require('../Gorev_Kabul_Departmani/komut_alim');

// ── .env YÜKLE ──────────────────────────────────────────────
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const idx = t.indexOf('=');
        if (idx === -1) continue;
        const key = t.slice(0, idx).trim();
        const val = t.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
    }
}
loadEnv();

// ── YAPILANDIRMA ─────────────────────────────────────────────
const GEMINI_KEY        = process.env.GEMINI_API_KEY || '';
const STP_API_BASE      = process.env.STP_API_URL || 'https://sistem-takip-paneli.vercel.app';
const STP_SERVICE_TOKEN = process.env.STP_API_KEY || process.env.STP_SERVICE_TOKEN || '';
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const FOTO_DIR          = path.join(__dirname, 'arsiv', 'fotograflar');
const LOG_FILE          = path.join(__dirname, 'whatsapp_agent.log');
const STATUS_FILE       = path.join(__dirname, 'whatsapp_status.json');
const QR_PUBLIC_PATH    = path.join(__dirname, '../Frontend_Panel/public/whatsapp_qr.png');

// ── LOG ──────────────────────────────────────────────────────
function log(msg, level = 'INFO') {
    const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
    console.log(line);
    try { fs.appendFileSync(LOG_FILE, line + '\n', 'utf-8'); } catch {}
}

// ── SUPABASE / KLASÖRLER ─────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
[path.join(__dirname, 'arsiv'), FOTO_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── YETKİLİ NUMARALAR ────────────────────────────────────────
const AUTHORIZED_NUMBERS = (process.env.WHATSAPP_AUTHORIZED_NUMBERS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
if (!AUTHORIZED_NUMBERS.length) {
    log('⚠️ [GÜVENLİK] WHATSAPP_AUTHORIZED_NUMBERS boş — tüm numaralardan komut alınıyor.', 'WARN');
} else {
    log(`✅ Yetkili numara: ${AUTHORIZED_NUMBERS.length}`, 'INFO');
}

// ── YARDIMCI FONKSİYONLAR ────────────────────────────────────
function isAuthorized(msg, client) {
    if (msg.from === 'status@broadcast' || msg.to === 'status@broadcast' || msg.isStatus) return false;
    const myNum = client.info?.wid?._serialized;
    // DÜZELTİLDİ (2026-04-29): Dışa giden mesajları yoksay.
    // Birine mesaj attığında bot devreye girmesin.
    // İstisna: Kendi numarana kendi kendine attığın mesajlar (komut kanalı) geçerlidir.
    if (msg.fromMe && myNum && msg.to !== myNum) return false;
    if (myNum && msg.from === myNum && (msg.to === myNum || msg.to.endsWith('@lid'))) return true;
    if (AUTHORIZED_NUMBERS.length && AUTHORIZED_NUMBERS.includes(msg.from)) return true;
    return false;
}

function updateStatus(status, details = {}) {
    try { fs.writeFileSync(STATUS_FILE, JSON.stringify({ last_update: new Date().toISOString(), status, details, platform: 'WHATSAPP' }, null, 2)); } catch {}
}

async function logToHub(msg) {
    try {
        await supabase.from('hub_messages').insert({
            message_id: msg.id.id,
            source: msg.from, target: msg.to,
            text: msg.body || '[Medya]',
            timestamp: new Date(msg.timestamp * 1000).toISOString()
        });
    } catch {}
}

async function getSystemHealth() {
    try { return await (await fetch(`${STP_API_BASE}/api/health-check`)).json(); }
    catch (e) { return { status: 'error', error: e.message }; }
}

async function getActiveTasks() {
    try {
        const headers = STP_SERVICE_TOKEN ? { Authorization: `Bearer ${STP_SERVICE_TOKEN}` } : {};
        return await (await fetch(`${STP_API_BASE}/api/tasks`, { headers })).json();
    } catch (e) { return { success: false, error: e.message }; }
}

async function createTaskViaAPI(title, senderName, source = 'whatsapp_text') {
    try {
        const tamBilet = `[KAYNAK: ${source} - KULLANICI: ${senderName}] ${title}`;
        const sonuc    = await komutuSistemeKabulEt(tamBilet);
        if (sonuc.durum === 'PASS') {
            const taskCode = `WA-${Date.now()}`;
            const { error } = await supabase.from('tasks').insert({
                task_code: taskCode, title: tamBilet, status: 'beklemede',
                priority: 'normal', is_archived: false,
                metadata: { kaynak: source, kullanici: senderName, mimar_plan: sonuc.mimar_plan, denetim_raporu: sonuc.denetim_raporu, onay_zamani: new Date().toISOString() },
                created_at: new Date().toISOString(),
            });
            if (error) log(`Supabase task yazma uyarısı: ${error.message}`, 'WARN');

            // DÜZELTİLDİ (2026-04-25): Planlama Motoru'na (port 3099) doğrudan POST
            // Eski kodda bu köprü yoktu — görev motora hiç ulaşmıyordu.
            try {
                const motorRes = await fetch('http://localhost:3099/gorev-al', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: tamBilet,
                        task_code: taskCode,
                        source: 'whatsapp',
                        agent_id: senderName,
                    }),
                });
                const motorData = await motorRes.json();
                log(`[WA→MOTOR] ${motorRes.status} | ${motorData.durum || 'OK'}`, 'INFO');
            } catch (motorErr) {
                log(`[WA→MOTOR] Planlama motoru erişilemedi: ${motorErr.message}`, 'WARN');
                // Motor kapalı olabilir — Supabase'e yazıldı, motor açılınca alır.
            }

            return { success: true, data: { task_code: taskCode } };
        }
        return { success: false, error: sonuc.denetim_raporu };
    } catch (e) { return { success: false, error: e.message }; }
}

async function fotografArsivle(msg) {
    try {
        const media = await msg.downloadMedia();
        if (!media?.data) return null;
        const ext   = media.mimetype?.split('/')[1]?.split(';')[0] || 'jpg';
        const ts    = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const from  = msg.from.replace('@c.us', '').replace('@g.us', '_grup');
        const fname = `${ts}_${from}.${ext}`;
        fs.writeFileSync(path.join(FOTO_DIR, fname), Buffer.from(media.data, 'base64'));
        log(`📸 Fotoğraf: ${fname}`, 'INFO');
        return fname;
    } catch (e) { log(`Fotoğraf hata: ${e.message}`, 'ERROR'); return null; }
}

async function transcribeVoice(msg) {
    const media = await msg.downloadMedia();
    if (!media?.data) throw new Error('Ses dosyası indirilemedi');
    const response = await AI.chat('Bu ses kaydını Türkçe olarak yazıya çevir. Sadece metni döndür.', 'Sen bir STT asistanısın.', {
        inlineData: { mimeType: media.mimetype || 'audio/ogg', data: media.data }
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
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] },
});

client.on('qr', async (qr) => {
    log('QR KOD — WhatsApp → Bağlı Cihazlar → Cihaz Bağla → Tara', 'INFO');
    qrcodeTerminal.generate(qr, { small: true });
    try {
        const qrPath = path.join(__dirname, 'whatsapp_qr.png');
        await QRCode.toFile(qrPath, qr, { width: 512, margin: 2 });
        try { fs.copyFileSync(qrPath, QR_PUBLIC_PATH); } catch {}
        updateStatus('DISCONNECTED', { qr_available: true });
        require('child_process').exec(`start "" "${qrPath}"`);
        log('📱 QR açıldı — tara!', 'INFO');
    } catch (e) { log(`QR hata: ${e.message}`, 'WARN'); }
});

client.on('authenticated', () => { log('✅ Kimlik doğrulandı.', 'INFO'); updateStatus('AUTHENTICATED'); });
client.on('ready',         () => {
    log('✅ WhatsApp hazır!', 'INFO');
    updateStatus('CONNECTED', { message: 'Canlı' });
    try { fs.unlinkSync(QR_PUBLIC_PATH); } catch {}
});
client.on('disconnected',  r => { log(`⚠ Bağlantı kesildi: ${r}`, 'WARN'); updateStatus('DISCONNECTED'); });

// ── MESAJ HANDLER ─────────────────────────────────────────────
client.on('message_create', async msg => {
    try {
        if (!isAuthorized(msg, client)) return;
        await logToHub(msg);

        const from       = msg.from;
        const senderName = msg._data?.notifyName || from.replace('@c.us', '');
        const type       = msg.type;

        // FOTOĞRAF / VİDEO
        if (['image', 'video', 'document'].includes(type)) {
            const fname = await fotografArsivle(msg);
            if (fname) await msg.reply(`✅ *Arşivlendi*\n📁 \`${fname}\``);
            return;
        }

        // SESLİ MESAJ
        if (type === 'ptt' || type === 'audio') {
            try {
                const transcript = await transcribeVoice(msg);
                if (!hasTrigger(transcript)) { log(`SES YOKSAYILDI: "${transcript.slice(0, 50)}"`, 'INFO'); return; }
                const kontrol = kuralKontrol('WHATSAPP_SESLI_GOREV', transcript);
                if (!kontrol.gecti) {
                    await msg.reply(`🚫 *Görev reddedildi*\n${kontrol.ihlaller.map(i => `• [${i.kural_no}] ${i.aciklama}`).join('\n')}`);
                    return;
                }
                _pendingVoice.set(from, { transcript, senderName, timestamp: Date.now() });
                setTimeout(() => _pendingVoice.delete(from), 10 * 60 * 1000);
                await msg.reply(`🎤 *SES → YAZI:*\n\n\`\`\`${transcript.substring(0, 300)}\`\`\`\n\nGörev oluşturulsun mu?\n✅ */onayla* — Oluştur\n❌ */iptal* — Vazgeç`);
            } catch (e) {
                log(`SESLİ HATA: ${e.message}`, 'ERROR');
                await msg.reply(`❌ Sesli mesaj işlenemedi: ${e.message}`);
            }
            return;
        }

        // YAZILI MESAJ → komut yöneticisine gönder
        const metin = msg.body?.trim();
        if (!metin) return;
        log(`📨 [${senderName}]: ${metin.slice(0, 80)}`, 'INFO');

        await komutYonet({ msg, metin, from, senderName, supabase, log, getActiveTasks, getSystemHealth, createTaskViaAPI, pendingVoice: _pendingVoice, STP_API_BASE });

    } catch (err) {
        log(`HATA: ${err.message}`, 'ERROR');
        try { await msg.reply(`❌ Hata: ${err.message}`); } catch {}
    }
});

// ── BAŞLAT ────────────────────────────────────────────────────
log('══════════════════════════════════════════════');
log('  WHATSAPP ↔ STP KÖPRÜSÜ v4                  ');
log('══════════════════════════════════════════════');
client.initialize();
