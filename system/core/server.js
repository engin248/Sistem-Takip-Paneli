/**
 * CORE / SERVER
 * =======================
 * Komutların Parse -> Validator -> Executor -> Enforcer 
 * zincirinden akmasını sağlayan merkez router.
 */
'use strict';

const express = require('express');
const { enforceOutput } = require('./enforcer');
const retryHelper = require('./retryHelper');

const router = express.Router();

router.post('/execute', async (req, res) => {
    const { taskId, agentId, rawInput, parameters } = req.body;
    
    const ctx = {
        taskId: taskId || Date.now().toString(),
        agentId: agentId || 'UNKNOWN',
        start: Date.now(),
        rules: { 
            output: { trim_extra: true, single_output: true } 
        }
    };

    try {
        // Burada Orchestrator'dan gelen ajan kodları çalışır (Simülasyon/Entegrasyon noktası)
        // 1. INPUT VALIDATION (Daha önce Validator.js ile çözdüğümüz kısım)
        // 2. EXECUTOR (Retry Helper ile sarılı)
        
        const rawResult = await retryHelper.executeWithRetry(async () => {
             // Sahte işlem - Gerçek ajan buraya entegre edilecek
             if (!rawInput) throw new Error("Görev içeriği boş olamaz.");
             return `[İŞLENDİ: ${agentId}] -> ${rawInput}`;
        }, 1);

        // 3. OUTPUT ENFORCER (En Kritik Kapı - Arşiv Log #6295 uyarınca)
        const finalResult = enforceOutput(ctx, rawResult);

        res.status(200).json({
            status: "SUCCESS",
            ctx,
            data: finalResult,
            execution_time_ms: Date.now() - ctx.start
        });
    } catch (err) {
        res.status(400).json({
            status: "FAILED",
            error: err.message,
            execution_time_ms: Date.now() - ctx.start
        });
    }
});

// YENİ EK: 1. AŞAMA - REDİS/BULLMQ TABANLI ASENKRON KUYRUK GİRİŞİ
router.post('/execute/queue', async (req, res) => {
    const { taskId, agentId, rawInput, parameters } = req.body;
    
    const ctx = {
        taskId: taskId || Date.now().toString(),
        agentId: agentId || 'UNKNOWN',
        start: Date.now(),
        rules: { 
            output: { trim_extra: true, single_output: true } 
        }
    };

    try {
        let queueManager;
        try {
            queueManager = require('./queueManager');
        } catch(e) {
            return res.status(503).json({ status: "UNAVAILABLE", error: "Redis/Kuyruk servisi başlatılmadı veya kurulamadı." });
        }

        const jobId = await queueManager.enqueueTask(ctx, rawInput);

        res.status(202).json({
            status: "QUEUED",
            jobId: jobId,
            message: "Görev başarıyla BullMQ/Redis kuyruğuna aktarıldı."
        });
    } catch (err) {
        res.status(500).json({
            status: "FAILED",
            error: err.message
        });
    }
});

module.exports = router;
