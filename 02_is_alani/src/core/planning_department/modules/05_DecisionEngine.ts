import { aiComplete } from '@/lib/aiProvider';
import { logAudit } from '@/services/auditService';
import { AlternativeStrategy } from './04_AlternativeEngine';
import { RiskAssessment } from './06_RiskEngine';

export interface DecisionReport {
  secilen_id: string;
  gerekce: string;
  risk_onayi: boolean;
}

export class DecisionEngine {
  /**
   * ADIM 5: KARAR MOTORU (Decision Engine)
   * A, B, C rotalarına ve risk skorlarına bakar, nihai rotayı seçer.
   */
  static async selectBest(
    alternatives: AlternativeStrategy[],
    risks: RiskAssessment[]
  ): Promise<DecisionReport> {
    
    // 1. Deterministik Güvenlik Filtresi (Kabul edilmeyenleri ele)
    const acceptableRisks = risks.filter(r => r.kabul_edilebilir === true);
    
    // Eğer hiçbir rota kabul edilebilir değilse, operasyonu iptal et! (Çelik Çekirdek Koruması)
    if (acceptableRisks.length === 0) {
      throw new Error(`Karar Motoru İhlali: Hiçbir alternatif sistem güvenliği onayından geçemedi (Tüm skorlar > 80). Operasyon bloke edildi.`);
    }

    const payload = {
      güvenliRotalar: acceptableRisks.map(r => {
        const alt = alternatives.find(a => a.id === r.alternativeId);
        return {
          id: r.alternativeId,
          isim: alt?.isim,
          skor: r.skor,
          risk: r.risk_maddeleri
        };
      })
    };

    // Yalnızca tek güvenli yol varsa AI'ya sormaya gerek yok, doğrudan tasarruf et (Optimizasyon)
    if (payload.güvenliRotalar.length === 1) {
      return {
        secilen_id: payload.güvenliRotalar[0]!.id,
        gerekce: 'Sistem tarafından kullanılabilir tek güvenli rota olduğu için zorunlu seçildi.',
        risk_onayi: true
      };
    }

    // 2. YARDIMCI ZEKA BAĞLANTISI (Hakem Heyeti)
    const prompt = `
Aşağıdaki güvenli rotalar arasından SİSTEMİN BÜTÜNLÜĞÜNÜ ve hızını en optimum sağlayan 1 tanesini seç.
Sadece aşağıdaki JSON formatında dön:
{
  "secilen_id": "SECİLEN_ID",
  "gerekce": "neden seçildiği kısa açıklaması"
}
ROTALAR: ${JSON.stringify(payload.güvenliRotalar)}
    `;

    try {
      const response = await aiComplete({
        systemPrompt: "Sen, Sistem Karar ve Onay Heyeti yetkilisin. En optimum id'yi seç ve JSON dön.",
        userMessage: prompt,
        temperature: 0.1, 
        jsonMode: true
      });

      if (!response) throw new Error("Yapay Zeka (Ollama/OpenAI) çevrimdışı.");

      let aiDecision: any = {};
      let cleanContent = response.content || '{}';
      if (cleanContent.startsWith('```json')) cleanContent = cleanContent.replace('```json', '').replace('```', '').trim();
      else if (cleanContent.startsWith('```')) cleanContent = cleanContent.replace('```', '').replace('```', '').trim();
      
      aiDecision = JSON.parse(cleanContent);

      // Zekanın seçtiği ID gerçekten elimizdeki güvenli listede var mı? (Halüsinasyon kontrolü)
      const isIdValid = payload.güvenliRotalar.some(r => r.id === aiDecision.secilen_id);

      if (isIdValid && aiDecision.secilen_id) {
        return {
          secilen_id: aiDecision.secilen_id,
          gerekce: aiDecision.gerekce || 'AI Karar Gerekçesi.',
          risk_onayi: true
        };
      } else {
        throw new Error("Yapay zeka geçersiz bir ID seçti veya formata uymadı.");
      }

    } catch (error: any) {
      logAudit({
        operation_type: 'EXECUTE',
        action_description: `[Karar Motoru Fallback] AI çöküşü veya hatalı yanıt: ${error.message}`
      }).catch(() => {});

      // 3. TAM DETERMİNİSTİK FALLBACK 
      // Zeka seçemezse en düşük risk skoruna sahip olanı direkt seçer. (Matematiksel Karar)
      const sortedByRisk = [...payload.güvenliRotalar].sort((a, b) => a.skor - b.skor);
      const safest = sortedByRisk[0];

      return {
        secilen_id: safest!.id,
        gerekce: `Sistem Karar Motoru (Fallback): Yapay zeka devredışı olduğu için matematiksel olarak en düşük risk skoruna (${safest!.skor}) sahip rota seçildi.`,
        risk_onayi: true
      };
    }
  }
}
