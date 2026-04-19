import { logAudit } from '@/services/auditService';

export class LearningEngine {
  /**
   * ADIM 15: ÖĞRENME MOTORU (Learning Engine)
   * Sistemi sürekli eğitmek için (RLHF & Kendi Kendine Öğrenme), reddedilen veya 
   * seçilen yolların "Neden Seçildiği" bilgisini bir meta veri (Lesson) olarak çıkartır.
   * Supabase üzerindeki bir yapay zeka modeline veya Vektör DB'ye girdi sağlar.
   */
  static async extractLessons(taskContract: any, simulationResult: any): Promise<void> {
    try {
      const lesson = {
        karar_id: taskContract?.karar?.secilen_id || 'Bilinmiyor',
        harcanacak_maliyet: simulationResult?.estimatedTokens || 0,
        cikarilan_ders: "Plan başarıyla otonom ağa iletildiği için standart davranış olarak kabul edildi."
      };

      await logAudit({
        operation_type: 'EXECUTE',
        action_description: `[Makine Öğrenimi] Görev varyasyon dersi kaydedildi.`,
        metadata: lesson
      }).catch(() => {});
    } catch (e) {
      // Çökerse engellemez.
    }
  }
}
