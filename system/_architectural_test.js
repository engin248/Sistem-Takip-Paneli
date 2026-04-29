'use strict';
const path = require('path');
const fs = require('fs');

// Loglama dizisi
const testLog = [];
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        testLog.push(`✅ [GEÇTİ] ${message}`);
        passed++;
    } else {
        testLog.push(`❌ [HATA]  ${message}`);
        failed++;
    }
}

async function runTests() {
    console.log("=========================================");
    console.log(" OTONOM AI MİMARİSİ: İÇ DOĞRULAMA TESTİ");
    console.log("=========================================\n");

    // ----------------------------------------------------
    // TEST 1: ENFORCER (KURAL DAYATICI)
    // ----------------------------------------------------
    try {
        const { enforceOutput } = require('./core/enforcer');
        
        // 1.1 Terminal Kalıntılarını Trimleme Testi
        const dirtyOutput = "```json\n { \"result\": \"gizli_veri\" } \n```";
        const strictCtx = { rules: { output: { trim_extra: true, single_output: true } } };
        const cleaned = enforceOutput(strictCtx, dirtyOutput);
        assert(cleaned.result === "{ \"result\": \"gizli_veri\" }", "Enforcer: Terminal tag'leri ( ```json ) ve fazlalıklar başarıyla kesilip trim edildi.");

        // 1.2 Format Zorlaması
        const singleFormatted = enforceOutput(strictCtx, "Salt Metin");
        assert(singleFormatted.result === "Salt Metin", "Enforcer: Strict Formata uyum doğrulandı (String nesneye dönüştürüldü).");

    } catch (err) {
        assert(false, "Enforcer: Beklenmeyen hata - " + err.message);
    }

    // ----------------------------------------------------
    // TEST 2: MEMORY MANAGER (STATELESS BEKÇİSİ)
    // ----------------------------------------------------
    try {
        const memoryManager = require('./core/memoryManager');
        
        // 2.1 Veri kaydı
        memoryManager.setStatelessLog('TEST_JOB_123', 'Ajan log verisi');
        const retrieved = memoryManager.getLog('TEST_JOB_123');
        assert(retrieved && retrieved.data === 'Ajan log verisi', "MemoryManager: Log işlemi önbelleğe (stateless) başarıyla yansıtıldı.");
        
    } catch (err) {
        assert(false, "MemoryManager: Beklenmeyen hata - " + err.message);
    }

    // ----------------------------------------------------
    // TEST 3: RETRY HELPER (FAIL-FAST TOLERANSI)
    // ----------------------------------------------------
    try {
        const { executeWithRetry } = require('./core/retryHelper');
        let deneme = 0;
        
        const sahteGorev = async () => {
            deneme++;
            if (deneme === 1) throw new Error("Ağ Kesintisi (Simüle Edilmiş)");
            return "BAŞARILI_SONUÇ";
        };

        const sonuc = await executeWithRetry(sahteGorev, 1);
        assert(deneme === 2 && sonuc === "BAŞARILI_SONUÇ", "RetryHelper: 1. hatada çökmedi, 2. denemede başarıyla görev toparlandı.");
        
    } catch (err) {
        assert(false, "RetryHelper: Beklenmeyen hata - " + err.message);
    }

    // ----------------------------------------------------
    // TEST 4: .ENV BOT BOZMASI KONTROLÜ
    // ----------------------------------------------------
    try {
        const envPath = path.resolve(__dirname, '..', '.env');
        const envVarMi = fs.existsSync(envPath);
        if (envVarMi) {
            const icerik = fs.readFileSync(envPath, 'utf8');
            assert(icerik.includes('NIZAM_API_KEY'), ".env Dosyası: Root dizinde NIZAM_API_KEY korundu ve kullanılabilir durumda.");
        } else {
            assert(false, ".env Dosyası: Kök dizinde tespit edilemedi!");
        }
    } catch (err) {
         assert(false, ".env Dosyası Analizi Hatası: " + err.message);
    }

    // ----------------------------------------------------
    // RAPORLAMA VE ÇIKTI
    // ----------------------------------------------------
    console.log(testLog.join('\n'));
    console.log("\n=========================================");
    if (failed === 0) {
        console.log(`🚀 SONUÇ: ${passed}/${passed+failed} BAŞARILI. SİSTEM %100 OTONOM ONAYLI.`);
        process.exit(0);
    } else {
        console.log(`💥 SONUÇ: ${failed} HATA TESPİT EDİLDİ. SİSTEM RİSKLİ!`);
        process.exit(1);
    }
}

runTests();
