'use strict';
const path = require('path');
const fs = require('fs');
const cp = require('child_process');

const LOGS = [];
let passed = 0;
let failed = 0;

function log(msg) {
    console.log(msg);
    LOGS.push(msg);
}

function assert(condition, message) {
    if (condition) {
        log(`✅ [SAĞLIKLI] ${message}`);
        passed++;
    } else {
        log(`❌ [KRİTİK HATA] ${message}`);
        failed++;
    }
}

async function runCheckup() {
    log("=====================================================");
    log(" 🩺 SİSTEM TAKİP PANELİ — TAM TEŞEKKÜLLÜ CHECKUP");
    log(` Zaman: ${new Date().toISOString()}`);
    log("=====================================================\n");

    // 1- DOTENV & BAĞIMLILIKLAR KATMANI
    log("--- 1. TEMEL BAĞIMLILIK & ÇEVRE (ENV) KATMANI ---");
    const envPath = path.resolve(__dirname, '.env');
    assert(fs.existsSync(envPath) && fs.readFileSync(envPath, 'utf8').includes('NIZAM_API_KEY'), ".env: NIZAM_API_KEY aktif ve tanımlı.");

    // 2- KÖPRÜ (BRIDGE SERVER) KATMANI
    log("\n--- 2. KÖPRÜ (API/BRIDGE) KATMANI ---");
    const bridgePath = path.resolve(__dirname, 'api', 'bridge_server.js');
    try {
        const bridgeContent = fs.readFileSync(bridgePath, 'utf8');
        // İnisiyatif ihlallerine yönelik duplicate check (Önceki fix test)
        const loadEnvMatches = bridgeContent.match(/function loadEnv\(\)/g) || [];
        assert(loadEnvMatches.length === 1, "Bridge: loadEnv kod tekrarı (duplicate) barındırmıyor.");
        assert(bridgeContent.includes('MISSING_DELTA'), "Bridge: 'delta' zırhı ve MISSING_DELTA hata kodu devrede.");
    } catch(e) {
        assert(false, "Bridge Server okunamadı: " + e.message);
    }

    // 3- İŞ ALANI VE AJAN ÇEKİRDEĞİ KATMANI
    log("\n--- 3. İŞ ALANI (02_IS_ALANI) & VALİDASYON ---");
    try {
        const Validator = require('./02_is_alani/agents/Validator');
        const vResult = Validator.validateTask("Tehlikeli <script> kodu", ['analiz'], 'DESTEK', 2, 'SIFIR');
        assert(vResult.karar === 'REDDEDİLDİ', "Validator: Injection saldırısı başarıyla bloklandı (Sıfır Güven).");
        assert(vResult.validasyon.teknik.some(s => s.includes('RED:')), "Validator: Zararlı işlem teknik red listesine düştü.");
    } catch(e) {
        assert(false, "İş Alanı Validator test hatası: " + e.message);
    }

    // 4- OTONOM AĞ MİMARİSİ (SYSTEM) KATMANI
    log("\n--- 4. OTONOM AI MİMARİSİ (SYSTEM) ---");
    try {
        const { enforceOutput } = require('./system/core/enforcer');
        const memoryManager = require('./system/core/memoryManager');
        const { executeWithRetry } = require('./system/core/retryHelper');
        
        const clean = enforceOutput({rules: {output: {trim_extra: true, single_output: true}}}, "```\nSaf Veri\n```");
        assert(clean.result === "Saf Veri", "Enforcer: Kural dayatıcı (Output Enforcer) aktif ve pürüzsüz çalışıyor.");
        
        memoryManager.setStatelessLog('CHECK', 'ok');
        assert(memoryManager.getLog('CHECK') !== null, "Memory: Stateless bellek yönetimi stabil.");
    } catch(e) {
        assert(false, "Otonom AI Sistemi (system) modülleri hatalı: " + e.message);
    }

    // 5- TÜR GÜVENLİĞİ VE DERLEME (TYPESCRIPT) ESNASI
    log("\n--- 5. TYPESCRIPT (TS) VE UI DERLEME DURUMU ---");
    try {
        log("🔄 TypeScript derleyici denetimi yapılıyor (tsc --noEmit)...");
        cp.execSync('npx tsc --noEmit', { cwd: path.resolve(__dirname, '02_is_alani') });
        assert(true, "TypeScript: 02_is_alani dizinindeki kodlarda Syntax/Type hatası BULUNAMADI.");
    } catch(e) {
        assert(false, "TypeScript: Tür denetiminde hata tespit edildi! " + (e.stdout ? e.stdout.toString() : e.message));
    }

    // SONUÇ VE LOGLAMA
    log("\n=====================================================");
    log(" 📋 CHECKUP SONUÇ RAPORU:");
    log(` Toplam Kontrol : ${passed + failed}`);
    log(` Geçen Puan     : ${passed}`);
    log(` Hatalı Puan    : ${failed}`);
    
    if (failed === 0) {
        log(" 🏆 DURUM: SİSTEM %100 SAĞLIKLI. ÇARPIŞMAYA HAZIR.");
    } else {
        log(" ⚠️ DURUM: RİSKLİ. Acil onarım gereken alanlar mevcut.");
    }
    log("=====================================================");

    // Dosyaya yazdır (Kanıt)
    fs.mkdirSync(path.resolve(__dirname, '03_denetim_kanit'), { recursive: true });
    const reportPath = path.resolve(__dirname, '03_denetim_kanit', `health_check_${Date.now()}.log`);
    fs.writeFileSync(reportPath, LOGS.join('\n'));
    console.log(`\n📄 Ayrıntılı Kanıt Logu Kaydedildi: ${reportPath}`);
    
    process.exit(failed === 0 ? 0 : 1);
}

runCheckup();
