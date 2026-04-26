/**
 * haberlesme_koprusu.js — 3 Kanallı Haberleşme Güvenlik Köprüsü
 * ================================================================
 * GÜVENLİK TOPOLOJİSİ (1 DIŞ HAT, 2 İÇ HAT):
 * Saldırı vektörünü daraltmak ve giriş noktasını tekilleştirmek için:
 *   - DIŞ HAT (EXTERNAL) : WhatsApp (Tüm dış komutlar, public temas noktası)
 *   - İÇ HAT 1 (INTERNAL): Telegram (Sadece kapalı sistem, sistem uyarıları)
 *   - İÇ HAT 2 (INTERNAL): Email    (Loglar, audit, kritik alarmlar)
 *
 * Bu topoloji sayesinde sisteme yönelik herhangi bir "istek" saldırısı
 * yalnızca DIŞ HAT (WhatsApp) üzerinden gelebilir ve anında tespit edilir.
 *
 * MODÜL HATA KODLARI (HBK-xxx):
 *   HBK-001 : Dış Hat (WhatsApp) hatası
 *   HBK-002 : İç Hat 1 (Telegram) hatası
 *   HBK-003 : İç Hat 2 (Email) hatası
 *   HBK-004 : Tüm kanallar çöktü — KRİTİK
 *   HBK-005 : Mesaj formatı hatalı
 *   HBK-006 : Kanal konfigürasyonu eksik
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const KANAL_ROLLERI = {
    whatsapp: 'DIS_HAT',
    telegram: 'IC_HAT_1',
    email:    'IC_HAT_2'
};

// ── .env YÜKLE ────────────────────────────────────────────────
function loadEnv() {
    const envYollari = [
        path.join(__dirname, '../.env'),
        path.join(__dirname, '../WhatsApp_Bot/.env'),
        path.join(__dirname, '../Telegram_Bot/.env'),
    ];
    for (const p of envYollari) {
        if (!fs.existsSync(p)) continue;
        for (const satir of fs.readFileSync(p, 'utf8').split('\n')) {
            const s = satir.trim();
            if (!s || s.startsWith('#')) continue;
            const idx = s.indexOf('=');
            if (idx === -1) continue;
            const k = s.slice(0, idx).trim();
            const v = s.slice(idx + 1).trim();
            if (!process.env[k]) process.env[k] = v;
        }
    }
}
loadEnv();

// ── LOG ────────────────────────────────────────────────────────
const LOG_DOSYASI = path.join(__dirname, '../Logs/haberlesme_koprusu.log');
function log(mesaj, seviye = 'INFO') {
    const satir = `[${new Date().toISOString()}] [${seviye}] [HBK] ${mesaj}`;
    console.log(satir);
    try {
        const dir = path.dirname(LOG_DOSYASI);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.appendFileSync(LOG_DOSYASI, satir + '\n', 'utf8');
    } catch {}
}

// ══════════════════════════════════════════════════════════════
// KANAL 1: WHATSAPP (DIŞ HAT)
// ══════════════════════════════════════════════════════════════
async function whatsappGonder(mesaj, hedef) {
    const { wa_gonder } = (() => {
        try { return require('../WhatsApp_Bot/wa_onay_kanali'); }
        catch { return {}; }
    })();

    if (typeof wa_gonder !== 'function') {
        throw new Error('[HBK-001] wa_onay_kanali.wa_gonder bulunamadı');
    }

    const numara = hedef || process.env.WHATSAPP_HEDEF_NUMARA || process.env.OWNER_WHATSAPP;
    if (!numara) throw new Error('[HBK-006] WHATSAPP_HEDEF_NUMARA eksik');

    await wa_gonder(numara, mesaj);
    log(`[DIŞ_HAT] WhatsApp gönderildi → ${numara}`);
    return { kanal: 'whatsapp', rol: 'DIS_HAT', basarili: true, hedef: numara };
}

// ══════════════════════════════════════════════════════════════
// KANAL 2: TELEGRAM (İÇ HAT 1 - KAPALI DEVRE)
// ══════════════════════════════════════════════════════════════
async function telegramGonder(mesaj, hedef) {
    const token  = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = hedef || process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_OWNER_CHAT_ID;

    if (!token || !chatId) throw new Error('[HBK-006] Telegram config eksik');

    const url  = `https://api.telegram.org/bot${token}/sendMessage`;
    const body = JSON.stringify({ chat_id: chatId, text: mesaj, parse_mode: 'Markdown' });

    const ctrl     = new AbortController();
    const zamanAsi = setTimeout(() => ctrl.abort(), 10000);
    let cevap;
    try {
        cevap = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: ctrl.signal
        });
    } finally { clearTimeout(zamanAsi); }

    if (!cevap.ok) throw new Error(`[HBK-002] İÇ_HAT_1 API Hatası: ${cevap.status}`);
    const data = await cevap.json();
    if (!data.ok) throw new Error(`[HBK-002] İÇ_HAT_1 başarısız: ${data.description}`);

    log(`[İÇ_HAT_1] Telegram gönderildi → chat:${chatId}`);
    return { kanal: 'telegram', rol: 'IC_HAT_1', basarili: true, hedef: chatId };
}

// ══════════════════════════════════════════════════════════════
// KANAL 3: EMAIL (İÇ HAT 2 - AUDIT)
// ══════════════════════════════════════════════════════════════
async function emailGonder(mesaj, hedef) {
    let nodemailer;
    try { nodemailer = require('nodemailer'); }
    catch { throw new Error('[HBK-003] nodemailer kurulu değil'); }

    const smtp_host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtp_port = process.env.SMTP_PORT || 587;
    const smtp_user = process.env.SMTP_USER;
    const smtp_pass = process.env.SMTP_PASS;
    const hedef_mail= hedef || process.env.EMAIL_HEDEF || process.env.SMTP_USER;

    if (!smtp_user || !smtp_pass || !hedef_mail) {
        throw new Error('[HBK-006] Email config eksik');
    }

    const transporter = nodemailer.createTransport({
        host: smtp_host, port: Number(smtp_port), secure: Number(smtp_port) === 465,
        auth: { user: smtp_user, pass: smtp_pass },
    });

    const bilgi = await transporter.sendMail({
        from:    `"NİZAM İÇ HAT" <${smtp_user}>`,
        to:      hedef_mail,
        subject: `[NİZAM İÇ HAT] ${new Date().toLocaleString('tr-TR')}`,
        text:    mesaj,
        html:    `<pre style="font-family:monospace;white-space:pre-wrap">${mesaj}</pre>`,
    });

    log(`[İÇ_HAT_2] Email gönderildi → ${hedef_mail}`);
    return { kanal: 'email', rol: 'IC_HAT_2', basarili: true, msgId: bilgi.messageId };
}

// ══════════════════════════════════════════════════════════════
// GÖNDERİM FONKSİYONU
// ══════════════════════════════════════════════════════════════
async function haberlesGonder(mesaj, secenekler = {}) {
    if (!mesaj || typeof mesaj !== 'string') throw new Error('[HBK-005] Mesaj boş');

    const siralama = secenekler.kanal_sirasi || ['whatsapp', 'telegram', 'email'];
    const kanalMap = {
        whatsapp: () => whatsappGonder(mesaj, secenekler.whatsapp_hedef),
        telegram: () => telegramGonder(mesaj, secenekler.telegram_hedef),
        email:    () => emailGonder(mesaj,    secenekler.email_hedef),
    };

    if (secenekler.tum_kanallar) {
        const sonuclar = [];
        for (const kanal of siralama) {
            try {
                const r = await kanalMap[kanal]();
                sonuclar.push({ ...r, basarili: true });
            } catch (e) {
                log(`[BROADCAST] ${kanal} (${KANAL_ROLLERI[kanal]}) HATA: ${e.message}`, 'WARN');
                sonuclar.push({ kanal, rol: KANAL_ROLLERI[kanal], basarili: false, hata: e.message });
            }
        }
        return { mod: 'broadcast', sonuclar };
    }

    const denemeler = [];
    for (const kanal of siralama) {
        try {
            const sonuc = await kanalMap[kanal]();
            return { mod: 'failover', basarili_kanal: kanal, rol: KANAL_ROLLERI[kanal], sonuc };
        } catch (e) {
            log(`[FAILOVER] ${kanal} (${KANAL_ROLLERI[kanal]}) çöktü: ${e.message}`, 'WARN');
            denemeler.push({ kanal, hata: e.message });
        }
    }
    log('[HBK-004] KRİTİK: TÜM HATLAR ÇÖKTÜ!', 'ERROR');
    throw new Error(`[HBK-004] Tüm hatlar başarısız: ${denemeler.map(d=>d.kanal).join(',')}`);
}

async function onayBildiri(taskCode, ozet, durum = 'TAMAMLANDI') {
    const mesaj = `📋 GÖREV(DIŞ HAT): ${taskCode}\nDurum: ${durum}\nÖzet: ${ozet.substring(0, 300)}`;
    return haberlesGonder(mesaj, { kanal_sirasi: ['whatsapp', 'telegram', 'email'] });
}

async function kritikAlarm(baslik, detay, hataKodu = '') {
    const mesaj = `🚨 [İÇ HAT KRİTİK] ${baslik}\n${hataKodu}\n${detay.substring(0,400)}`;
    // Alarmlar asıl olarak İÇ HATLARA (Telegram ve Email) fırlatılır, dış hatta düşmez
    return haberlesGonder(mesaj, { kanal_sirasi: ['telegram', 'email'], tum_kanallar: true });
}

async function kanalSaglikKontrol() {
    return {
        topoloji: {
            DIS_HAT:  'whatsapp',
            IC_HAT_1: 'telegram',
            IC_HAT_2: 'email'
        },
        zaman: new Date().toISOString()
    };
}

module.exports = {
    haberlesGonder, onayBildiri, kritikAlarm, kanalSaglikKontrol,
    whatsappGonder, telegramGonder, emailGonder
};
