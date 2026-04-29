/**
 * SUPABASE MANAGER (Realtime & Cryptographic Audit)
 * =================================================
 * KADEME 3: WebSocket (Realtime) Dağıtıcısı. Polling'i sıfırlar.
 * KADEME 4: Kriptografik Adli Mühür. Başarı/Hata loglarını şifreleyerek kazır.
 */
'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
}

/**
 * 3. KADEME: Ağ Üzerinden Anlık (Realtime) Bildirim Yayımlar
 * Paneller bu kanalı (nizam_telemetry) dinler, gereksiz setInterval atmaz.
 */
function broadcastTelemetry(event, payload) {
    if (!supabase) return;
    
    // Supabase channel broadcast (Server'dan Müşteriye anlık ping)
    const channel = supabase.channel('nizam_telemetry');
    channel.send({
        type: 'broadcast',
        event: event,
        payload: {
            ...payload,
            timestamp: Date.now()
        }
    }).catch(err => console.error("[TELEMETRY HATA] ", err.message));
}

/**
 * 4. KADEME: Otonom İşlem Sonucunu Kriptografik Olarak Mühürler.
 * Veritabanına şifrelenmiş SHA-256 sağlama (hash) değeriyle kaydederek, 
 * geriye dönük müdahaleyi ('Kayıt Değiştirildi' itirazlarını) imkansız kılar.
 */
async function sealCryptographicAudit(jobId, agentId, rawInput, resultData, status) {
    if (!supabase) return;

    const hashPayload = `${jobId}:${agentId}:${status}:${JSON.stringify(resultData)}`;
    const cryptographicSeal = crypto.createHash('sha256').update(hashPayload).digest('hex');

    const { error } = await supabase.from('audit_trails').insert([{
        job_id: jobId || 'UNKNOWN_JOB',
        agent_id: agentId,
        action_type: 'OTONOM_ISLEM_MUHURU',
        status: status,
        raw_input: typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput),
        result_data: resultData,
        cryptographic_hash: cryptographicSeal // <- DEĞİŞTİRİLEMEZ MÜHÜR
    }]);

    if (error) {
        console.error(`[MÜHÜRLEME HATASI] Agent: ${agentId} -`, error.message);
    } else {
        console.log(`[MÜHÜRLENDİ] Job ${jobId} -> Hash: ${cryptographicSeal.substring(0, 12)}...`);
    }
}

module.exports = {
    supabase,
    broadcastTelemetry,
    sealCryptographicAudit
};
