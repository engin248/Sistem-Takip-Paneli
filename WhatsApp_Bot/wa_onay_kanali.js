/**
 * wa_onay_kanali.js — Mikro Adım Onay Kanalı
 * Sorumluluk: "ONAYLA TASK-XXX" ve "REDDET TASK-XXX neden" komutlarını işler.
 * Bağımlılık: supabase client, log fonksiyonu
 *
 * MODÜL HATA KODLARI (WOK-xxx — bu modüle özel):
 *   WOK-001 : Görev kodu belirtilmedi (format hatası)
 *   WOK-002 : Görev Supabase'de bulunamadı
 *   WOK-003 : Görev onay_bekliyor durumunda değil
 *   WOK-004 : Onay Supabase'e yazılamadı
 *   WOK-005 : Red Supabase'e yazılamadı
 */

/**
 * onayKomutunuIsle — WhatsApp'tan gelen ONAYLA/REDDET komutunu işler.
 * @param {object} msg        - WhatsApp mesaj nesnesi
 * @param {string} metin      - Mesaj metni (trim edilmiş)
 * @param {string} senderName - Gönderen adı
 * @param {object} supabase   - Supabase client
 * @param {Function} log      - Log fonksiyonu
 * @returns {boolean}         - true: komut işlendi (başka işlem yapılmasın)
 */
async function onayKomutunuIsle(msg, metin, senderName, supabase, log) {
    const upper = metin.toUpperCase();
    if (!upper.startsWith('ONAYLA ') && !upper.startsWith('REDDET ')) return false;

    const parcalar = metin.trim().split(/\s+/);
    const eylem    = parcalar[0].toUpperCase();
    const taskCode = parcalar[1]?.toUpperCase();
    const neden    = parcalar.slice(2).join(' ') || '';

    if (!taskCode) {
        await msg.reply('[WOK-001] Görev kodu belirtilmedi.\nFormat: ONAYLA TASK-XXXX\nFormat: REDDET TASK-XXXX neden açıkla');
        return true;
    }

    // Supabase'den görevi bul
    let gorev = null;
    try {
        const { data, error } = await supabase
            .from('tasks').select('*').eq('task_code', taskCode).single();
        if (error || !data) throw new Error(`[WOK-002] Görev bulunamadı: ${taskCode}`);
        gorev = data;
    } catch (e) {
        await msg.reply(`❌ ${e.message}`);
        return true;
    }

    if (gorev.status !== 'onay_bekliyor') {
        await msg.reply(
            `[WOK-003] Bu görev onay aşamasında değil.\n` +
            `Mevcut durum: *${gorev.status}*\n` +
            `Onay yalnızca *onay_bekliyor* durumundaki görevlere verilebilir.`
        );
        return true;
    }

    const onaylayan = senderName || msg.from;

    if (eylem === 'ONAYLA') {
        const { error } = await supabase.from('tasks').update({
            status:     'tamamlandi',
            updated_at: new Date().toISOString(),
            metadata:   { ...(gorev.metadata || {}), onaylayan, onay_ts: new Date().toISOString(), onay_kanal: 'whatsapp' },
        }).eq('task_code', taskCode);

        if (error) { await msg.reply(`[WOK-004] Onay yazılamadı: ${error.message}`); return true; }

        log(`✅ [MİKRO_ONAY] ONAYLANDI: ${taskCode} — ${onaylayan}`, 'INFO');
        await msg.reply(
            `✅ *GÖREV ONAYLANDI VE TAMAMLANDI*\n\n` +
            `📋 Kod: \`${taskCode}\`\n📝 ${gorev.title}\n👤 ${onaylayan}\n🕐 ${new Date().toLocaleString('tr-TR')}`
        );

    } else { // REDDET
        const { error } = await supabase.from('tasks').update({
            status:     'reddedildi',
            updated_at: new Date().toISOString(),
            metadata:   { ...(gorev.metadata || {}), reddeden: onaylayan, red_neden: neden || 'Belirtilmedi', red_ts: new Date().toISOString(), onay_kanal: 'whatsapp' },
        }).eq('task_code', taskCode);

        if (error) { await msg.reply(`[WOK-005] Red yazılamadı: ${error.message}`); return true; }

        log(`❌ [MİKRO_ONAY] REDDEDİLDİ: ${taskCode} — ${onaylayan} — ${neden}`, 'WARN');
        await msg.reply(
            `❌ *GÖREV REDDEDİLDİ*\n\n` +
            `📋 Kod: \`${taskCode}\`\n📝 ${gorev.title}\n👤 ${onaylayan}\n📌 Neden: ${neden || 'Belirtilmedi'}`
        );
    }

    return true;
}

/**
 * wa_gonder — haberlesme_koprusu tarafından çağrılır.
 * WhatsApp istemcisi global olarak inject edilmelidir.
 * Kullanım: global.WA_CLIENT üzerinden mesaj gönderir.
 *
 * @param {string} numara - Hedef numara (uluslararası format: 905xxxxxxxxx@c.us)
 * @param {string} mesaj  - Gönderilecek metin
 */
async function wa_gonder(numara, mesaj) {
    // WA istemcisi whatsapp_agent.js tarafından global olarak set edilir
    const istemci = global.WA_CLIENT;
    if (!istemci) {
        throw new Error('[WOK-006] global.WA_CLIENT aktif değil — WhatsApp bağlı değil');
    }

    // numara formatı: 905551234567@c.us veya düz numara
    const hedef = numara.includes('@') ? numara : `${numara.replace(/\D/g, '')}@c.us`;
    await istemci.sendMessage(hedef, mesaj);
}

module.exports = { onayKomutunuIsle, wa_gonder };

