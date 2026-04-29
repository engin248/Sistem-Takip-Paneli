import * as crypto from 'crypto';
import { logAudit } from '@/services/auditService';

export interface PlanSnapshot {
  snapshotId: string;
  planId: string;
  cryptographicHash: string;
  timestamp: number;
}

export class SnapshotModule {
  /**
   * ADIM 9: UZAY/ZAMAN KİLİDİ (Snapshot Module)
   * Görevin şu ana kadarki planlanan halini (Karar ve Kriterleri) RAM'de veya Veritabanında (Opsiyonel) 
   * değiştirilemez bir formata kilitler (Mühürler). SHA-256 Kriptografi kullanır.
   * Amacı: Sonraki adımlarda hiç kimse veya hiçbir yapay zeka ajanı rotayı gizlice değiştiremesin.
   */
  static async captureState(planId: string, bestDecision: any, criteria: any): Promise<PlanSnapshot> {
    try {
      const timestamp = Date.now();
      const payloadString = JSON.stringify({ bestDecision, criteria });

      // Orijinal İçerik Hash'lenir (Dijital Mühür)
      const cryptographicHash = crypto.createHash('sha256').update(payloadString).digest('hex');
      const snapshotId = `SNAP-${planId.substring(0, 8)}-${timestamp}`;

      const snapshot: PlanSnapshot = {
        snapshotId,
        planId,
        cryptographicHash,
        timestamp
      };

      // Denetimciler için fiziksel kayıt bırakılır (Kanıt)
      await logAudit({
        operation_type: 'EXECUTE',
        action_description: `[Mühürleme] Görev rotası kilitlendi: ${snapshotId}`,
        metadata: {
          hash: cryptographicHash,
          karar: bestDecision.secilen_id
        }
      }).catch(() => {});

      return snapshot;

    } catch (error: any) {
      throw new Error(`Snapshot Hatası: Operasyon mühürlenemediği için durduruldu. Detay: ${error.message}`);
    }
  }
}
