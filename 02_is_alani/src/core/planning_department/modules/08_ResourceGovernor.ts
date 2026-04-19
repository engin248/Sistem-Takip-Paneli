import { supabase } from '@/lib/supabase';
import { logAudit } from '@/services/auditService';

export class ResourceGovernor {
  /**
   * En iyi kullanım (Best Practice): Gerçek donanım CPU'sunu okumak yerine;
   * 1. Supabase'deki anlık "Aktif İş Yükünü" (Concurrency) okur.
   * 2. Simülasyonun çıkaracağı tahmini Token (API Bütçesi) boyutuna bakar.
   */
  static async checkAvailability(simulationResult: any) {
    try {
      // 1. Kural: Sistemde aynı anda en fazla 15 aktif görev olabilir. (Veritabanı şişkinliğini önlemek)
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['IN_PROGRESS', 'PENDING_PROCESSING']);

      if (error) {
        throw new Error('Aktif görev sayısı okunamadı.');
      }

      const activeTasks = count || 0;
      const MAX_CONCURRENT_TASKS = 15;

      if (activeTasks >= MAX_CONCURRENT_TASKS) {
        await logAudit({
          operation_type: 'EXECUTE',
          action_description: `[ResourceGovernor] Trafik sıkışıklığı. Limit: ${MAX_CONCURRENT_TASKS}, Aktif: ${activeTasks}`,
          metadata: { durumu: 'RED' }
        }).catch(()=> {});

        return { 
          approved: false, 
          reason: `Ağır Yük: Şu an otonom ağda ${activeTasks} aktif görev işleniyor. Lütfen birkaç dakika sonra tekrar deneyin.` 
        };
      }

      // 2. Kural: Simülasyonun maliyeti, ayrılan bütçeyi aşıyor mu? (Token Koruması)
      // (Örneğin simulationResult.estimatedTokens 4000'den büyükse reddedilir)
      const estimatedCost = simulationResult?.estimatedTokens || 1000;
      const MAX_ALLOWED_TOKENS = 8000; // Tek bir otonom operasyon için feda edilebilecek max bütçe

      if (estimatedCost > MAX_ALLOWED_TOKENS) {
        return {
          approved: false,
          reason: `Bütçe Aşımı: Bu plan çok büyük (${estimatedCost} Token). Sistemi korumak için reddedildi. Lütfen görevi daha küçük parçalara bölerek iletin.`
        };
      }

      // Her şey tamamsa ONAY verir.
      return { approved: true, activeTasks, estimatedCost };
    } catch (e: any) {
      // Acil durumlarda (Supabase geçici ulaşılamazsa) sistemi kilitlememek için onay vererek devam eder.
      return { approved: true, reason: 'Fail-safe mod: Kaynak kontrolü yapılamadı, ancak operasyon serbest bırakıldı.' };
    }
  }
}