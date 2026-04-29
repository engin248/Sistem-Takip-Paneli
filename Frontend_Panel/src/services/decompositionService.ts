// ============================================================
// PARÇALAMA SERVİSİ — GÖREV DECOMPOSITION MOTORU
// ============================================================
// Karmaşık görevleri alır ve AI ile analiz ederek atomik
// alt görevlere (sub-tasks) böler.
// HATA #19 KÖK NEDEN DÜZELTİLDİ: JSON.parse artık korumalı.
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
export async function decomposeTask(mainTask: string, _model: string = 'ollama'): Promise<DecompositionResponse> {
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

        // ── HATA #19 KÖK NEDEN DÜZELTİLDİ ──────────────────────
        // Önceden: JSON.parse(response.content) doğrudan çağrılıyordu.
        // AI "```json\n{...}\n```" gönderdiğinde SyntaxError fırlatıyordu.
        // sub_tasks boş dönüyor, hata mesajı kayboluyordu.
        // ÇÖZÜM: Markdown temizle → parse → schema doğrula
        let ham = response.content.trim();

        // Markdown code block temizle: ```json ... ``` veya ``` ... ```
        ham = ham.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

        // İlk { ... } bloğunu çıkar (AI bazen önüne metin koyuyor)
        const jsonBaslangic = ham.indexOf('{');
        const jsonBitis     = ham.lastIndexOf('}');
        if (jsonBaslangic !== -1 && jsonBitis > jsonBaslangic) {
            ham = ham.slice(jsonBaslangic, jsonBitis + 1);
        }

        let parsed: { sub_tasks?: unknown[] };
        try {
            parsed = JSON.parse(ham) as { sub_tasks?: unknown[] };
        } catch (parseErr: unknown) {
            const parseMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
            throw new Error(`JSON parse başarısız: ${parseMsg} | AI çıktısı: "${ham.slice(0, 100)}"`);
        }

        // Schema doğrulama
        if (!Array.isArray(parsed.sub_tasks)) {
            throw new Error(`sub_tasks dizisi bulunamadı. AI çıktısı: "${ham.slice(0, 100)}"`);
        }

        const gercek_sub_tasks: SubTask[] = parsed.sub_tasks
            .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
            .map(t => ({
                title:       String(t['title']       || 'Alt Görev'),
                description: String(t['description'] || ''),
            }));

        // Audit Log
        await logAudit({
            operation_type: 'EXECUTE',
            action_description: `Görev parçalandı: "${mainTask.slice(0, 30)}..."`,
            metadata: {
                action_code:    'TASK_DECOMPOSED',
                main_task:      mainTask,
                sub_task_count: gercek_sub_tasks.length,
            }
        });

        return {
            success: true,
            sub_tasks: gercek_sub_tasks,
        };

    } catch (error) {
        processError(ERR.AI_ANALYSIS, error, { kaynak: 'decompositionService.ts', islem: 'DECOMPOSE' });
        const hataMsg = error instanceof Error ? error.message : 'Bilinmeyen hata';
        return {
            success: false,
            sub_tasks: [],
            error: `Görev parçalama başarısız: ${hataMsg}`
        };
    }
}
