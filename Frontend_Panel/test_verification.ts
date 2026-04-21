import { TaskContractService } from './src/core/services/TaskContractService';
import { supabase } from './src/lib/supabase';
import { readFileSync, statSync } from 'fs';
import { join } from 'path';

async function runVerification() {
  console.log("=== SİSTEM TAKİP PANELİ: FİZİKSEL OPERASYON DENETİMİ BAŞLIYOR ===");

  // 1. Snapshot Test
  try {
    console.log("\n[TEST 1] TaskContractService - triggerSnapshotLock() Fiziksel DB Yazma Logu test ediliyor...");
    const service = new TaskContractService();
    const snapshotId = await service.triggerSnapshotLock();
    console.log(" -> Üretilen Snapshot ID: " + snapshotId);
    
    // DB'den okuyup teyit et
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .contains('details', { snapshot_id: snapshotId })
      .limit(1);

    if (error) {
       console.log("❌ DB Okuma Hatası: " + error.message);
    } else if (data && data.length > 0) {
       console.log(`✅ ONAY: Supabase audit_logs tablosuna fiziksel yazım doğrulandı:`);
       console.log(`   - Kayıt Tipi: ${data[0].operation_type}`);
       console.log(`   - Mesaj: ${data[0].action_description}`);
       console.log(`   - DB UUID: ${data[0].id}`);
       console.log(`   - Timestamp: ${data[0].timestamp}`);
    } else {
       console.log("❌ KAYIT BULUNAMADI. Fiziksel yazım BAŞARISIZ.");
    }
  } catch (err) {
    console.log("❌ Beklenmeyen Hata: ", err);
  }

  // 2. DRY Code Analysis
  try {
    console.log("\n[TEST 2] taskMutationHandler.ts DRY İhlali Temizliği Kontrolü...");
    const handlerPath = join(__dirname, 'src', 'app', 'api', 'tasks', 'taskMutationHandler.ts');
    const content = readFileSync(handlerPath, 'utf8');
    const hasSpagettiFetch = content.includes("fetch(process.env.STP_SHADOW_MODEL");
    const hasDualValidatorImport = content.includes("import { askDualValidator }");
    const hasDualValidatorCall = content.includes("const checkerResult = await askDualValidator");
    
    if (!hasSpagettiFetch && hasDualValidatorImport && hasDualValidatorCall) {
       console.log("✅ ONAY: Spagetti JSON fetch kodu silinmiş, aiRouter.ts bağlantısı fiziksel olarak yapılmıştır.");
    } else {
       console.log("❌ HATA: Hedef dosya içeriği beklenen DRY kod yapısına uymuyor.");
    }
  } catch(e) {
    console.log("❌ Dosya Okuma Hatası (TEST 2)");
  }

  // 3. Telegram Interceptor Analysis
  try {
    console.log("\n[TEST 3] Telegram Gateway Interceptor Bağlantı Kontrolü...");
    const tgPath = join(__dirname, 'src', 'services', 'telegram', 'commandRouter.ts');
    const contentTg = readFileSync(tgPath, 'utf8');
    const hasInterceptorLink = contentTg.includes("const gatewayRes = await gatewayInterceptor('TELEGRAM', text);");
    
    if (hasInterceptorLink) {
       console.log("✅ ONAY: Haberleşme Gümrüğü (gatewayInterceptor) TELEGRAM rotasına ENTEGRE EDİLMİŞTİR.");
    } else {
       console.log("❌ HATA: Telegram rotasında Gümrük denetimi bulunamadı.");
    }
  } catch(e) {
    console.log("❌ Dosya Okuma Hatası (TEST 3)");
  }

  console.log("\n=== DENETİM TAMAMLANDI ===");
  process.exit(0);
}

runVerification();
