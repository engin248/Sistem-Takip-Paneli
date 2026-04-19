import { aiComplete } from '@/lib/aiProvider';
import { logAudit } from '@/services/auditService';

export class AmbiguityResolution {
  /**
   * HİBRİD MİMARİ ADIM 1: Belirsizlik Çözümü
   * Soru: Ne yapılmak isteniyor? Kullanıcı eksik mi konuştu?
   */
  static async resolve(rawInput: string) {
    // 1. Deterministik Çelik Kapı: Veri çok kısaysa veya boşsa Yapay Zekayı yormadan reddet.
    if (!rawInput || rawInput.trim().length < 5) {
      throw new Error('EMİR ÇOK KISA: Lütfen eylem ve hedef belirterek komut veriniz.');
    }

    // 2. İşçi Zeka: Mistral/Qwen'i kullanarak metni parçala (Zekayı danışman olarak kullan)
    const prompt = `
Aşağıdaki görevi askeri bir netlikle parçala. Asla kod yazma, sadece analiz et.
Eğer metin net değilse "BELİRSİZ" diye işaretle.
Aşağıdaki JSON formatında yanıt ver:
{
  "eylem_fiili": "Oluştur, Sil, Analiz vs.",
  "ana_hedef": "Proje, Dosya, Veritabanı vb.",
  "kapsam": "Açıklama",
  "eksik_bilgi_var_mi": boolean
}
GÖREV METNİ: "${rawInput}"
    `;

    try {
      const response = await aiComplete({
        systemPrompt: "Sen bir Belirsizlik Çözme uzmanısın. Yalnızca geçerli JSON dön.",
        userMessage: prompt,
        temperature: 0.1,
        jsonMode: true
      });

      if (!response) {
        throw new Error('Kritik Sistem Hatası: Yapay Zeka (Ollama/OpenAI) sağlayıcısına erişilemiyor. Offline modda planlama yapılamaz.');
      }

      let analiz: any = {};
      try {
        let cleanContent = response.content || '{}';
        // Markdown JSON strip
        if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace('```json', '').replace('```', '').trim();
        } else if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace('```', '').replace('```', '').trim();
        }
        analiz = JSON.parse(cleanContent);
        // console.log("-- AI RETURNED:", analiz);
      } catch (e) {
        throw new Error('Yapay Zeka yapısal veri döndüremedi.');
      }

      // 3. İkinci Deterministik Kapı: Eğer yapay zeka eksik bilgi tespit ettiyse, işlemi bloke et!
      if (analiz.eksik_bilgi_var_mi === true || !analiz.eylem_fiili || !analiz.ana_hedef) {
        throw new Error(`MUĞLAK EMİR REDDEDİLDİ: Görevde eylem veya hedef belirgin değil. Detay: ${analiz.kapsam || 'Belirsiz içerik'}`);
      }

      // Her şey tamamsa Mühürlü formatı senatoya ver.
      return {
        is_netlesmis: true,
        orijinal: rawInput,
        eylem: analiz.eylem_fiili,
        hedef: analiz.ana_hedef,
        kapsam: analiz.kapsam
      };
      
    } catch (error: any) {
      // Hata fırlatarak senatoyu durdurur.
      logAudit({
        operation_type: 'EXECUTE',
        action_description: `[Belirsizlik Çözme Hatası] ${error.message}`,
        metadata: { görev: rawInput }
      }).catch(() => {});
      throw new Error(`Belirsizlik Hatası: ${error.message}`);
    }
  }
}
