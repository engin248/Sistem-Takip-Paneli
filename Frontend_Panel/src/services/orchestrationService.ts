// ============================================================
// ORKESTRASYON SERVİSİ — OTONOM GÖREV DAĞITIM MOTORU
// ============================================================
// SUPABASE SÖKÜLMÜŞTÜR. VERİ DIŞARI ÇIKMAZ.
// Komut panele gelir → AI analiz eder → Ajana atar → Biter.
// ============================================================

import { analyzeTaskPriority } from './aiManager';
import { agentRegistry } from './agentRegistry';
import { pushToRedLine } from './hatBridge';
import { logAudit } from './auditService';
import { processError, ERR } from '@/lib/errorCore';

export interface OrchestrateParams {
    gorev: string;
    ajan_id?: string;
}

export interface OrchestrateResponse {
    success: boolean;
    message?: string;
    atanan_ajan?: string;
    atama_gerekce?: string;
    task_id?: string;
    error?: string;
}

/**
 * Görev Orkestratörü: Emri analiz eder ve icra hattına fırlatır.
 * Supabase'e gitmez. Tüm veri yerel kalır.
 */
export async function orchestrateTask(params: OrchestrateParams): Promise<OrchestrateResponse> {
    const { gorev, ajan_id } = params;

    try {
        // 1. Görev Öncelik Analizi (Ollama AI — Yerel)
        const analysis = await analyzeTaskPriority(gorev);
        
        // 2. Ajan Seçimi
        let targetAgent = null;
        if (ajan_id) {
            targetAgent = agentRegistry.getById(ajan_id);
        }
        
        const finalAgentId = targetAgent?.id || 'SISTEM';
        const finalAgentName = targetAgent?.kod_adi || 'OTOMASYON';

        // 3. Canlı Komuta Hattına Fırlat (Yerel)
        const taskCode = `TSK-${Math.floor(Math.random() * 9000 + 1000)}`;
        const hatResult = pushToRedLine({
            plan_id: taskCode,
            title: gorev,
            description: analysis.reasoning,
            assignee: finalAgentId,
            priority: analysis.priority,
            timestamp: new Date().toISOString(),
            source: 'ORCHESTRATOR'
        });

        // Audit Log (Yerel)
        await logAudit({
            operation_type: 'EXECUTE',
            action_description: `Görev orkestre edildi: ${taskCode} -> ${finalAgentName}`,
            task_id: taskCode,
            metadata: {
                action_code: 'TASK_ORCHESTRATED',
                agent_id: finalAgentId,
                hat_id: hatResult.hat_id,
                priority: analysis.priority
            }
        });

        return {
            success: true,
            message: `İş departmanda tamamlandı. ${finalAgentName} ajanına atandı.`,
            atanan_ajan: finalAgentName,
            atama_gerekce: analysis.reasoning,
            task_id: taskCode
        };

    } catch (error) {
        console.error('ORCHESTRATOR ERROR:', error);
        processError(ERR.SYSTEM_GENERAL, error, { kaynak: 'orchestrationService.ts', islem: 'ORCHESTRATE' });
        return {
            success: false,
            error: 'Görev orkestrasyonu sırasında teknik hata oluştu.'
        };
    }
}
