import { aiComplete } from '@/lib/aiProvider';
import { logAudit } from '@/services/auditService';

export interface AlternativeStrategy {
  id: string;
  isim: string;
  aciklama: string;
  tahmini_maliyet_ve_zaman: string;
  temel_adimlar: string[];
}

export class AlternativeEngine {
  /**
   * ADIM 4: ALTERNATİF STRATEJİ MOTORU
   * Gelen görev kriterlerine göre ulaşılabilecek en az 3 farklı stratejik yol çizer.
   * Modül 6 (Risk) ve Modül 5 (Karar) buralardan birini seçecektir.
   */
  static async generateAlternatives(criteria: any): Promise<AlternativeStrategy[]> {
    // 1. Deterministik Güvenlik: Kriter yoksa veya arızalıysa reddet.
    if (!criteria || typeof criteria !== 'object') {
      throw new Error("Alternatif Motor Hatası: İşlenecek kriter verisi geçersiz.");
    }

    const payloadString = JSON.stringify(criteria);

    // 2. YARDIMCI ZEKA (Çoklu Senaryo Taktikçisi)
    const prompt = `
Aşağıdaki görev kriterlerine ulaşmak için 3 farklı çözüm stratejisi (Rota) üret.
Rotalar şunlar olmalıdır:
1. Hızlı ve Basit Rota (Hız odaklı)
2. Güvenli ve Kapsamlı Rota (Güvenlik ve Kalite odaklı)
3. Dengeli Rota (Performans odaklı)

Aşağıdaki JSON formatında dizi (array) dön:
[
  {
    "id": "A_HIZLI",
    "isim": "Hızlı Rota",
    "aciklama": "Yöntemin kısa özeti",
    "tahmini_maliyet_ve_zaman": "Düşük maliyet, hızlı",
    "temel_adimlar": ["Adım 1", "Adım 2"]
  }
]
KRİTERLER: ${payloadString}
    `;

    try {
      const response = await aiComplete({
        systemPrompt: "Sen üst düzey bir sistem stratejisti ve çözüm mimarısın. Yalnızca JSON formatında dizi dön.",
        userMessage: prompt,
        temperature: 0.3, // Farklı alternatifler üretmesi için hafif esneklik verilir
        jsonMode: true
      });

      if (!response) {
        throw new Error('Kritik Sistem Hatası: Alternatif Senaryo Motoru için Yapay Zeka sağlayıcısına erişilemiyor. Offline mod!');
      }

      let aiAlternatives: AlternativeStrategy[] = [];
      try {
        let cleanContent = response.content || '[]';
        // Markdown maskeleme temizliği
        if (cleanContent.startsWith('```json')) cleanContent = cleanContent.replace('```json', '').replace('```', '').trim();
        else if (cleanContent.startsWith('```')) cleanContent = cleanContent.replace('```', '').replace('```', '').trim();
        
        aiAlternatives = JSON.parse(cleanContent);
      } catch (e) {
        // AI JSON oluşturamazsa veya saçmalarsa;
        aiAlternatives = [];
      }

      // 3. DETERMİNİSTİK DENETİM VE GERİ DÜŞÜŞ (Fallback)
      // Eğer zeka dizi dönmediyse veya eksik döndüyse, otomatik olarak 'Tek Düz' rotayı standartlaştırır.
      if (!Array.isArray(aiAlternatives) || aiAlternatives.length === 0) {
        logAudit({ 
          operation_type: 'EXECUTE', 
          action_description: 'Alternatif Motoru başarısız AI formatı aldı, zorunlu (Standart) rotaya düşüldü.' 
        }).catch(()=>{});
        
        aiAlternatives = [
          {
            id: 'S_STANDART',
            isim: 'Standart Rota',
            aciklama: 'Yapay zeka alternatifleri ayrıştıramadığı için varsayılan düz rotadan ilerlenecek.',
            tahmini_maliyet_ve_zaman: 'Standart sistem maliyeti',
            temel_adimlar: ["Görevi standart işleyişe göre yap", "Kriterleri doğrula"]
          }
        ];
      }

      return aiAlternatives;

    } catch (error: any) {
      logAudit({
        operation_type: 'EXECUTE',
        action_description: `[Alternatif Motor Hatası] ${error.message}`
      }).catch(() => {});
      
      // Hata kritik offline hatasıysa doğrudan yansıt, diğerlerini yutma
      throw new Error(`Alternatif Strateji Oluşturma İhlali: ${error.message}`);
    }
  }
}
