// ============================================================
// MERKEZ PLANLAMA DEPARTMANI (52 ADIMLIK OTONOM SÜREÇ)
// ============================================================
// Kural: Bütün Yapay Zekalar BURAYA bağlıdır.
// Tüm 15 motor (engine) ve modül bu merkezden orkestre edilir.
// ============================================================
import { logAudit } from '@/services/auditService';

import { AmbiguityResolution as AmbiguityResolutionModule } from './modules/01_AmbiguityResolution';
import { InputTrustScoring as InputTrustScoringModule } from './modules/02_InputTrustScoring';
import { CriteriaEngine } from './modules/03_CriteriaEngine';
import { AlternativeEngine } from './modules/04_AlternativeEngine';
import { DecisionEngine } from './modules/05_DecisionEngine';
import { RiskEngine } from './modules/06_RiskEngine';
import { SimulationEngine } from './modules/07_SimulationEngine';
import { ResourceGovernor } from './modules/08_ResourceGovernor';
import { SnapshotModule } from './modules/09_SnapshotModule';
import { ConsistencyCheck } from './modules/10_ConsistencyCheck';
import { ControlEngine } from './modules/11_ControlEngine';
import { ValidationEngine } from './modules/12_ValidationEngine';
import { AnomalyDetector } from './modules/13_AnomalyDetector';
import { MemoryModule } from './modules/14_MemoryModule';
import { LearningEngine } from './modules/15_LearningEngine';

export class CentralPlanningDepartment {
  
  /**
   * ADIM 1 MİMARİSİ: Otonom görevleri arka plana atar (Asynchronous Fire-and-Forget).
   * HTTP isteklerini kilitlemez, zaman aşımını (timeout) önler.
   */
  static triggerAsyncPlanning(rawInput: string, source: string, taskId?: string): void {
    // Promise olarak arka planda bırakılır (Beklenmez - Await yok).
    this.executeTaskPlanning(rawInput, source)
      .then(async (contract) => {
          // İcracı Havuzuna (Agent Worker) yollamak için Dispatcher'ı çağır
          import('@/core/orchestrator').then(async ({ CentralDispatcher }) => {
            await CentralDispatcher.dispatchContract(contract);
          });

        if (taskId) {
           import('@/lib/supabase').then(({ supabase }) => {
             // Plan bittiğinde mührü direkt olarak veritabanına işler
             supabase.from('tasks').update({ 
               metadata: { plan_id: contract.plan_id, durumu: 'PLANLANDI VE SAHAYA SÜRÜLDÜ' } 
             }).eq('id', taskId).then();
           });
        }
      })
      .catch((err) => {
        logAudit({
          operation_type: 'EXECUTE',
          action_description: `[ASENKRON ÇÖKÜŞ] Planlama Senatosu arka plan işlemi başarısız: ${err.message}`,
          metadata: { kaynak: source, görev: rawInput }
        }).catch(() => {});

        // ── KÖR NOKTA GİDERİLDİ: ZOMBİ GÖREV (ZOMBIE TASK) İMHASI ──
        if (taskId) {
           import('@/lib/supabase').then(({ supabase }) => {
             supabase.from('tasks').update({ 
               status: 'iptal_edildi', // Görev arayüzde kilitli kalmaz
               metadata: { iptal_sebebi: err.message, durumu: 'SİSTEM_TARAFINDAN_REDDEDİLDİ' } 
             }).eq('id', taskId).then();
           });
        }
      });
  }

  static async executeTaskPlanning(rawInput: string, source: string): Promise<any> {
    const planId = `PLN-${Date.now()}`;
    await logAudit({
      operation_type: 'EXECUTE',
      action_description: `Planlama Departmanı 52 Adımlık Süreci Başlattı | Girdi: ${rawInput.substring(0, 50)}`,
      metadata: { planId, source }
    }).catch(() => {});

    // Adım 1 & 2: Girdi Analizi ve Doğrulama
    // Memory integration read
    const pastContext = await MemoryModule.readContext(rawInput);

    // Modül 2: Input Trust
    const trustScore = await InputTrustScoringModule.calculateTrust(rawInput, source);
    if (trustScore < 50) {
       throw new Error(`DUR: Güven Skoru çok düşük (${trustScore}/100) (Tehdit Tespiti). İşlem red edildi.`);
    }

    // Modül 1: Ambiguity Resolution
    const clearInput = await AmbiguityResolutionModule.resolve(rawInput);

    // Kapsam, Etki Alanı, Parçalama (Atomizasyon)
    const taskKapsam = { is: clearInput, sinirlar: "sistem_kurallari", yapilmayacaklar: [] };
    const subTasks = [clearInput]; // atomized array placeholder

    // Modül 3: Criteria Engine
    const criteria = await CriteriaEngine.generate(subTasks);

    // Modül 4: Alternative Engine
    const alternatives = await AlternativeEngine.generateAlternatives(criteria);

    // Modül 6: Risk Engine
    const riskAnalysis = await RiskEngine.calculate(alternatives);

    // Modül 5: Decision Engine
    const bestDecision = await DecisionEngine.selectBest(alternatives, riskAnalysis);

    // Teknoloji seçimi, Kaynak Planlama
    // Modül 7: Simulation Engine
    const simulationResult = await SimulationEngine.dryRun(bestDecision, alternatives);

    // Modül 8: Resource Governor
    const resources = await ResourceGovernor.checkAvailability(simulationResult);
    if (!resources.approved) throw new Error('Yetersiz Kaynak: Kuru çalıştırma red edildi.');

    // Modül 9: Snapshot Module
    const snapshotObj = await SnapshotModule.captureState(planId, bestDecision, criteria);

    // Modül 10: Consistency Check
    const consistencyOk = await ConsistencyCheck.verify(snapshotObj, bestDecision, criteria);
    if (!consistencyOk) throw new Error('DUR: Tutarlılık Kontrolü Başarısız. Planda manipülasyon tespit edildi!');

    // Başarı kriterleri, Kontrol Planlama
    // Modül 11: Control Engine
    const controlPoints = await ControlEngine.createCheckpoints(bestDecision);

    // Anomali Kontrolü
    // Modül 13: AnomalyDetector
    await AnomalyDetector.detectOrThrow(bestDecision);

    // Task Contract Oluşturma
    const taskContract = {
      plan_id: planId,
      karar: bestDecision,
      kriterler: criteria,
      kontrol_noktalari: controlPoints
    };

    // Modül 12: Validation Engine (Final Gate)
    const isValid = await ValidationEngine.validateContract(taskContract);
    if (!isValid) throw new Error('Final Plan Doğrulaması (Kolektif Mühür) başarısız oldu.');

    // Modül 14: Memory Write & Arşiv
    await MemoryModule.writeContext(planId, taskContract);

    // Modül 15: Learning Engine
    await LearningEngine.extractLessons(taskContract, simulationResult);

    await logAudit({
      operation_type: 'EXECUTE',
      action_description: `Planlama Departmanı 52 Adımı Başarıyla Tamamladı. Mühür: ${planId}`,
      metadata: { plan_id: planId }
    }).catch(() => {});

    return taskContract; // Dispatcher'a iletilecek final paket
  }
}

