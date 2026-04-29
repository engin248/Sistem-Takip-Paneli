import { logAudit } from '@/services/auditService';

export class ValidationEngine {
  /**
   * ADIM 12: SON GEÇİT (Validation Engine)
   * 11 modülün ürettiği tüm JSON paketlerinin "Task Contract" (Görev Sözleşmesi) isimli 
   * nihai nesnede eksiksiz olup olmadığını denetler. Eksik varsa (Örn: Kontrol noktası boşsa) 
   * planlamayı yok eder.
   */
  static async validateContract(contract: any): Promise<boolean> {
    try {
      const requiredKeys = ['plan_id', 'karar', 'kriterler', 'kontrol_noktalari'];
      
      for (const key of requiredKeys) {
        if (!contract[key]) {
          await logAudit({
            operation_type: 'VALIDATE',
            action_description: `[İhlal] Otonom Sözleşmede Eksik Alan: ${key}`,
            error_severity: 'FATAL'
          }).catch(() => {});
          return false;
        }
      }

      if (!Array.isArray(contract.kontrol_noktalari) || contract.kontrol_noktalari.length === 0) {
        return false;
      }

      // Checkpoints içindeki yapısal kilitler
      for (const chk of contract.kontrol_noktalari) {
        if (!chk.id || typeof chk.tamamlandi !== 'boolean') {
          return false;
        }
      }

      // Başarılı Mühür
      return true;

    } catch (error) {
      return false;
    }
  }
}