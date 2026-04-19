import { aiComplete } from '@/lib/aiProvider';
import { logAudit } from '@/services/auditService';

export class CriteriaEngine {
  /**
   * ADIM 3: KRİTER VE BAŞARI ÖLÇÜTÜ MOTORU
   * Gelen görevler için zorunlu kalite, güvenlik ve başarı metriklerini çıkartır.
   */
  static async generate(subTasks: any[]) {
    // 1. DETERMİNİSTİK TABAN KRİTERLERİ (Asla Atlanamaz)
    const baseCriteria = [
      "Veritabanı manipülasyonu varsa, RLS politikasının kontrolü zorunludur.",
      "İşlem sonrası hata logları (Audit Trail) bırakmak zorunludur."
    ];

    if (!subTasks || subTasks.length === 0) {
      throw new Error("Kriter Motoru Hatası: İşlenecek görev bulunamadı.");
    }

    const taskExtracts = subTasks.map(t => typeof t === 'string' ? t : JSON.stringify(t)).join(' | ');

    // 2. YARDIMCI ZEKA (Göreve Özel Kriter Sentezi)
    const prompt = `
Aşağıdaki görevi incele ve sistem kalite standartlarına uygun olması için teknik ve operasyonel başarı kriterleri oluştur.
Sadece JSON dön:
{
  "teknik_kriterler": ["Şifreleme yapılmalı", "Yükleme süresi x altında olmalı" vb.],
  "operasyonel_kriterler": ["Onay alınmalı" vb.]
}
GÖREV: "${taskExtracts}"
    `;

    try {
      const response = await aiComplete({
        systemPrompt: "Sen bir Kalite Kontrol ve Kriter belirleme mühendisisin. Sadece json dön.",
        userMessage: prompt,
        temperature: 0.1,
        jsonMode: true
      });

      if (!response) {
        throw new Error('Kritik Sistem Hatası: Kriter Motoru için Yapay Zeka sağlayıcısına erişilemiyor.');
      }

      let aiCriteria: any = {};
      try {
        aiCriteria = JSON.parse(response.content || '{}');
      } catch (e) {
        logAudit({
           operation_type: 'EXECUTE', 
           action_description: 'Kriter Motoru JSON formatında uyarı verdi, standart kriterlerle devam ediliyor.'
        }).catch(()=>{});
        aiCriteria = { teknik_kriterler: [], operasyonel_kriterler: [] };
      }

      // 3. MATEMATİKSEL BİRLEŞTİRME VE ÇIKTI
      return {
        zorunlu_kurallar: baseCriteria,
        teknik: Array.isArray(aiCriteria.teknik_kriterler) ? aiCriteria.teknik_kriterler : [],
        operasyonel: Array.isArray(aiCriteria.operasyonel_kriterler) ? aiCriteria.operasyonel_kriterler : []
      };

    } catch (error: any) {
      logAudit({
        operation_type: 'EXECUTE',
        action_description: `[Kriter Motoru Hatası] ${error.message}`
      }).catch(() => {});
      throw new Error(`Kriter Oluşturma İhlali: ${error.message}`);
    }
  }
}
