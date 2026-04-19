import { aiComplete } from '@/lib/aiProvider';
import { logAudit } from '@/services/auditService';
import { AlternativeStrategy } from './04_AlternativeEngine';

export interface RiskAssessment {
  alternativeId: string;
  skor: number; // 0-100 (Yüksek değer = Daha tehlikeli)
  risk_maddeleri: string[];
  kabul_edilebilir: boolean;
}

export class RiskEngine {
  /**
   * ADIM 6: RİSK MOTORU
   * Her bir alternatif rotanın sistem üzerinde yaratabileceği tahribatı ve maliyeti ölçer.
   */
  static async calculate(alternatives: AlternativeStrategy[]): Promise<RiskAssessment[]> {
    // 1. Deterministik Güvenlik (Çelik Çekirdek)
    if (!Array.isArray(alternatives) || alternatives.length === 0) {
      throw new Error("Risk Motoru Hatası: Değerlendirilecek alternatif strateji bulunamadı.");
    }

    const payloadString = JSON.stringify(alternatives);

    // 2. YARDIMCI ZEKA BAĞLANTISI (Risk Analizcisi)
    const prompt = `
Aşağıdaki alternatif görev stratejilerini risk açısından değerlendir.
Her id için 0-100 arası (100 çok riskli) bir 'skor', risk_maddeleri ve kabul_edilebilir (skor < 80 ise true) durumunu json dön.
Sadece şu JSON array yapısını döndür:
[
  { "alternativeId": "ID", "skor": 45, "risk_maddeleri": ["m1"], "kabul_edilebilir": true }
]
ALTERNATİFLER: ${payloadString}
    `;

    try {
      const response = await aiComplete({
        systemPrompt: "Sen bir Sistem Güvenliği ve Risk Analiz mühendisisin. Mutlaka JSON arayüzü ile dön.",
        userMessage: prompt,
        temperature: 0.1, // Düşük sıcaklık -> Yüksek tutarlılık
        jsonMode: true
      });

      if (!response) {
        throw new Error("Yapay Zeka (Ollama/OpenAI) çevrimdışı. Risk analizi yapılamıyor.");
      }

      let aiRisks: RiskAssessment[] = [];
      try {
        let cleanContent = response.content || '[]';
        // Markdown JSON strip
        if (cleanContent.startsWith('```json')) cleanContent = cleanContent.replace('```json', '').replace('```', '').trim();
        else if (cleanContent.startsWith('```')) cleanContent = cleanContent.replace('```', '').replace('```', '').trim();
        aiRisks = JSON.parse(cleanContent);
      } catch (e) {
        aiRisks = [];
      }

      // Zeka tüm ID'lere cevap vermemiş olabilir! Eksikleri kapat veya komple bozuksa fallback at:
      let mappedRisks = alternatives.map(alt => {
        const found = aiRisks.find(r => r.alternativeId === alt.id);
        if (found && typeof found.skor === 'number') {
           // AI skor buldu, ama güvenlik sınırını (80) biz deterministik olarak eziyoruz:
           const gercekKabul = found.skor < 80;
           return {
             alternativeId: alt.id,
             skor: found.skor,
             risk_maddeleri: found.risk_maddeleri || ["Bilinmeyen risk"],
             kabul_edilebilir: gercekKabul // AI true dese bile 80 üstüyse ez!
           };
        }
        // AI o alternatif için hiçbir şey demediyse, ya da komple fail olduysa:
        const defScore = alt.id === 'S_STANDART' ? 10 : 60; // Standart yol güvenlidir, diğerleri varsayılan 60 
        return {
          alternativeId: alt.id,
          skor: defScore,
          risk_maddeleri: alt.id === 'S_STANDART' ? ["Standart onaylanmış süreç"] : ["Otomatik Risk Ataması (AI offline)"],
          kabul_edilebilir: defScore < 80
        };
      });

      return mappedRisks;

    } catch (error: any) {
      logAudit({
        operation_type: 'EXECUTE',
        action_description: `[Risk Motoru Hatası] Offline düşüş: ${error.message}`
      }).catch(() => {});

      // 3. TAM DETERMİNİSTİK FALLBACK 
      // Eğer zeka tamamen kopuksa veya üst throw çalıştıysa buraya düşer. Her rotaya manuel güvenlik atanır.
      return alternatives.map(alt => {
        let sc = 50;
        if(alt.id.includes('GUVENLI') || alt.id.includes('STANDART')) sc = 10;
        if(alt.id.includes('HIZLI')) sc = 60;
        return {
          alternativeId: alt.id,
          skor: sc,
          risk_maddeleri: ["Sistem Çelik Çekirdeği tarafından atanmış defansif risk tahmini."],
          kabul_edilebilir: true // Deterministik 60 ve 10 hep kabul edilebilir kalır
        };
      });
    }
  }
}
