/**
 * QUEUE PROCESSOR (Sandboxed Worker)
 * =================================
 * KADEME 2: "Worker Threads" (Node.js) Entegrasyonu
 * CPU Blokajını aşmak için BullMQ'nun Sandboxing yeteneği kullanılır.
 * Ana makine kilitlenmez, bu işçi (worker) kendi thread/process'inde çalışıp
 * sonucu asenkron merkeze bildirir.
 */
'use strict';

const { enforceOutput } = require('./enforcer');
const retryHelper = require('./retryHelper');
const { sealCryptographicAudit, broadcastTelemetry } = require('./supabaseManager');

module.exports = async (job) => {
    // İş parçacığında işleniyor
    const { ctx, rawInput } = job.data;
    
    try {
        // CPU yoğurucu simülasyon (Gerçek ajanın çalışıp json/string ayıkladığı yer)
        const rawResult = await retryHelper.executeWithRetry(async () => {
            if (!rawInput) throw new Error("Görev içeriği boş olamaz.");
            return `[WORKER_THREAD İŞLENDİ: ${ctx.agentId}] -> ${rawInput}`;
        }, 1);

        // Kural dayatma mekanizması da Worker thread'de gerçekleşir
        const finalResult = enforceOutput(ctx, rawResult);
        
        // BAŞARILI DURUM: Şifreleyip Supabase'e Gönder (Mühürleme) & UI'ye Realtime Haber Ver!
        await sealCryptographicAudit(job.id, ctx.agentId, rawInput, finalResult, 'BASARILI');
        broadcastTelemetry('agent_success', { jobId: job.id, agentId: ctx.agentId });

        return finalResult;
    } catch (error) {
        // HATALI DURUM: İhlal girişimini kaydet & UI'ye Uyarı Fırlat
        await sealCryptographicAudit(job.id, ctx.agentId, rawInput, { error: error.message }, 'HATALI');
        broadcastTelemetry('agent_failed', { jobId: job.id, agentId: ctx.agentId, error: error.message });
        
        throw error; // Fail-Fast standardı gereği BullMQ reddini sağlar
    }
};
