import { IntentAnalysis, SimulationReport } from '../types/architecture';

export class ShadowAuditorService {
  /**
   * KURAL: Hiçbir birim kendi başarısını raporlayamaz.
   * GÖLGE DENETİM 1: Görev Kabul Birimi ("Ben anladım" dedi). 
   * Denetçi ham veri ile çıkan analizi çapraz sorgular.
   */
  public async auditSanityOutput(rawInput: string, analysis: IntentAnalysis): Promise<boolean> {
    if (!analysis.isSane) return true; // Birim zaten Red vermiş, sorun yok.
    
    // Güvenlik: Eğer birim boş sonuç çıkarıp "Güvenli" (True) demişse ajan halüsinasyonudur!
    if (!analysis.extractedIntent || analysis.extractedIntent.trim() === '') {
      console.warn("[SHADOW-AUDIT ALERT] Anlama Motoru 'Güvenli (İşleme Al)' Dedi Ama Çıkarılan Emri YOK!");
      return false; // Sistemi kilitler.
    }
    
    return true; // Gölge Denetçi Onayı.
  }

  /**
   * GÖLGE DENETİM 2: Simülasyon ve Maliyet Yönetimi
   * Simülasyon Birimi ("Bütçe uygun" dedi).
   * Denetçi, limit parametreleriyle sunulan kararı çaprazlar.
   */
  public async auditSimulationOutput(report: SimulationReport): Promise<boolean> {
    if (!report.isSafeToProceed) return true; // Red vermişse sorun yok.
    
    // Güvenlik: Simülasyon birimi "Güvenli (İşleme Al)" deyip, arka planda CATASTROPHIC veri atamışsa!
    if (report.resourceImpact.databaseMutationRisk === "CATASTROPHIC" || report.resourceImpact.estimatedCpuUsageStatus === "CRITICAL") {
      console.warn("[SHADOW-AUDIT ALERT] Simülasyon Birimi 'Güvenli' Onayı Uydurmuş Ancak Risk Çok Yüksek!");
      return false; // Simülasyon Yalanı Tespit Edildi, Sistem Kilitlenir.
    }

    return true; // Gölge Denetçi Onayı.
  }
}
