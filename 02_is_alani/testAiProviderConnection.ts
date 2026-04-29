import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { aiComplete, checkOllamaHealth, getProviderStatus } from './src/lib/aiProvider';

async function runTest() {
    console.log("=================================================");
    console.log("🛠️ NİZAM OTO-DENETİM: ORİJİNAL AI_PROVIDER TESTİ");
    console.log("=================================================");

    console.log("\n[1] DURUM KONTROLÜ ÇEKİLİYOR...");
    try {
        const isHealthy = await checkOllamaHealth();
        console.log(`   - Ollama (Yerel) Sağlık: ${isHealthy ? '✅ AKTİF' : '❌ KAPALI/ULAŞILAMAZ'}`);
        
        const status = await getProviderStatus();
        console.log(`   - Aktif Seçilmiş Motor: [ ${status.activeProvider.toUpperCase()} ]`);
        console.log(`   - Önceden Ayarlanmış Maliyet: ${status.costPerRequest}`);
    } catch (err: any) {
         console.log(`   - ❌ Durum Çekilirken Hata: ${err.message}`);
    }

    console.log("\n[2] ORİJİNAL MOTOR İLE DENEME (aiComplete ÇAĞRISI)...");
    try {
        const result = await aiComplete({
            systemPrompt: "Sen askeri bir denetçisin. Sadece tek kelime 'EVET' diyerek onay ver.",
            userMessage: "Sistem, orijinal motorlara geri bağlandı mı? Beni duyuyor musun?",
            temperature: 0.1
        });
        
        if (result && result.content) {
            console.log(`\n✅ BAŞARILI! Orijinal Sağlayıcı Zinciri Çalıştı ve Cevap Döndü!`);
            console.log(`   > YANIT: "${result.content.trim()}"`);
            console.log(`   > KULLANILAN MOTOR: ${result.model}`);
            console.log(`   > PROVIDER KANALI: ${result.provider}`);
            console.log(`   > SÜRE: ${result.durationMs}ms`);
        } else {
            console.log("\n⚠️ SİGORTA DEVREDE: aiComplete NULL döndü (Ollama ve OpenAI kapalı, Lokal Düşüş devrede).");
            console.log("   Sistem çökmedi, başarılı bir şekilde Fail-Safe çalıştı.");
        }
    } catch (error: any) {
        console.log("\n❌ KRİTİK HATA: " + error.message);
    }
}

runTest();
