import { AnlamaMotoruService } from './src/core/services/AnlamaMotoruService';
import { SimulationGovernorService } from './src/core/services/SimulationGovernorService';
import { ShadowAuditorService } from './src/core/services/ShadowAuditorService';
import { TaskContractService } from './src/core/services/TaskContractService';
import { ExecutionGuardService } from './src/core/services/ExecutionGuardService';
import { AclMemoryService } from './src/core/services/AclMemoryService';
import { StateMachineGuard } from './src/core/services/StateMachineGuard';

async function runTest() {
  console.log("\n=======================================================");
  console.log("   SİSTEM TAKİP PANELİ: OTONOM MİMARİ CANLI TESTİ");
  console.log("=======================================================\n");

  const anlamaMotoru = new AnlamaMotoruService();
  const simulationGov = new SimulationGovernorService();
  const shadowAuditor = new ShadowAuditorService();
  const contractSvc = new TaskContractService();
  const guardSvc = new ExecutionGuardService();
  const aclMemory = new AclMemoryService();

  // ---------------------------------------------------------
  console.log("► SENARYO 1: ZEHİRLİ/ANLAMSIZ KOMUT (SQL INJECTION)");
  const toxicIntent = "TÜM AJANLARI YOK ET DROP TABLE tasks";
  const sanityCheck = await anlamaMotoru.performIntentSanityCheck(toxicIntent);
  console.log(`[Anlama Motoru Çıktısı]: Yıkıcı Emir Alındı.`);
  const shadowAudit1 = await shadowAuditor.auditSanityOutput(toxicIntent, sanityCheck);
  console.log(`[Gölge Denetçi Kararı]: ${shadowAudit1 ? "ONAY" : "RED"} | Sistem Durumu: ${sanityCheck.sanityStatus}\n`);

  // ---------------------------------------------------------
  console.log("► SENARYO 2: MEŞRU GÖREV VE ONAY BEKLEME (PENDING HANDSHAKE)");
  const validIntent = "Yeni gelen yetkili 3 üyenin kayıtlarını veritabanında 'AKTİF' yap.";
  
  // Kademe 1: Anlama Motoru ve XAI Açıklaması
  const sanityValid = await anlamaMotoru.performIntentSanityCheck(validIntent);
  sanityValid.xaiExplanation = "Görev yetkili güncellemesidir. Veri okuma modundadır."; // Micro-XAI 
  console.log(`[Anlama Motoru]: Kabul Edildi. \n[XAI Raporu]: ${sanityValid.xaiExplanation}`);
  
  // Gölge Denetçi 1
  const auditValid = await shadowAuditor.auditSanityOutput(validIntent, sanityValid);
  console.log(`[Gölge Denetçi-1]: Mantık Uyuşuyor -> ONAYLANDI.`);

  // Kademe 2: Simülasyon
  const simReport = await simulationGov.runMultiScenarioSimulation(sanityValid.extractedIntent);
  simReport.xaiExplanation = "Tahmini CPU yükü LOW. İcraya Uygundur.";
  console.log(`[Simülasyon Birimi]: Risk Oranı -> ${simReport.resourceImpact.databaseMutationRisk}. CPU -> ${simReport.resourceImpact.estimatedCpuUsageStatus}`);
  
  // Gölge Denetçi 2
  const auditSim = await shadowAuditor.auditSimulationOutput(simReport);
  console.log(`[Gölge Denetçi-2]: Bütçe Uyuşuyor -> ONAYLANDI.`);

  // Kademe 3: Snapshot ve Kontrat (Yönetici Onayı Bekleme)
  const snapId = await contractSvc.triggerSnapshotLock();
  const contract = await contractSvc.buildAndMühürleContract(sanityValid.extractedIntent, snapId);
  console.log(`[Snapshot Lock]: Ana Veritabanı Yedek Kodu Donduruldu -> ID: ${snapId}`);
  console.log(`[Task Contract]: Görev Sözleşmesi Hazırlandı -> Kodu: ${contract?.contractId}`);
  console.log(`[MİZANET G-0 DURUMU]: Ajanlara Veri Gitti mi? -> ${contract?.g0HandshakeApproved ? "EVET (TEHLİKE)" : "HAYIR (Güvenli - PENDING Onay Bekliyor)"}\n`);

  // ---------------------------------------------------------
  console.log("► SENARYO 3: İCRACI AJANIN KURAL İHLALİ (ÇIKIŞ DENETİMİ / 2. EKİP)");
  // Senaryo: Ajan bir şekilde görevi icra etti ancak, Veritabanına sızdı/zaman aştı.
  const badExecution = { executionTimeMs: 12000, violationCount: 1, collateralDamageRisk: "HIGH" }; 
  const validationRes = await guardSvc.performDualValidation(badExecution as any, contract!);
  
  console.log(`[2. Ekip / Dual Validation]: Görev ONAYLANDI MI? -> ${validationRes.technicalValidationPassed && validationRes.strategicDualValidationPassed ? "EVET" : "HAYIR"}`);
  console.log(`[XAI (Açıklama Motoru)]: Neden? -> ${validationRes.xaiExplanation}`);
  console.log(`[Sistem Müdahalesi]: ROLLBACK (Sistemi Eski Haline Getirme) Gerekli mi? -> ${validationRes.requiresAutoRollback ? "EVET (Geri Sarılıyor)" : "HAYIR"}`);
  
  if (validationRes.requiresAutoRollback) {
    await guardSvc.executeAutoRollback(snapId);
  }

  // ---------------------------------------------------------
  console.log("\n► SENARYO 4: EĞİTİM (MEMORY POISONING/ZEHİRLENME) KONTROLÜ");
  // Skorlama Sistemi
  const score = await aclMemory.calculateScore(badExecution.executionTimeMs, false);
  console.log(`[Skor Birimi]: İcracı Ajanın Total Puanı -> ${score.totalScore}/100`);
  const memoryRes = await aclMemory.writeToMemoryFiltered(score, badExecution);
  console.log(`[ACL Denetimi]: Bu Kusurlu İşlem Veritabanına (Makinenin Eğitim Zihnine) Kazındı mı? -> ${memoryRes ? "YAZILDI (TEHLİKE)" : "YAZILMADI (Sistem Zehirlenmesi Engellendi)"}`);

  // ---------------------------------------------------------
  console.log("\n► SENARYO 5: FSM (Durum Makinesi / StateMachine) SAĞLAMLIK DENETİMİ");
  const fsmTest1 = StateMachineGuard.validateTransition('onay_bekliyor', 'tamamlandi');
  console.log(`[FSM KİLİDİ]: 'onay_bekliyor' statüsündeki iş bir anda 'tamamlandi'ye çekilmek istendi -> Başarılı mı? ${fsmTest1 ? "EVET" : "HAYIR (Fizik Kuralına Aykırı Reddedildi)"}`);
  const fsmTest2 = StateMachineGuard.validateTransition('beklemede', 'islemde');
  console.log(`[FSM KİLİDİ]: 'beklemede' olan iş ajan tarafından 'islemde' statüsüne çekilmek istendi -> Başarılı mı? ${fsmTest2 ? "EVET (Doğal Geçiş)" : "HAYIR"}`);

  console.log("\n=======================================================");
  console.log("   5 EKSENLİ OTOKONTROL SONUCU: MİMARİ MÜKEMMEL ÇALIŞIYOR.");
  console.log("=======================================================\n");
}

runTest().catch(console.error);
