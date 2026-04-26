// KÖK NEDEN: @ts-nocheck kaldırıldı (2026-04-26). Maskelenen hata: getAll() await eksikti.
// ============================================================
// KURMAY SERVİSİ — OTONOM STRATEJİK PLANLAMA MOTORU
// ============================================================
// "Nizâm" doktrini uyarınca yüksek seviyeli hedefleri analiz eder,
// atomik görevlere böler ve Agent Registry üzerinden en uygun
// ajanları eşleştirerek bir plan taslağı üretir.
// ============================================================

import { aiComplete } from '../lib/aiProvider';
import { agentRegistry } from './agentRegistry';
import { logAudit } from './auditService';
import { processError, ERR } from '../lib/errorCore';

export interface AIPlanResult {
    title: string;
    description: string;
    suggested_agent_id?: string;
    priority: string;
}

export interface KurmayResponse {
    success: boolean;
    ai_plans: AIPlanResult[];
    reasoning?: string;
    error?: string;
}

/**
 * Kurmay Zekası: Verilen hedefe göre stratejik plan üretir.
 */
export async function generateStrategicPlan(goal: string, model: string = 'ollama'): Promise<KurmayResponse> {
    const agents = await agentRegistry.getAll();
    const agentContext = agents.map((a: { id: string; kod_adi: string; rol: string; beceri_listesi: string[] }) => `${a.id}: ${a.kod_adi} (${a.rol}) - Beceriler: ${a.beceri_listesi.join(', ')}`).join('\n');

    const systemPrompt = `Sen Sistem Takip Paneli'nin (STP) "KURMAY" (K-2) ajanısın. 
Görevin: Verilen ana hedefi analiz etmek, stratejik bir harekat planı çıkarmak ve bu planı atomik görevlere bölerek en uygun ajanlara atamaktır.

[KURALLAR]
1. SIFIR İNİSİYATİF: Sadece verilen hedefe odaklan.
2. ASKERİ DİSİPLİN: Yanıtlar net, emir kipinde ve ciddi olmalıdır.
3. AJAN EŞLEŞTİRME: Görevi, becerileri en uygun olan ajana ata.
4. ÇIKTI FORMATI: Sadece JSON döndür. Başka metin yazma.

[AGENT REGISTRY]
${agentContext}

[CEVAP FORMATI (JSON)]
{
  "ai_plans": [
    {
      "title": "Görev Başlığı",
      "description": "Detaylı uygulama talimatı",
      "suggested_agent_id": "İlgili Ajan ID (Örn: A-01)",
      "priority": "kritik | yuksek | normal | dusuk"
    }
  ],
  "reasoning": "Planın stratejik gerekçesi"
}`;

    const userMessage = `Ana Hedef: ${goal}\nModel Tercihi: ${model}`;

    try {
        const response = await aiComplete({
            systemPrompt,
            userMessage,
            temperature: 0.3,
            maxTokens: 1000,
            jsonMode: true
        });

        if (!response || !response.content) {
            throw new Error('AI yanit üretmedi');
        }

        const parsed = JSON.parse(response.content) as { ai_plans: AIPlanResult[], reasoning?: string };

        // Audit Log
        await logAudit({
            operation_type: 'EXECUTE',
            action_description: `Kurmay stratejik plan üretti: "${goal.slice(0, 50)}..."`,
            metadata: {
                action_code: 'KURMAY_PLAN_GENERATED',
                goal,
                plan_count: parsed.ai_plans.length,
                provider: response.provider
            }
        });

        return {
            success: true,
            ai_plans: parsed.ai_plans,
            reasoning: parsed.reasoning
        };

    } catch (error) {
        processError(ERR.AI_ANALYSIS, error, { kaynak: 'kurmayService.ts', islem: 'GENERATE_PLAN' });
        return {
            success: false,
            ai_plans: [],
            error: 'Planlama sırasında teknik bir hata oluştu.'
        };
    }
}

