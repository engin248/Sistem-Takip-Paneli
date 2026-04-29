import { logAudit } from '@/services/auditService';

export class MemoryModule {
  /**
   * ADIM 14: HAFIZA VE ARŞİV (Memory Write)
   * Bir plan başarılı veya başarısız olsun, bağlamı ve plan kimliğini (planId)
   * Vektörel Dizin veya Log tablosuna bırakır.
   */
  static async readContext(rawInput: string): Promise<any> {
    // Gelecekte pgvector eklendiğinde buradan okunur, şimdilik statik döner.
    return { status: 'hafiza_sistemi_aktif', related_past_tasks: [] };
  }

  static async writeContext(planId: string, taskContract: any): Promise<void> {
    try {
      await logAudit({
        operation_type: 'EXECUTE',
        action_description: `[Arşiv] Görev Sözleşmesi hafızaya yazıldı`,
        metadata: {
          planId: planId,
          contractLength: JSON.stringify(taskContract).length
        }
      }).catch(() => {});
    } catch (e) {
      // Memory çökmesi sistemi boşa iptal etmemeli.
    }
  }
}
