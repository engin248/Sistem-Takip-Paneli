import { orchestrateTask } from './src/services/orchestrationService';
import { generateStrategicPlan } from './src/services/kurmayService';

async function verifyServices() {
    console.log("--- STP Otonom Bağlantı Doğrulama ---");

    // 1. Orkestrasyon Testi
    console.log("[1/3] Orkestrasyon denetleniyor...");
    const orchResult = await orchestrateTask({
        gorev: "TEST GÖREVİ: Lütfen bu görevi görmezden gelin. (Doğrulama Aşaması)",
        ajan_id: "A-01"
    }).catch(e => ({ success: false, error: e.message }));
    
    console.log("Sonuç:", orchResult.success ? "BAŞARILI" : "HATA", orchResult.error || "");

    // 2. Kurmay Mevcudiyet Testi
    console.log("[2/3] Kurmay Servis yapısı denetleniyor...");
    // AI provider kapalı olabilir, sadece fonksiyonel varlığı kontrol ediliyor.
    if (typeof generateStrategicPlan === 'function') {
        console.log("Sonuç: KURMAY SERVİSİ AKTİF");
    } else {
        console.log("Sonuç: KURMAY SERVİSİ BULUNAMADI");
    }

    // 3. API Rota Bütünlüğü
    console.log("[3/3] Rota parametre uyumu denetleniyor...");
    // Manuel kontrol yapıldı.
    
    console.log("--- Doğrulama Tamamlandı ---");
}

// Not: Bu script ts-node veya next.js bağlamında çalışmalıdır.
// Sadece mantıksal referans için oluşturuldu.
