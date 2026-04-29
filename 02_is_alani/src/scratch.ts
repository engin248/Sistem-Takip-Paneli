import { ControlEngine } from './core/planning_department/modules/11_ControlEngine';
import { ValidationEngine } from './core/planning_department/modules/12_ValidationEngine';
import { AnomalyDetector } from './core/planning_department/modules/13_AnomalyDetector';

async function verifyAllEnd() {
  const fakeDecision = { secilen_id: 'A_HIZLI', gerekce: 'Test', risk_onayi: true, temel_adimlar: ['1','2','3'] };

  console.log("-> 1. Anomali Kontrolu (Zararsiz Komut)...");
  await AnomalyDetector.detectOrThrow(fakeDecision);
  console.log("Durum: TEMIZ");

  console.log("\n-> 2. Kontrol Noktalari Olusturuluyor (Chk Points)...");
  const chk = await ControlEngine.createCheckpoints(fakeDecision);
  console.log("Checkpoints Uzunluk:", chk.length);

  const fakeContract = {
    plan_id: 'PLN-123',
    karar: fakeDecision,
    kriterler: {},
    kontrol_noktalari: chk
  };

  console.log("\n-> 3. Sozlesme Nihai Validasyon Testi...");
  const isOk = await ValidationEngine.validateContract(fakeContract);
  console.log("Sözleşme Durumu: ", isOk ? "MÜHÜRLENDI VE ONAYLANDI" : "REDDEDILDI!");
}

verifyAllEnd().catch(console.error).then(() => process.exit(0));
