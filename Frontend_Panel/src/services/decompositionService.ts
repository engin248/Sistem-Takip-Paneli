// ============================================================
// PARÇALAMA SERVİSİ — GÖREV DECOMPOSITION MOTORU
// ============================================================
// Karmaşık görevleri alır ve AI ile analiz ederek atomik
// alt görevlere (sub-tasks) böler.
// ============================================================

import { aiComplete } from '@/lib/aiProvider';
import { logAudit } from './auditService';
import { processError, ERR } from '@/lib/errorCore';

export interface SubTask {
    title: string;
    description: string;
}

export interface DecompositionResponse {
    success: boolean;
    sub_tasks: SubTask[];
    error?: string;
}

/**
 * Görev Parçalayıcı: Görevi alt bileşenlerine ayırır.
 */
export async function decomposeTask(mainTask: string, model: string = 'ollama'): Promise<DecompositionResponse> {
    const systemPrompt = `Sen Sistem Takip Paneli'nin "PARÇALAYICI" modülüsün.
Görevin: Verilen karmaşık görevi, birbiriyle tutarlı ve sırayla uygulanabilecek 3-5 adet küçük alt göreve bölmektir.

[KURALLAR]
1. Net ve kısa ifadeler kullan.
2. Sadece JSON formatında yanıt ver.
3. Her alt görev bağımsız bir işlem adımı olmalıdır.

[CEVAP FORMATI (JSON)]
{
  "sub_tasks": [
    {
      "title": "Kısa Başlık",
      "description": "Yapılacak işlemin kısa özeti"
    }
  ]
}`;

    try {
        const response = await aiComplete({
            systemPrompt,
            userMessage: `Parçalanacak Görev: ${mainTask}`,
            temperature: 0.2,
            jsonMode: true
        });

        if (!response || !response.content) throw new Error('AI yanıt üretmedi');

        const parsed = JSON.parse(response.content) as { sub_tasks: SubTask[] };

        // Audit Log
        await logAudit({
            operation_type: 'EXECUTE',
            action_description: `Görev parçalandı: "${mainTask.slice(0, 30)}..."`,
            metadata: {
                action_code: 'TASK_DECOMPOSED',
                main_task: mainTask,
                sub_task_count: parsed.sub_tasks.length
            }
        });

        return {
            success: true,
            sub_tasks: parsed.sub_tasks
        };

    } catch (error) {
        processError(ERR.AI_ANALYSIS, error, { kaynak: 'decompositionService.ts', islem: 'DECOMPOSE' });
        return {
            success: false,
            sub_tasks: [],
            error: 'Görev parçalama işlemi başarısız oldu.'
        };
    }
}
