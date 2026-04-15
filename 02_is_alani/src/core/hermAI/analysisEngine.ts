// src/core/hermAI/analysisEngine.ts
// K2.1 — HermAI 6'lı Analiz — AI KARAR VERMEZ

import { supabase } from '@/lib/supabase';
import { aiComplete } from '@/lib/aiProvider';
import { processError, ERR } from '@/lib/errorCore';
import type { HermAIAnalysis } from '../types';

const TIMEOUT_MS = 10_000;

// Kural #73: 5 Eksen Analizi zorunlu
const SYSTEM_PROMPT = `Sen V-FINAL HermAI analiz modülüsün.
JSON formatında analiz et. Karar VERME — analiz YAP.

## 5 Eksen Analizi (Kural #73 — ZORUNLU):
Her yanıt şu 5 ekseni kapsamalı:
1. STRATEJİK: Neden? Amaç nedir?
2. TEKNİK: Nasıl? Hangi yöntem?
3. OPERASYONEL: Kim, ne zaman, hangi kaynak?
4. EKONOMİK: Maliyet, fayda, risk ağırlığı?
5. SÜRDÜRÜLEBILIRLIK: İnsan etkisi, uzun vadeli sonuç?

Zorunlu JSON alanları:
- reasoning (string): 5 ekseni kapsayan neden/nasıl analizi
- methodology (string): Adım adım teknik yöntem
- alternatives (string[]): En az 2 alternatif çözüm
- risks (string): Risk analizi
- refutation (string): Bu karar neden yanlış olabilir?
- constraints (string[]): Mantıksal kısıtlamalar
- confidence (number 0-1): Güven skoru

Sen karar vermiyorsun. Sadece analiz üretiyorsun.`;

export async function runHermAIAnalysis(
  commandId: string,
  input: string
): Promise<HermAIAnalysis> {
  const t0 = Date.now();

  try {
    const res = await Promise.race([
      aiComplete({
        systemPrompt: SYSTEM_PROMPT,
        userMessage:  input,
        temperature:  0.2,
        maxTokens:    1500,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AbortError')), TIMEOUT_MS)
      ),
    ]);

    const raw = JSON.parse(res?.content || '{}');
    const confidence = Math.max(0, Math.min(1, raw.confidence ?? 0.5));
    const entropy    = calcEntropy(confidence);

    const analysis: HermAIAnalysis = {
      reasoning:    raw.reasoning    || '',
      methodology:  raw.methodology  || '',
      alternatives: Array.isArray(raw.alternatives) ? raw.alternatives : [],
      risks:        raw.risks        || '',
      refutation:   raw.refutation   || '',
      constraints:  Array.isArray(raw.constraints) ? raw.constraints : [],
      confidence,
      entropy,
      entropyClass: entropy < 0.3 ? 'low' : entropy < 0.7 ? 'medium' : 'high',
      proofLevel:   'BOUNDED_VERIFIED',
    };

    await supabase.from('hermai_outputs').insert({
      command_id:    commandId,
      reason:        analysis.reasoning,
      method:        analysis.methodology,
      alternatives:  analysis.alternatives,
      risk_score:    1 - confidence,
      refutation:    { text: analysis.refutation },
      conditions:    analysis.constraints,
      confidence,
      entropy,
      entropy_class: analysis.entropyClass,
      proof_level:   analysis.proofLevel,
      processing_ms: Date.now() - t0,
    }).then(({ error }) => {
      if (error) {
        processError(ERR.TASK_CREATE, error, {
          kaynak: 'analysisEngine.ts',
          islem:  'HERMAI_OUTPUTS_INSERT',
          command_id: commandId,
        }, 'WARNING');
      }
    });

    return analysis;

  } catch (err: unknown) {
    const isTimeout = err instanceof Error &&
      (err.name === 'AbortError' || err.message === 'AbortError');

    if (isTimeout) {
      processError(ERR.AI_ANALYSIS, new Error('HermAI timeout'), {
        kaynak:     'analysisEngine.ts',
        islem:      'HERMAI_TIMEOUT',
        command_id: commandId,
        timeout_ms: TIMEOUT_MS,
      }, 'WARNING');
      return fallback(input);
    }

    processError(ERR.AI_ANALYSIS, err, {
      kaynak:     'analysisEngine.ts',
      islem:      'HERMAI_ANALYSIS',
      command_id: commandId,
    }, 'ERROR');
    throw new Error('ERR-STP022: HermAI hatası');
  }
}

function fallback(input: string): HermAIAnalysis {
  return {
    reasoning:    `Fallback: "${input.substring(0, 50)}..."`,
    methodology:  'Rule-based — AI devre dışı',
    alternatives: ['Manuel inceleme'],
    risks:        'AI analizi başarısız',
    refutation:   'Fallback modda çürütme yok',
    constraints:  [],
    confidence:   0.3,
    entropy:      0.9,
    entropyClass: 'high',
    proofLevel:   'GODEL_LIMIT',
  };
}

function calcEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}
