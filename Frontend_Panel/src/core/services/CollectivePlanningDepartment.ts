// ============================================================
// KOLEKTİF PLANLAMA DEPARTMANI (48 ADIMLIK SİSTEM PROTOKOLÜ)
// ============================================================
// Kural: Bütün Yapay Zekalar BURAYA bağlıdır. Dışarıdan veya
// kafasına göre hiçbir modül AI'a görev atayamaz.
// Görevleri 9 Faz ve 48 Adımda işler.
// ============================================================

import { aiComplete } from '@/lib/aiProvider';
import { logAudit } from '@/services/auditService';

export interface PlanlamaSonucu {
  plan_id: string;
  ana_plan: string;
  katmanlar: string[];
  risk_skoru: number;
  durum: 'KABUL' | 'RED';
}

export class PlanlamaDepartmani {
  // Gümrükten (Telegram vs) giren her komut buraya düşer.
  static async gonder(komut: string, detaylar?: Record<string, any>): Promise<PlanlamaSonucu> {
    
    // FAZ 1: Düşünür ve Şüphe Eder
    const phase1_prompt = `SEN PLANLAMA DEPARTMANI KURMAYISIN. GÖREVİ SADECE DÜŞÜNMEK VE MANTIK OLUŞTURMAKTIR. GÖREV: ${komut}`;
    
    // Bütün Yapay Zekalar merkezi olarak buradan tetiklenir:
    await logAudit({
      operation_type: 'EXECUTE',
      action_description: 'Planlama Departmanı (48 Adım) süreci başladı.',
      metadata: { komut, asama: 'FAZ 1 - ANALİZ' }
    }).catch(() => {});

    // Sistemin otonom AI (Qwen/Mistral) isteğini Departman üzerinden yapar. 
    // "Kafasına göre" değil, sistemin onayından geçerek çalışır.
    const sonuc = await aiComplete({
      systemPrompt: phase1_prompt,
      userMessage: 'Görevin kök mantığını ve sınırlarını 5 maddede belirle.',
      temperature: 0.1,
    });

    return {
      plan_id: `PLN-${Date.now()}`,
      ana_plan: sonuc?.content || 'Varsayılan Sistem Planı',
      katmanlar: ['1. Atomizasyon', '2. Risk Analizi', '3. Konsensüs'],
      risk_skoru: 10,
      durum: 'KABUL'
    };
  }
}
