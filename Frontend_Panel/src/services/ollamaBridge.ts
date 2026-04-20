// ============================================================
// OLLAMA BRIDGE — YEREL AI YÖNETİM KÖPRÜSÜ
// ============================================================
// Sorumluluğu: Ollama (localhost:11434) servis yönetimi.
//
// BECERİLER:
//   1. getOllamaBridgeHealth  — Sağlık kontrolü + model listesi + gecikme
//   2. pullModel              — Yeni model indirme
//   3. generateCostReport     — Maliyet raporu
//
// AI ANALİZ ve KONSENSÜS için tekli otorite tanımları:
//   → aiManager.ts        → analyzeTaskPriority()  (görev öncelik)
//   → consensusEngine.ts  → runBoardVoting()        (kurul oylama)
//   → aiProvider.ts       → aiComplete()            (genel metin üretimi)
//
// Hata Kodları:
//   ERR-STP001-040 → Ollama bağlantı hatası
// ============================================================

import {
  checkOllamaHealth,
  listOllamaModels,
  getProviderStatus,
  type AIProviderStatus,
  type OllamaModel,
} from '@/lib/aiProvider';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';

// ─── YAPILANDIRMA ───────────────────────────────────────────

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';

// ============================================================
// 1. SAĞLIK KONTROLÜ
// ============================================================

export interface OllamaBridgeHealth {
  running: boolean;
  baseUrl: string;
  model: string;
  availableModels: OllamaModel[];
  providerStatus: AIProviderStatus;
  latencyMs: number;
}

export async function getOllamaBridgeHealth(): Promise<OllamaBridgeHealth> {
  const startTime = Date.now();

  const [healthy, models, providerStatus] = await Promise.all([
    checkOllamaHealth(OLLAMA_BASE_URL),
    listOllamaModels(OLLAMA_BASE_URL),
    getProviderStatus(),
  ]);

  const latencyMs = Date.now() - startTime;

  return {
    running: healthy,
    baseUrl: OLLAMA_BASE_URL,
    model: OLLAMA_MODEL,
    availableModels: models,
    providerStatus,
    latencyMs,
  };
}

// ============================================================
// 2. MODEL PULL (Yeni Model İndirme)
// ============================================================
// DİKKAT: Bu işlem uzun sürebilir ve disk alanı gerektirir.
// ============================================================

export async function pullModel(modelName: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: false }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    await logAudit({
      operation_type: 'EXECUTE',
      action_description: `Ollama model pull: ${modelName}`,
      metadata: {
        action_code: 'OLLAMA_MODEL_PULL',
        model: modelName,
      },
    }).catch(() => {});

    return { success: true };
  } catch (error) {
    processError(ERR.OLLAMA_CONNECTION, error, {
      kaynak: 'ollamaBridge.ts',
      islem: 'PULL_MODEL',
      model: modelName,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ============================================================
// 3. MALİYET RAPORU
// ============================================================

export interface CostReport {
  provider: string;
  totalRequests: number;
  estimatedCost: string;
  savingsVsOpenAI: string;
  recommendation: string;
}

export function generateCostReport(
  ollamaRequests: number,
  openaiRequests: number
): CostReport {
  const openaiCostPerRequest = 0.002;
  const actualCost = openaiRequests * openaiCostPerRequest;
  const wouldHaveCost = (ollamaRequests + openaiRequests) * openaiCostPerRequest;
  const savings = wouldHaveCost - actualCost;

  const activeProvider =
    ollamaRequests > 0
      ? 'Ollama (Yerel)'
      : openaiRequests > 0
        ? 'OpenAI (Dış)'
        : 'Lokal Kurallar';

  return {
    provider: activeProvider,
    totalRequests: ollamaRequests + openaiRequests,
    estimatedCost: `$${actualCost.toFixed(4)}`,
    savingsVsOpenAI: `$${savings.toFixed(4)} tasarruf`,
    recommendation:
      ollamaRequests === 0 && openaiRequests > 0
        ? 'DİKKAT: Ollama aktif değil — dış API maliyeti oluşuyor. Ollama kurulumu önerilir.'
        : ollamaRequests > 0 && openaiRequests === 0
          ? 'BAşARILI: Tüm istekler yerel Ollama üzerinden — maliyet SIFIR.'
          : 'BİLGİ: Hibrit mod aktif — bazı istekler dış API kullanıyor.',
  };
}
