import * as crypto from 'crypto';
import { logAudit } from '@/services/auditService';
import { PlanSnapshot } from './09_SnapshotModule';

export class ConsistencyCheck {
  /**
   * ADIM 10: TUTARLILIK SINAĞI (Consistency Check)
   * Pipeline'ın son noktalarına gelinirken, "Karar" veya "Kriterlerde" bir değişiklik
   * (örneğin araya sızan kötü niyetli bir prompt veya hatalı hafıza okuması) olup olmadığını 
   * doğrulamak için son bir kez kriptografik kontrol yapar.
   */
  static async verify(snapshot: PlanSnapshot, bestDecision: any, criteria: any): Promise<boolean> {
    try {
      if (!snapshot || !snapshot.cryptographicHash) {
        throw new Error("Mühür bulunamadı.");
      }

      // Verileri yeniden hesapla
      const currentPayloadString = JSON.stringify({ bestDecision, criteria });
      const currentHash = crypto.createHash('sha256').update(currentPayloadString).digest('hex');

      // Doğrulama!
      if (currentHash !== snapshot.cryptographicHash) {
        await logAudit({
          operation_type: 'VALIDATE',
          action_description: `[KRİTİK İHLAL] Tutarlılık kontrolü başarısız oldu! Snapshot Hash: ${snapshot.cryptographicHash} !== Current: ${currentHash}`,
          error_severity: 'FATAL',
          status: 'basarisiz'
        }).catch(() => {});
        
        return false;
      }

      return true;

    } catch (e: any) {
      logAudit({
        operation_type: 'VALIDATE',
        action_description: `[Tutarlılık Hatası] Kontrol esnasında arıza: ${e.message}`,
        error_severity: 'ERROR',
        status: 'basarisiz'
      }).catch(() => {});
      
      // Hata durumunda fail-secure: Doğrulanmamış şey kabul edilemez.
      return false;
    }
  }
}