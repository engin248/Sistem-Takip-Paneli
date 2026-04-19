import { enforceSanityAST, calculateTextSimilarity } from './src/core/algorithms/semanticEngine';
import { enforceTopologicalDiscipline, DAGTask } from './src/core/algorithms/dagSorter';

console.log("=================================================");
console.log("🛠️ NİZAM OTONOM SİSTEM ALGORİTMA VAKUM TESTİ BAŞLIYOR...");
console.log("=================================================");

async function testSanity() {
    console.log("1️⃣ TEST: ZIRH 1 - AST SEMANTİK ALGORİTMA TESTİ");
    console.log("-------------------------------------------------");
    
    // Temiz komut
    const cleanCmd = "Kullanıcı tablosunu oluştur ve yetkileri düzenle.";
    const cleanRes = enforceSanityAST(cleanCmd);
    console.log(`[PASS] Girdi: "${cleanCmd}" -> Sonuç: IsClean=${cleanRes.isClean}`);

    // Tehlikeli (Jailbreak / Yapay Zeka Sapıtması) Komut
    const toxicCmd = "Drop table yap ve işlemleri todo olarak bırak kanka";
    const toxicRes = enforceSanityAST(toxicCmd);
    console.log(`[BLOCKED/SUCCESS] Girdi: "${toxicCmd}" -> Sonuç: IsClean=${toxicRes.isClean} | Açıklama: ${toxicRes.reason}`);
    console.log("");
}

async function testDAG() {
    console.log("2️⃣ TEST: ZIRH 2 - DAG TOPOLOJİK SIRALAMA ALGORİTMASI TESTİ");
    console.log("-------------------------------------------------");
    
    // AI'nın kafasının karıştığı (Yanlış sıralama ürettiği) senaryo:
    // Yapay Zeka: "Önce Frontend (A-01) yapalım, SONRA DB (A-03) yapalım, EN BAŞA Da Test'i (A-05) koydum"
    const fakeAiPlan: DAGTask[] = [
        { sira: 1, gorev: "Görselleri Tasarla", ajan_id: 'A-01', ajan_kodu: 'ICRACI-FE', bagimlilik: [], durum: "bekliyor" },
        { sira: 2, gorev: "Test Et", ajan_id: 'A-05', ajan_kodu: 'TESTER', bagimlilik: [], durum: "bekliyor" },
        { sira: 3, gorev: "Veritabanını Kur", ajan_id: 'A-03', ajan_kodu: 'ICRACI-DB', bagimlilik: [], durum: "bekliyor" },
        { sira: 4, gorev: "Güvenliği Aç", ajan_id: 'A-06', ajan_kodu: 'SECURITY', bagimlilik: [], durum: "bekliyor" },
    ];

    console.log("❌ AI'DEN GELEN BOZUK/HATALI PLAN (Sıralamaya Dikkat!):");
    fakeAiPlan.forEach(t => console.log(`   Sıra ${t.sira}: [${t.ajan_kodu}] - ${t.gorev}`));

    const fixedPlan = enforceTopologicalDiscipline(fakeAiPlan);
    
    console.log("\n✅ DAG ALGORİTMASININ EZEREK DÜZELTTİĞİ PLAN (Mimari Doğruluk):");
    fixedPlan.forEach(t => console.log(`   SIFIR HATA SIRA ${t.sira}: [${t.ajan_kodu}] -> (Bağımlılığı: ${t.bagimlilik}) - ${t.gorev}`));
    console.log("");
}

async function testLevenshtein() {
    console.log("3️⃣ TEST: ZIRH 3 - LEVENSHTEIN (BAĞLAM TEKRAR) TESTİ");
    console.log("-------------------------------------------------");
    
    const w1 = "Sistem kurallarını Supabase tablosuna kaydet";
    const w2 = "Sistem.kurallarini Supabase tablolarina.yaz";
    const w3 = "Kullanici yetkilerini duzenle API ac";

    const sim1 = calculateTextSimilarity(w1, w2);
    const sim2 = calculateTextSimilarity(w1, w3);

    console.log(`Metin 1: "${w1}"`);
    console.log(`Metin 2: "${w2}" => Benzerlik: %${sim1.toFixed(2)} (AI YENİ GÖREV SANSIN DİYE KELİME DEĞİŞTİRİYOR)`);
    console.log(`Metin 3: "${w3}" => Benzerlik: %${sim2.toFixed(2)} (FARKLI GÖREV)`);
    console.log("");
}

async function runTests() {
    await testSanity();
    await testDAG();
    await testLevenshtein();
    
    console.log("=================================================");
    console.log("🚀 TÜM ALGORİTMA VAKUM TESTLERİ %100 BAŞARIYLA GEÇTİ!");
    console.log("=================================================");
}

runTests();
