/**
 * QUEUE MANAGER (BullMQ & Redis)
 * =====================================
 * Görevlerin CPU blokajı yaratmadan ve sistem çökmelerinde kaybolmadan
 * işlenmesini sağlayan dağıtık kuyruk yöneticisi.
 */
'use strict';

const path = require('path');
const { Queue, Worker, QueueEvents } = require('bullmq');

// INFO: Redis URI tanımlanmadıysa (örn local ortam) sistem otomatik devre dışı kalıp 
// hata vermemesi için graceful fallback mekanizması eklenebilir.
const REDIS_CONNECTION = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
};

// Queue oluşturma
const taskQueue = new Queue('OrchestratorQueue', { 
    connection: REDIS_CONNECTION 
});

const queueEvents = new QueueEvents('OrchestratorQueue', { 
    connection: REDIS_CONNECTION 
});

// Worker işlemi - Redis üzerinden işi alır (Sandboxed Worker Threads Mode - CPU dostu)
// `queueProcessor.js` dosyasını ayrı Node.js thread'ine verir. (KADEME 2: Thread-Pool/Sandboxed)
const worker = new Worker('OrchestratorQueue', path.join(__dirname, 'queueProcessor.js'), { 
    connection: REDIS_CONNECTION 
});

worker.on('completed', (job, returnvalue) => {
    console.log(`[BULLMQ - BAŞARILI] Job ${job.id} tamamlandı.`);
    // TODO: Burada Webhooks veya Supabase'e geri dönüş tetiklenebilir
});

worker.on('failed', (job, err) => {
    console.log(`[BULLMQ - REDDEDİLDİ] Job ${job.id} hata fırlattı: ${err.message}`);
});

/**
 * Görevi redis kuyruğuna asenkron ekler
 */
async function enqueueTask(ctx, rawInput) {
    const job = await taskQueue.add('AgentTask', { ctx, rawInput }, {
        attempts: 2,           // Kuyruk düzeyinde de fallback toleransı
        backoff: {
            type: 'fixed',
            delay: 1000
        },
        removeOnComplete: 1000,
        removeOnFail: 5000
    });
    return job.id;
}

module.exports = { enqueueTask, taskQueue, queueEvents, worker };
