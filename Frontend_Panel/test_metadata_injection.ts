import { supabase, validateSupabaseConnection } from './src/lib/supabase';

async function runMetadataTest() {
  console.log("=== THE ORDER: METADATA ENJEKSİYON TESTİ BAŞLIYOR ===");

  const { isValid } = validateSupabaseConnection();
  if (!isValid) {
      console.log("❌ Supabase bağlantısı başarısız.");
      return;
  }
  
  const mockPlan = {
      arge_arastirma: "Test ARGE verisi",
      gorev_kriterleri: ["Kriter 1", "Kriter 2"]
  };

  const taskCode = "TSK-TEST-" + Date.now().toString().slice(-4);
  console.log(`[1] Mock Görev Kodu Üretildi: ${taskCode}`);
  
  // 1. Yazma Testi
  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      title: "MİMARİ SIZINTI TESTİ",
      task_code: taskCode,
      status: 'beklemede',
      priority: 'normal',
      assigned_to: 'SYSTEM-TEST',
      metadata: {
        kaynak: 'telegram',
        ai_analiz: {
            oncelik: 'normal',
            motor: 'local',
            cift_onay_plani: mockPlan
        }
      }
    }])
    .select();

  if (error) {
      console.log("❌ BAŞARISIZ: Veritabanına yazılırken hata oluştu ->", error.message);
      return;
  }
  console.log(`[2] Veritabanı Yazma Başarılı: ${data[0].id}`);

  // 2. Okuma Testi (Data Leak kontrolü)
  const { data: readData, error: readError } = await supabase
    .from('tasks')
    .select('metadata')
    .eq('task_code', taskCode)
    .single();

  if (readError) {
      console.log("❌ BAŞARISIZ: Veri okunurken hata oluştu ->", readError.message);
  } else {
      const retrievedPlan = readData?.metadata?.ai_analiz?.cift_onay_plani;
      if (retrievedPlan && retrievedPlan.arge_arastirma === "Test ARGE verisi") {
          console.log("✅ BAŞARILI: Çift Onay Planı (aiPlan) veritabanı boşluğunda kaybolmadan fiziksel olarak Supabase tablosuna mühürlenmiş ve geri okunmuştur.");
          console.log(`   └─ Okunan Plan Özeti: ${JSON.stringify(retrievedPlan)}`);
      } else {
          console.log("❌ BAŞARISIZ: Metadata yapısı bozuldu veya veri void'de kayboldu.");
      }
  }

  // 3. Temizlik
  await supabase.from('tasks').delete().eq('task_code', taskCode);
  console.log(`[3] Test kaydı ( ${taskCode} ) temizlendi.`);
  console.log("=== TEST TAMAMLANDI ===");
  process.exit(0);
}

runMetadataTest();
