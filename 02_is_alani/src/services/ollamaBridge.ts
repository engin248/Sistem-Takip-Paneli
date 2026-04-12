// ============================================================
// OLLAMA BRIDGE — YEREL AI KÖPRÜSÜ
// ============================================================
// Ollama (localhost:11434) üzerinden yerel AI modelleri ile
// görev analizi, konsensüs oylaması ve metin üretimi yapar.
//
// BECERİLER:
//   1. healthCheck        — Ollama servisi çalışıyor mu?
//   2. listModels         — Mevcut model listesi
//   3. analyzePriority    — Görev öncelik analizi (Ollama ile)
//   4. voteAsAgent        — Konsensüs oylaması (Ollama ile)
//   5. generateText       — Genel amaçlı metin üretimi
//   6. pullModel          — Yeni model indirme
//
// Hata Kodları:
//   ERR-STP001-040 → Ollama bağlantı hatası
//   ERR-STP001-041 → Ollama yanıt parse hatası
// ============================================================

import {
  aiComplete,
  checkOllamaHealth,
  listOllamaModels,
  getProviderStatus,
  type AICompletionRequest,
  type AICompletionResponse,
  type AIProviderStatus,
  type OllamaModel,
} from '@/lib/aiProvider';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';
import type { TaskPriority } from '@/store/useTaskStore';
import type { AgentRole, VoteResult, AgentVote, DecisionCategory } from './consensusEngine';

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
// 2. GÖREV ÖNCELİK ANALİZİ (Ollama ile)
// ============================================================
// aiManager.ts'deki analyzeWithAI() fonksiyonunun Ollama versiyonu.
// aiProvider üzerinden çağrılır — fallback dahil.
// ============================================================

export interface OllamaPriorityResult {
  priority: TaskPriority;
  reasoning: string;
  confidence: number;
  provider: string;
  durationMs: number;
}

export async function analyzeTaskWithOllama(
  taskTitle: string,
  taskDescription?: string | null
): Promise<OllamaPriorityResult | null> {
  const systemPrompt = `Sen bir görev önceliklendirme asistanısın. Verilen görev başlığı ve açıklamasını analiz edip öncelik seviyesi belirle.

ÖNCELİK SEVİYELERİ:
- "kritik": Sistem çökmesi, güvenlik açığı, veri kaybı — ANINDA müdahale gerektirir.
- "yuksek": Önemli hatalar, performans sorunları, deadline — aynı gün çözülmeli.
- "normal": Rutin geliştirme, iyileştirme, bakım — standart akışta çözülür.
- "dusuk": Araştırma, dokümantasyon, kozmetik — zamanı geldiğinde yapılır.

CEVAP FORMATI (sadece JSON, başka bir şey yazma):
{"priority": "kritik" | "yuksek" | "normal" | "dusuk", "reasoning": "Kısa gerekçe (max 100 karakter)", "confidence": 0.0-1.0}`;

  const userMessage = `Görev Başlığı: ${taskTitle}${taskDescription ? `\nGörev Açıklaması: ${taskDescription}` : ''}`;

  const request: AICompletionRequest = {
    systemPrompt,
    userMessage,
    temperature: 0.2,
    maxTokens: 200,
    jsonMode: true,
  };

  // aiProvider fallback zinciri ile çağır
  const response = await aiComplete(request, {
    forceDisableOpenAI: true, // Maliyet sıfır politikası: sadece Ollama
  });

  if (!response) return null;

  try {
    const parsed = JSON.parse(response.content) as {
      priority?: string;
      reasoning?: string;
      confidence?: number;
    };

    const validPriorities: TaskPriority[] = ['kritik', 'yuksek', 'normal', 'dusuk'];
    const priority = validPriorities.includes(parsed.priority as TaskPriority)
      ? (parsed.priority as TaskPriority)
      : 'normal';

    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.7;

    return {
      priority,
      reasoning: parsed.reasoning || `${response.provider} analiz: ${priority} öncelik atandı`,
      confidence,
      provider: response.provider,
      durationMs: response.durationMs,
    };
  } catch (error) {
    processError(ERR.OLLAMA_PARSE, error, {
      kaynak: 'ollamaBridge.ts',
      islem: 'PARSE_PRIORITY',
      raw_content: response.content.substring(0, 200),
    });
    return null;
  }
}

// ============================================================
// 3. KONSENSÜS OYLAMA (Ollama ile)
// ============================================================
// consensusEngine.ts'deki aiVote() fonksiyonunun Ollama versiyonu.
// 3 bağımsız ajan perspektifinden oylama yapar.
// ============================================================

const AGENT_PROMPTS_TR: Record<AgentRole, string> = {
  strategic: `Sen bir Stratejik Değerlendirme Ajanısın. Verilen kararı iş sürekliliği, kaynak verimliliği, uzun vadeli etki, geri dönüşüm ve zamanlama kriterlerinden değerlendir.
CEVAP (sadece JSON): {"vote": "ONAY" | "RED", "reasoning": "Kısa gerekçe (max 150 karakter)", "confidence": 0.0-1.0}`,

  technical: `Sen bir Teknik Değerlendirme Ajanısın. Verilen kararı mimari uyumluluk, performans etkisi, bağımlılık riski, test kapsamı ve bakım karmaşıklığı kriterlerinden değerlendir.
CEVAP (sadece JSON): {"vote": "ONAY" | "RED", "reasoning": "Kısa gerekçe (max 150 karakter)", "confidence": 0.0-1.0}`,

  security: `Sen bir Güvenlik Değerlendirme Ajanısın. Verilen kararı veri güvenliği, erişim kontrolü, saldırı yüzeyi, şifreleme ve uyumluluk kriterlerinden değerlendir.
CEVAP (sadece JSON): {"vote": "ONAY" | "RED", "reasoning": "Kısa gerekçe (max 150 karakter)", "confidence": 0.0-1.0}`,
};

export async function voteWithOllama(
  agent: AgentRole,
  title: string,
  description: string,
  category: DecisionCategory
): Promise<AgentVote | null> {
  const userMessage = `KARAR BAŞLIĞI: ${title}\nKATEGORİ: ${category}\nAÇIKLAMA: ${description || 'Açıklama belirtilmedi.'}`;

  const request: AICompletionRequest = {
    systemPrompt: AGENT_PROMPTS_TR[agent],
    userMessage,
    temperature: 0.3,
    maxTokens: 200,
    jsonMode: true,
  };

  const response = await aiComplete(request, {
    forceDisableOpenAI: true, // Maliyet sıfır politikası
  });

  if (!response) return null;

  try {
    const parsed = JSON.parse(response.content) as {
      vote?: string;
      reasoning?: string;
      confidence?: number;
    };

    const vote: VoteResult = parsed.vote === 'RED' ? 'RED' : 'ONAY';
    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.7;

    return {
      agent,
      vote,
      reasoning: parsed.reasoning || `${agent} ajanı (Ollama) ${vote} oyu verdi.`,
      confidence,
      evaluatedAt: new Date().toISOString(),
    };
  } catch (error) {
    processError(ERR.OLLAMA_PARSE, error, {
      kaynak: 'ollamaBridge.ts',
      islem: 'PARSE_VOTE',
      agent,
    });
    return null;
  }
}

// ============================================================
// 4. GENEL AMAÇLI METİN ÜRETİMİ
// ============================================================

export async function generateText(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<AICompletionResponse | null> {
  return aiComplete({
    systemPrompt,
    userMessage,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
    jsonMode: options?.jsonMode,
  }, {
    forceDisableOpenAI: true,
  });
}

// ============================================================
// 5. MODEL PULL (Yeni Model İndirme)
// ============================================================
// Ollama'ya yeni model indirme isteği gönderir.
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
// 6. MALİYET RAPORU
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

  const activeProvider = ollamaRequests > 0 ? 'Ollama (Yerel)' : openaiRequests > 0 ? 'OpenAI (Dış)' : 'Lokal Kurallar';

  return {
    provider: activeProvider,
    totalRequests: ollamaRequests + openaiRequests,
    estimatedCost: `$${actualCost.toFixed(4)}`,
    savingsVsOpenAI: `$${savings.toFixed(4)} tasarruf`,
    recommendation: ollamaRequests === 0 && openaiRequests > 0
      ? 'DİKKAT: Ollama aktif değil — dış API maliyeti oluşuyor. Ollama kurulumu önerilir.'
      : ollamaRequests > 0 && openaiRequests === 0
        ? 'BAŞARILI: Tüm istekler yerel Ollama üzerinden — maliyet SIFIR.'
        : 'BİLGİ: Hibrit mod aktif — bazı istekler dış API kullanıyor.',
  };
}
