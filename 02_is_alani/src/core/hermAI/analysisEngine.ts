// ============================================================
// K2.1 — HermAI ANALİZ MOTORU
// Konum: src/core/hermAI/analysisEngine.ts
// ============================================================
// AI karar vermez — K5 ve K6 için yapılandırılmış veri hazırlar.
// Zincir: L0_GATEKEEPER (commandId) → runHermAIAnalysis → hermai_outputs
//
// AI sağlayıcı: aiComplete() — Ollama → OpenAI → Lokal fallback
// ⚠️ openai doğrudan import YASAK — FORCE_DISABLE_OPENAI politikası
//
// Timeout: 10s → K2.2 runFallbackAnalysis()
// Hata kodları: ERR-STP021 (timeout), ERR-STP022 (analiz hatası)
// ============================================================

import { supabase } from '@/lib/supabase';
import { aiComplete } from '@/lib/aiProvider';
import { processError, ERR } from '@/lib/errorCore';

const HERMAI_TIMEOUT_MS = 10_000;

// ─── TİP TANIMLARI ──────────────────────────────────────────

export interface HermAIAnalysis {
  reasoning: string;
  methodology: string;
  alternatives: string[];
  risks: string;
  refutation: string;
  constraints: string[];
  confidence: number;       // 0-1
  entropy: number;          // Shannon H(p)
  entropyClass: 'low' | 'medium' | 'high';
  proofLevel: 'PROVEN' | 'VALIDATED' | 'BOUNDED_VERIFIED' | 'GODEL_LIMIT';
}

// ─── K2.1 ANA FONKSİYON ─────────────────────────────────────

/**
 * K2.1 — HermAI Analiz (A4 Aksiyomu, A6 İzlenebilirlik)
 * AI karar vermez — sadece K5 ve K6 için veri hazırlar.
 * commandId: L0_GATEKEEPER'dan gelen commands.id
 */
export async function runHermAIAnalysis(
  commandId: string,
  input: string
): Promise<HermAIAnalysis> {
  const startMs = Date.now();

  const systemPrompt = `Sen V-FINAL doktrininin HermAI analiz modülüsün.
Komutu JSON formatında analiz et. Karar VERME — analiz YAP.
Zorunlu alanlar (tüm alanlar dolu olmalı):
- reasoning (string): Bu işlem neden yapılmalı?
- methodology (string): Nasıl yapılmalı?
- alternatives (string[]): En az 2 alternatif
- risks (string): Risk analizi
- refutation (string): Bu karar neden yanlış olabilir?
- constraints (string[]): Mantıksal kısıtlamalar
- confidence (number 0-1): Güven skoru`;

  try {
    // ── Timeout + AI zinciri ─────────────────────────────────
    // aiComplete: Ollama (önce) → OpenAI (FORCE_DISABLE=true ise atlanır) → null
    const aiPromise = aiComplete({
      systemPrompt,
      userMessage: input,
      temperature: 0.2,
      maxTokens: 600,
      jsonMode: true,
    });

    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(
        () => reject(new Error('ERR-STP021: HermAI timeout (10s)')),
        HERMAI_TIMEOUT_MS
      )
    );

    const response = await Promise.race([aiPromise, timeoutPromise]);

    // AI tamamen devre dışı → K2.2 fallback
    if (!response) {
      return runFallbackAnalysis(commandId, input, startMs, 'unavailable');
    }

    // ── JSON parse ───────────────────────────────────────────
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(response.content) as Record<string, unknown>;
    } catch {
      processError(ERR.AI_ANALYSIS, new Error('JSON parse hatası'), {
        kaynak: 'analysisEngine.ts',
        islem: 'JSON_PARSE',
        provider: response.provider,
      }, 'WARNING');
      return runFallbackAnalysis(commandId, input, startMs, response.provider);
    }

    // ── Analiz nesnesi oluştur ───────────────────────────────
    const confidence = typeof raw.confidence === 'number'
      ? Math.max(0, Math.min(1, raw.confidence))
      : 0.5;

    const entropy = calculateEntropy(confidence);

    const analysis: HermAIAnalysis = {
      reasoning:    typeof raw.reasoning === 'string'    ? raw.reasoning    : '',
      methodology:  typeof raw.methodology === 'string'  ? raw.methodology  : '',
      alternatives: Array.isArray(raw.alternatives)      ? raw.alternatives as string[] : [],
      risks:        typeof raw.risks === 'string'        ? raw.risks        : '',
      refutation:   typeof raw.refutation === 'string'   ? raw.refutation   : '',
      constraints:  Array.isArray(raw.constraints)       ? raw.constraints as string[] : [],
      confidence,
      entropy,
      entropyClass: entropy < 0.3 ? 'low' : entropy < 0.7 ? 'medium' : 'high',
      proofLevel: 'BOUNDED_VERIFIED',
    };

    const processingMs = Date.now() - startMs;

    // ── A6: hermai_outputs tablosuna kayıt (T2) ──────────────
    await supabase.from('hermai_outputs').insert({
      command_id:    commandId,
      reason:        analysis.reasoning,
      method:        analysis.methodology,
      alternatives:  analysis.alternatives,
      risk_score:    analysis.confidence,
      refutation:    { text: analysis.refutation },
      conditions:    analysis.constraints,
      confidence:    analysis.confidence,
      entropy:       analysis.entropy,
      entropy_class: analysis.entropyClass,
      proof_level:   analysis.proofLevel,
      processing_ms: processingMs,
      ai_provider:   response.provider,
    }).then(({ error }) => {
      if (error) {
        processError(ERR.TASK_CREATE, error, {
          kaynak: 'analysisEngine.ts',
          islem: 'HERMAI_OUTPUT_INSERT',
          command_id: commandId,
        }, 'WARNING');
      }
    });

    return analysis;

  } catch (error: unknown) {
    const isTimeout =
      error instanceof Error &&
      (error.message.includes('ERR-STP021') || error.name === 'AbortError');

    if (isTimeout) {
      processError(ERR.AI_ANALYSIS, error, {
        kaynak: 'analysisEngine.ts',
        islem: 'HERMAI_TIMEOUT',
        command_id: commandId,
      }, 'WARNING');
      return runFallbackAnalysis(commandId, input, startMs, 'timeout');
    }

    // Beklenmeyen hata → yukarı ilet
    throw new Error(
      `ERR-STP022: HermAI analiz hatası — ${error instanceof Error ? error.message : 'bilinmeyen'}`
    );
  }
}

// ─── K2.2 FALLBACK MOTOR ────────────────────────────────────

/**
 * K2.2 — Kural tabanlı fallback.
 * AI timeout veya devre dışı olduğunda devreye girer.
 * proofLevel: GODEL_LIMIT — sistem sınırına ulaşıldı.
 */
async function runFallbackAnalysis(
  commandId: string,
  input: string,
  startMs: number,
  reason: string
): Promise<HermAIAnalysis> {
  const analysis: HermAIAnalysis = {
    reasoning:    `Kural tabanlı analiz: "${input.substring(0, 60)}..."`,
    methodology:  'Rule-based fallback — AI devre dışı',
    alternatives: ['Manuel inceleme önerilir', 'Komutu yeniden gönderin'],
    risks:        `AI analizi başarısız (${reason}) — risk değerlendirmesi sınırlı`,
    refutation:   'Fallback modda çürütme devre dışı',
    constraints:  [],
    confidence:   0.3,
    entropy:      calculateEntropy(0.3),
    entropyClass: 'high',
    proofLevel:   'GODEL_LIMIT',
  };

  // Fallback da arşivlenir (A6)
  await supabase.from('hermai_outputs').insert({
    command_id:    commandId,
    reason:        analysis.reasoning,
    method:        analysis.methodology,
    alternatives:  analysis.alternatives,
    risk_score:    analysis.confidence,
    refutation:    { text: analysis.refutation },
    conditions:    analysis.constraints,
    confidence:    analysis.confidence,
    entropy:       analysis.entropy,
    entropy_class: analysis.entropyClass,
    proof_level:   analysis.proofLevel,
    processing_ms: Date.now() - startMs,
    ai_provider:   'fallback',
  }).then(({ error }) => {
    if (error) {
      processError(ERR.TASK_CREATE, error, {
        kaynak: 'analysisEngine.ts',
        islem: 'FALLBACK_OUTPUT_INSERT',
        command_id: commandId,
      }, 'WARNING');
    }
  });

  return analysis;
}

// ─── YARDIMCI FONKSİYONLAR ──────────────────────────────────

/**
 * Shannon binary entropy: H(p) = -p·log₂(p) - (1-p)·log₂(1-p)
 * p=0 veya p=1 → belirsizlik yok → H=0
 * p=0.5 → maksimum belirsizlik → H=1
 */
function calculateEntropy(confidence: number): number {
  if (confidence <= 0 || confidence >= 1) return 0;
  return -(
    confidence * Math.log2(confidence) +
    (1 - confidence) * Math.log2(1 - confidence)
  );
}
