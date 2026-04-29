/**
 * wa_komut_yonetici.js — WhatsApp Komut Yöneticisi
 * Sorumluluk: /durum, /gorevler, /onayla, /iptal komutları + serbest metin.
 * Bağımlılık: wa_onay_kanali.js, createTaskViaAPI, supabase, log
 *
 * MODÜL HATA KODLARI (WKY-xxx — bu modüle özel):
 *   WKY-001 : /durum — sistem health-check başarısız
 *   WKY-002 : /gorevler — görev listesi alınamadı
 *   WKY-003 : Sesli görev onayı — pending bulunamadı
 *   WKY-004 : Sesli görev oluşturma başarısız
 *   WKY-005 : Serbest metin — tetikleyici kelime yok, yoksayıldı
 *   WKY-006 : Serbest metin — sistem kural kontrolü başarısız
 *   WKY-007 : Görev oluşturma — 1. Departman reddetti
 */

const { kuralKontrol, ihlalLog }  = require('../shared/sistemKurallari');
const { onayKomutunuIsle }         = require('./wa_onay_kanali');

const PE = { kritik: '🔴', yuksek: '🟠', normal: '🟡', dusuk: '🟢' };

const TRIGGER_WORDS = [
    'sistem', 'operatür', 'operatör', 'operator',
    'burhan', 'asker', 'yetkili', 'gürevli', 'görevli', 'gorevli',
    'sibel hnm', 'sibel hanım', 'sibel'
];

function hasTrigger(text) {
    if (!text) return false;
    const lower = text.trim().toLowerCase();
    return TRIGGER_WORDS.some(w => lower.startsWith(w));
}

/**
 * komutYonet — Gelen yazılı mesajı komuta veya göreve yönlendirir.
 * @returns {boolean} true: işlendi
 */
async function komutYonet({ msg, metin, from, senderName, supabase, log, getActiveTasks, getSystemHealth, createTaskViaAPI, pendingVoice, STP_API_BASE }) {

    if (!metin) return false;

    // /durum
    if (metin === '/durum') {
        const health = await getSystemHealth();
        await msg.reply(
            `🏗️ *STP SİSTEM DURUMU*\n\n` +
            `🟢 Durum: ${health.status || 'bilinmiyor'}\n` +
            `🌐 API: ${STP_API_BASE}\n` +
            `🕐 ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`
        );
        return true;
    }

    // /gorevler
    if (metin === '/gorevler') {
        const result = await getActiveTasks();
        if (!result.success || !result.data?.length) {
            await msg.reply('📋 Aktif görev bulunamadı.');
            return true;
        }
        const lines = result.data.slice(0, 10).map((t, i) =>
            `${i + 1}. ${PE[t.priority] || '🟡'} \`${t.task_code}\` — ${t.title} [${t.status}]`
        );
        await msg.reply(`📋 *AKTİF GÖREVLER* (${result.data.length})\n\n${lines.join('\n')}`);
        return true;
    }

    // /onayla — sesli mesaj onayı
    if (metin === '/onayla') {
        const pending = pendingVoice.get(from);
        if (!pending) { await msg.reply('⚠️ Onaylanacak sesli görev bulunamadı.'); return true; }
        pendingVoice.delete(from);
        const result = await createTaskViaAPI(pending.transcript, pending.senderName, 'whatsapp_voice');
        if (result.success) {
            const taskCode = result.data?.task_code || '';
            await msg.reply(
                `✅ *SESLİ GÖREV OLUŞTURULDU*\n\n` +
                `📋 Kod: \`${taskCode}\`\n🎤 Sesli Mesaj\n` +
                `📝 ${pending.transcript.substring(0, 100)}\n👤 ${pending.senderName}`
            );
            log(`SESLİ GÖREV: ${taskCode}`, 'INFO');
        } else {
            await msg.reply(`❌ Görev oluşturulamadı: ${result.error || 'bilinmeyen hata'}`);
        }
        return true;
    }

    // /iptal
    if (metin === '/iptal') {
        if (pendingVoice.has(from)) {
            pendingVoice.delete(from);
            await msg.reply('🚫 Sesli görev iptal edildi.');
            log(`SESLİ GÖREV İPTAL: ${from}`, 'INFO');
        } else {
            await msg.reply('⚠️ İptal edilecek sesli görev bulunamadı.');
        }
        return true;
    }

    // ONAYLA / REDDET — mikro adım onay kanalı
    const onayIslendi = await onayKomutunuIsle(msg, metin, senderName, supabase, log);
    if (onayIslendi) return true;

    // Bilinmeyen slash komutu
    if (metin.startsWith('/')) return true;

    // SERBEST METİN → GÖREV OLUŞTUR
    if (!hasTrigger(metin)) {
        log(`METİN YOKSAYILDI (Tetikleyici Yok): "${metin.slice(0, 50)}"`, 'INFO');
        return true;
    }

    // Girdi kural kontrolü
    const girisKontrol = kuralKontrol('WHATSAPP_GOREV', metin);
    if (!girisKontrol.gecti) {
        const logMsg = ihlalLog('WHATSAPP_BOT', girisKontrol);
        if (logMsg) log(logMsg, 'WARN');
        await msg.reply(`🚫 *Görev reddedildi*\n\nSistem kuralları ihlali:\n${girisKontrol.ihlaller.map(i => `• [${i.kural_no}] ${i.aciklama}`).join('\n')}`);
        return true;
    }

    await msg.reply('📥 *Görev alındı.* Kontrol noktalarından geçiriliyor...');
    const result = await createTaskViaAPI(metin, senderName, 'whatsapp_text');

    if (result.success) {
        await msg.reply(
            `🏛️ *1. DEPARTMAN (GÖREV KABUL) ONAYLANDI*\n\n` +
            `✅ *MİMAR:* 6-Katmanlı Plan Çizildi.\n` +
            `⚖️ *ZINDIK:* MDS-160 Testinden Geçti! [PASS]\n\n` +
            `📋 *Hedef:* ${metin.substring(0, 100)}...\n` +
            `📌 *Aksiyon:* Kurul Masasına Çıkarılıyor!`
        );
        log(`1. DEPARTMAN ONAYI: ${metin.substring(0, 60)}`, 'INFO');
    } else {
        await msg.reply(
            `❌ *1. DEPARTMAN İNFAZ ETTİ!*\n\n` +
            `*ZINDIK RAPORU:*\n\`\`\`\n${result.error || 'Bilinmeyen Hata'}\n\`\`\``
        );
        log(`GÖREV İNFAZI: ${result.error}`, 'WARN');
    }

    return true;
}

module.exports = { komutYonet, hasTrigger };
