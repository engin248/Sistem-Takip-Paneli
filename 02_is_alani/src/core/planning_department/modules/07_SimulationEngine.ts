import { DecisionReport } from './05_DecisionEngine';
import { AlternativeStrategy } from './04_AlternativeEngine';
import { logAudit } from '@/services/auditService';

export interface SimulationResult {
  simulated_success: boolean;
  estimatedTokens: number;
  timeToCompleteMs: number;
  warnings: string[];
}

export class SimulationEngine {
  /**
   * ADIM 7: SİMÜLASYON MOTORU
   * Karar motorundan gelen rotayı sanal olarak çalıştırıp ne kadar sistem kaynağı 
   * çekeceğini (Token/CPU süresi vb.) deterministik olarak ölçer. Gerçek bir AI atışı yapılmaz, 
   * bu adım tamamen deterministik güvenlik içindir.
   */
  static async dryRun(
    decision: DecisionReport, 
    alternatives: AlternativeStrategy[]
  ): Promise<SimulationResult> {
    
    try {
      const chosenPath = alternatives.find(a => a.id === decision.secilen_id);
      
      if (!chosenPath) {
        throw new Error("Simülasyon Çöküşü: Karar verilen id, alternatifler arasında bulunamadı.");
      }

      // Adım sayısına ve içeriğine göre deterministik fatura çıkarılır (Çelik Çekirdek Kuralları)
      const stepCount = chosenPath.temel_adimlar?.length || 1;
      
      // Tahmini Token: Her adım için kabaca 800 token harcanacağı varsayılır (Gidiş-Dönüş + Context)
      let calculatedTokens = stepCount * 800;

      // Risk faktörü: Eğer karar standart yoldan farklıysa biraz yedek eklenir
      if (chosenPath.id !== 'S_STANDART') {
        calculatedTokens += 1500; 
      }

      // Süre Tahmini: Her adım için ajanların bekleme/yazma/okuma süresi ortalama 4500ms
      let calcDurationMs = stepCount * 4500;

      let warnings: string[] = [];
      if (calculatedTokens > 6000) {
        warnings.push("Yüksek Token Tüketimi Uyarısı (6K+)");
      }
      if (stepCount > 5) {
        warnings.push("Büyük Çaplı Operasyon (5+ Adım) tespit edildi, yavaşlama olabilir.");
      }

      return {
        simulated_success: true,
        estimatedTokens: calculatedTokens,
        timeToCompleteMs: calcDurationMs,
        warnings
      };

    } catch (e: any) {
      logAudit({
        operation_type: 'EXECUTE',
        action_description: `[Simülasyon Motoru Hatası] Dry-Run yapılamadı: ${e.message}`
      }).catch(() => {});

      // Fallback: Çökerse maksimum güvenlik tarifesinden faturalandırır.
      return {
        simulated_success: true,
        estimatedTokens: 7500, // Varsayılan ağır maliyet (ResourceGoverner bunu yakalayabilir)
        timeToCompleteMs: 20000,
        warnings: ["DİKKAT: Fallback simülasyon faturası. Gerçek kaynak ölçülemediği için tavan değer atandı."]
      };
    }
  }
}
