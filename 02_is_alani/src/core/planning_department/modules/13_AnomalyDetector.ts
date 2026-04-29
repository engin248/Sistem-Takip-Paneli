import { logAudit } from '@/services/auditService';

export class AnomalyDetector {
  /**
   * ADIM 13: ANOMALİ DETEKTÖRÜ
   * Planlama paketine sızmış olabilecek yıkıcı, yok edici, standart-dışı veya aşırı riskli 
   * komut yapılarını "Desenlizer" (Pattern Match) mantığıyla yakalar ve bloke eder.
   */
  static async detectOrThrow(bestDecision: any): Promise<void> {
    const payload = JSON.stringify(bestDecision).toLowerCase();
    
    // Tehlikeli desenler sözlüğü (Katı Çelik Kurallar)
    const blacklistedPatterns = [
      'drop table', 
      'delete from', 
      'truncate', 
      'rm -rf', 
      'bypass rls', 
      'format c:'
    ];

    for (const pattern of blacklistedPatterns) {
      if (payload.includes(pattern)) {
        await logAudit({
          operation_type: 'VALIDATE',
          action_description: `[ANOMALİ TESPİTİ] Yıkıcı desen algılandı: '${pattern}'. Tüm operasyon İmha Edildi!`,
          error_severity: 'FATAL',
          metadata: { karar_id: bestDecision.secilen_id }
        }).catch(() => {});

        throw new Error(`Kritik Sistem Savunması: '${pattern}' içeren yıkıcı komutlar Otonom Ağa alınamaz.`);
      }
    }
  }
}
