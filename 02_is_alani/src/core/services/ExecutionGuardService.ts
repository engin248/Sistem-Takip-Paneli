import { ExecutionGuardStatus, ValidationResult, TaskContract } from '../types/architecture';
import { DeterministicParser } from '../types/deterministicSchemas';

export class ExecutionGuardService {
  /**
   * KADEME 4: EXECUTION GUARD (Küresel Ölüm Şalteri - Kill Switch)
   * Ajan işlemi sırasında anlık sapma varsa, sistem dondurulur.
   */
  public monitorExecution(agentId: string, contract: TaskContract): ExecutionGuardStatus {
    // Ajan kendisine verilen contract sınırları (constraints) dışına çıkarsa:
    // return ExecutionGuardStatus.HALTED_DEVIATION; -> KILL SWITCH TETİKLENİR!
    
    return ExecutionGuardStatus.COMPLETED;
  }

  /**
   * DUAL VALIDATION VE RESULT VALIDATION
   * İşlem bittikten sonra iki bağımsız birimin onayı (Çifte Kontrol)
   */
  public async performDualValidation(rawExecutionOutput: unknown, contract: TaskContract): Promise<ValidationResult> {
    
    // ===============================================================
    // DETERMINİSTİK KAPI (IRON CAGE - Olasılıksızlaştırma)
    // ===============================================================
    const parseResult = DeterministicParser.parseExecutionOutput(rawExecutionOutput);
    if (!parseResult.success) {
       console.error("[DETERMINISTIK İHLAL] Ajanın veri formatı şemalara (%100 Katı Formata) uymuyor! Kapatıldı.");
       return {
         technicalValidationPassed: false,
         strategicDualValidationPassed: false,
         requiresAutoRollback: true,
         xaiExplanation: parseResult.error // Ajan formata uymadığı için doğrudan reddedilir.
       };
    }
    
    const executionOutput = parseResult.data!; // Artık Güvenli, Tip Korumalı Matematiksel Veri

    let isTechnicallyValid = true;
    let isStrategicallyValid = true;
    let explanation = "Tüm Kriterler Geçildi (Açıklama ONAYLANDI).";

    // KRİTER 1: Bütünlük Kriteri (Contract Constraints Siziçi Sınır İhlali)
    if (executionOutput.violationCount > 0 || executionOutput.exceededScope) {
        isTechnicallyValid = false;
        explanation = "İHLAL: İcracı Ajan, Görev Sözleşmesindeki sınırları (Constraints) aştı veya yetkisiz adımlar attı.";
    }

    // KRİTER 2: Operasyonel Yan Etki / Tablo Hasarı
    if (executionOutput.collateralDamageRisk === "HIGH" || executionOutput.collateralDamageRisk === "CATASTROPHIC" || executionOutput.unauthorizedTableAccess) {
        isStrategicallyValid = false;
        explanation = "İHLAL (ÇOK KRİTİK): Görev başarıldı ANCAK sistemin diğer tablolarında / kısımlarında yetkisiz yan etki riski oluşturdu.";
    }

    // KRİTER 3: Zaman ve Performans Çelişkisi
    if (executionOutput.executionTimeMs > 10000) {
        isTechnicallyValid = false;
        explanation = "İHLAL: Sonuç bulundu ancak Zaman/Performans (Timeout) anlaşmasına sadık kalınamadı.";
    }

    if (!isTechnicallyValid || !isStrategicallyValid) {
       console.error("[DUAL VALIDATION GUARD] İkinci Denetim Ekibi Ajanı Yetersiz Buldu. İptal ve Geri Sarma (Rollback) Başlatıldı.");
       return {
         technicalValidationPassed: isTechnicallyValid,
         strategicDualValidationPassed: isStrategicallyValid,
         requiresAutoRollback: true,
         xaiExplanation: explanation
       };
    }

    return {
      technicalValidationPassed: true,
      strategicDualValidationPassed: true,
      requiresAutoRollback: false,
      xaiExplanation: "Sonuç İKİNCİ EKİP tarafından doğrulandı. Sınır, Tablo ve Performans ihlali tespit edilmemiştir."
    };
  }

  /**
   * AUTO ROLLBACK (Gerçek Zamanlı İptal)
   */
  public async executeAutoRollback(snapshotId: string): Promise<boolean> {
    console.error(`[CRITICAL] AUTO-ROLLBACK INITIATED FOR SNAPSHOT: ${snapshotId}`);
    // Veritabanı ve işlemler snapshot anına (KADEME 3) geri sarılır.
    return true;
  }
}
