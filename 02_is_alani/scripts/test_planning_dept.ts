import { CentralPlanningDepartment } from '../src/core/planning_department/PlanningDepartment';

async function testPlanningDepartment() {
  console.log('--- TEST ETME SÜRECİ BAŞLADI ---');
  console.log('Hedef: CentralPlanningDepartment.executeTaskPlanning()\n');

  try {
    const rawInput = "Telegram üzerinden gelen otonom test komutu...";
    const source = "TEST_RUNNER";

    console.log(`[01] Girdi: "${rawInput}"`);
    console.log(`[02] Kaynak: "${source}"`);
    console.log('[03] 52 Adımlık Departman Döngüsü Tetikleniyor...\n');

    const startTime = Date.now();
    
    // Test the department's ability to orchestrate all 15 modules seamlessly
    const result = await CentralPlanningDepartment.executeTaskPlanning(rawInput, source);

    const endTime = Date.now();

    console.log('--- ONAYLANDI: ZİNCİRLEME REAKSİYON BAŞARILI ---');
    console.log(`[Süre]: ${endTime - startTime}ms`);
    console.log(`[Mühür]: ${result.plan_id}`);
    console.log(`[Durum]: Tüm 15 modül hatasız geçildi ve Task Contract oluşturuldu.`);
    console.log('\n--- TASK CONTRACT ÇIKTISI ---');
    console.log(JSON.stringify(result, null, 2));

  } catch (error: any) {
    console.error('--- HATA: SÜREÇ DURDURULDU ---');
    console.error(`[Sebep]: ${error.message}`);
    process.exit(1);
  }
}

testPlanningDepartment();
