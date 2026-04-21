// ============================================================
// AI PROVIDER — SOYUTLAMA KATMANI (Ollama / OpenAI / Lokal)
// ============================================================
// Tüm AI çağrıları bu katmandan geçer.
// Fallback zinciri:
//   1. Ollama (Yerel) — Maliyet: 0₺
//   2. OpenAI (Dış)   — Maliyet: $/istek
//   3. Lokal Kurallar — Maliyet: 0₺
//
// Hata Kodları:
//   ERR-Sistem Takip Paneli001-040 → Ollama bağlantı hatası
//   ERR-Sistem Takip Paneli001-041 → Ollama yanıt parse hatası
//   ERR-Sistem Takip Paneli001-042 → AI Provider fallback tetiklendi
// ============================================================

import { ERR, processError } from './errorCore';
import { logAudit } from '@/services/auditService';
import { cbSarici, getCBDurum } from '@/core/circuitBreaker';
import { auditLog } from '@/core/localAudit';
import { buildKuralPrompt } from '@/core/agentRules';
import { yanitKontrol } from '@/core/ruleGuard';

// ─── TİP TANIMLARI ──────────────────────────────────────────

export type AIProviderType = 'ollama' | 'openai' | 'local';

export interface AIProviderConfig {
  /** Ollama base URL. Varsayılan: http://localhost:11434 */
  ollamaBaseUrl: string;
  /** Ollama model adı. Varsayılan: llama3.1 */
  ollamaModel: string;
  /** OpenAI API key */
  openaiApiKey: string;
  /** OpenAI model adı */
  openaiModel: string;
  /** Ollama'yı zorla devre dışı bırak */
  forceDisableOllama: boolean;
  /** OpenAI'ı zorla devre dışı bırak (maliyet sıfır politikası) */
  forceDisableOpenAI: boolean;
  /** İstek timeout (ms) */
  timeoutMs: number;
}

export interface AICompletionRequest {
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface AICompletionResponse {
  content: string;
  provider: AIProviderType;
  model: string;
  durationMs: number;
  tokensUsed?: number;
}

// ─── VARSAYILAN YAPILANDIRMA ────────────────────────────────

function getDefaultConfig(): AIProviderConfig {
  return {
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'llama3:latest',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    forceDisableOllama: process.env.FORCE_DISABLE_OLLAMA === 'true',
    forceDisableOpenAI: process.env.FORCE_DISABLE_OPENAI !== 'false', // Varsayılan: KAPALI (maliyet sıfır)
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '15000', 10),
  };
}

// ─── OLLAMA SAĞLIK KONTROLÜ ─────────────────────────────────
// localhost:11434 üzerinde Ollama'nın çalışıp çalışmadığını kontrol eder.
// ─────────────────────────────────────────────────────────────

let _ollamaHealthCache: { healthy: boolean; checkedAt: number } | null = null;
const HEALTH_CACHE_TTL_MS = 30_000; // 30 saniye

export async function checkOllamaHealth(baseUrl?: string): Promise<boolean> {
  const url = baseUrl || getDefaultConfig().ollamaBaseUrl;

  // Cache kontrolü — 30 saniye içinde tekrar sormaz
  if (_ollamaHealthCache && Date.now() - _ollamaHealthCache.checkedAt < HEALTH_CACHE_TTL_MS) {
    return _ollamaHealthCache.healthy;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${url}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const healthy = response.ok;
    _ollamaHealthCache = { healthy, checkedAt: Date.now() };
    return healthy;
  } catch {
    _ollamaHealthCache = { healthy: false, checkedAt: Date.now() };
    return false;
  }
}

/** Ollama sağlık cache'ini sıfırlar (test/debug için) */
export function resetOllamaHealthCache(): void {
  _ollamaHealthCache = null;
}

// ─── OLLAMA COMPLETION ──────────────────────────────────────

async function ollamaCompletion(
  request: AICompletionRequest,
  config: AIProviderConfig
): Promise<AICompletionResponse> {
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model: config.ollamaModel,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userMessage },
      ],
      stream: false,
      options: {
        temperature: request.temperature ?? 0.2,
        num_predict: request.maxTokens ?? 200,
      },
    };

    if (request.jsonMode) {
      body.format = 'json';
    }

    const response = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as {
      message?: { content?: string };
      eval_count?: number;
      prompt_eval_count?: number;
    };

    const content = data.message?.content || '';
    const durationMs = Date.now() - startTime;

    return {
      content,
      provider: 'ollama',
      model: config.ollamaModel,
      durationMs,
      tokensUsed: (data.eval_count || 0) + (data.prompt_eval_count || 0),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ─── OPENAI COMPLETION ──────────────────────────────────────

async function openaiCompletion(
  request: AICompletionRequest,
  config: AIProviderConfig
): Promise<AICompletionResponse> {
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model: config.openaiModel,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userMessage },
      ],
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 200,
    };

    if (request.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OpenAI HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    const content = data.choices?.[0]?.message?.content || '';
    const durationMs = Date.now() - startTime;

    return {
      content,
      provider: 'openai',
      model: config.openaiModel,
      durationMs,
      tokensUsed: data.usage?.total_tokens || 0,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================================
// ANA ORKESTRATÖR — FALLBACK ZİNCİRİ
// ============================================================
// 1. Ollama (yerel, ücretsiz)
// 2. OpenAI (dış, ücretli)
// 3. null döner → çağıran fonksiyon lokal kurala düşer
// ============================================================

export async function aiComplete(
  request: AICompletionRequest,
  configOverride?: Partial<AIProviderConfig>
): Promise<AICompletionResponse | null> {
  const config = { ...getDefaultConfig(), ...configOverride };

  // ── SİSTEM KURALLARI: Prompt Enjeksiyonu ──────────────────
  // Tüm AI çağrılarına kuralları otomatik olarak enjekte et
  const kuralBlok = buildKuralPrompt('GENEL');
  const korunanRequest: AICompletionRequest = {
    ...request,
    systemPrompt: `${request.systemPrompt}\n\n${kuralBlok}`,
  };

  // ─── ADIM 1: OLLAMA (Circuit Breaker korumalı) ──────────────────
  if (!config.forceDisableOllama) {
    const ollamaHealthy = await checkOllamaHealth(config.ollamaBaseUrl);
    const cbDurum = getCBDurum();

    if (ollamaHealthy && cbDurum.state !== 'ACIK') {
      try {
        const result = await cbSarici(
          () => ollamaCompletion(korunanRequest, config),
          undefined,
        );

        // Başarılı — SHA-256 audit + Supabase log
        auditLog('AI_PROVIDER', 'OLLAMA_SUCCESS', {
          model: config.ollamaModel, sure_ms: result.durationMs,
          cb_state: getCBDurum().state,
        });
        await logAudit({
          operation_type: 'EXECUTE',
          action_description: `Ollama AI yanıt: model=${config.ollamaModel}, süre=${result.durationMs}ms`,
          metadata: {
            action_code: 'AI_PROVIDER_OLLAMA',
            model: config.ollamaModel,
            duration_ms: result.durationMs,
            tokens_used: result.tokensUsed || 0,
            cost: 0,
          },
        }).catch(() => {});

        // ── SİSTEM KURALLARI: Yanıt Denetimi ────────────────
        const denetimSonuc = yanitKontrol('AI_PROVIDER', 'L1', result.content);
        if (!denetimSonuc.gecti) {
          auditLog('AI_PROVIDER', 'SISTEM_KURALLARI_IHLAL', {
            provider: 'ollama', kural_no: denetimSonuc.kural_no,
            aciklama: denetimSonuc.aciklama,
          });
          // İhlal durumunda içerik filtrelenir
          result.content = `[SİSTEM KURALLARI İHLALİ] Yanıt filtrelendi: ${denetimSonuc.aciklama}`;
        }

        return result;
      } catch (error) {
        // Circuit Breaker hataKaydet zaten cbSarici içinde çağrıldı
        auditLog('AI_PROVIDER', 'OLLAMA_FAIL', {
          hata: error instanceof Error ? error.message : String(error),
          cb_state: getCBDurum().state,
        });
        processError(ERR.OLLAMA_CONNECTION, error, {
          kaynak: 'aiProvider.ts',
          islem: 'OLLAMA_COMPLETION',
          model: config.ollamaModel,
        }, 'WARNING');
        // Fallback → OpenAI
      }
    } else if (cbDurum.state === 'ACIK') {
      auditLog('AI_PROVIDER', 'CB_BLOCKED', {
        sure_kaldi_ms: cbDurum.sure_kaldi_ms,
        toplam_trip: cbDurum.toplam_trip,
      });
    }
  }

  // ─── ADIM 2: OPENAI ───────────────────────────────────────
  if (!config.forceDisableOpenAI) {
    const hasKey = !!(config.openaiApiKey && config.openaiApiKey !== '' && !config.openaiApiKey.includes('your-api-key'));

    if (hasKey) {
      try {
        const result = await openaiCompletion(korunanRequest, config);

        // ── SİSTEM KURALLARI: Yanıt Denetimi ────────────────
        const denetimSonucOai = yanitKontrol('AI_PROVIDER', 'L1', result.content);
        if (!denetimSonucOai.gecti) {
          auditLog('AI_PROVIDER', 'SISTEM_KURALLARI_IHLAL', {
            provider: 'openai', kural_no: denetimSonucOai.kural_no,
            aciklama: denetimSonucOai.aciklama,
          });
          result.content = `[SİSTEM KURALLARI İHLALİ] Yanıt filtrelendi: ${denetimSonucOai.aciklama}`;
        }

        // Fallback bildirimi
        processError(ERR.AI_PROVIDER_FALLBACK, new Error('Ollama devre dışı, OpenAI kullanıldı'), {
          kaynak: 'aiProvider.ts',
          islem: 'OPENAI_FALLBACK',
          model: config.openaiModel,
          duration_ms: result.durationMs,
        }, 'INFO');

        await logAudit({
          operation_type: 'EXECUTE',
          action_description: `OpenAI fallback: model=${config.openaiModel}, süre=${result.durationMs}ms`,
          metadata: {
            action_code: 'AI_PROVIDER_OPENAI_FALLBACK',
            model: config.openaiModel,
            duration_ms: result.durationMs,
            tokens_used: result.tokensUsed || 0,
            cost_warning: true,
          },
        }).catch(() => {});

        return result;
      } catch (error) {
        processError(ERR.AI_CONNECTION, error, {
          kaynak: 'aiProvider.ts',
          islem: 'OPENAI_COMPLETION',
          model: config.openaiModel,
        }, 'WARNING');
      }
    }
  }

  // ─── ADIM 3: LOKAL KURALLARA DÜŞÜŞ ───────────────────────
  // null döner — çağıran fonksiyon kendi lokal mantığını kullanır
  processError(ERR.AI_PROVIDER_FALLBACK, new Error('Tüm AI sağlayıcılar devre dışı — lokal kurallar devrede'), {
    kaynak: 'aiProvider.ts',
    islem: 'ALL_PROVIDERS_DOWN',
  }, 'WARNING');

  return null;
}

// ─── AKTİF SAĞLAYICI TESPİTİ ───────────────────────────────
// Hangi AI sağlayıcının aktif olduğunu döndürür.
// ─────────────────────────────────────────────────────────────

export interface AIProviderStatus {
  activeProvider: AIProviderType;
  ollama: { enabled: boolean; healthy: boolean; model: string; baseUrl: string };
  openai: { enabled: boolean; hasKey: boolean; model: string };
  costPerRequest: string;
}

export async function getProviderStatus(): Promise<AIProviderStatus> {
  const config = getDefaultConfig();
  const ollamaHealthy = await checkOllamaHealth(config.ollamaBaseUrl);
  const hasOpenAIKey = !!(config.openaiApiKey && config.openaiApiKey !== '' && !config.openaiApiKey.includes('your-api-key'));

  let activeProvider: AIProviderType = 'local';
  let costPerRequest = '0₺ (Lokal Kurallar)';

  if (!config.forceDisableOllama && ollamaHealthy) {
    activeProvider = 'ollama';
    costPerRequest = '0₺ (Ollama Yerel)';
  } else if (!config.forceDisableOpenAI && hasOpenAIKey) {
    activeProvider = 'openai';
    costPerRequest = '~$0.002/istek (OpenAI)';
  }

  return {
    activeProvider,
    ollama: {
      enabled: !config.forceDisableOllama,
      healthy: ollamaHealthy,
      model: config.ollamaModel,
      baseUrl: config.ollamaBaseUrl,
    },
    openai: {
      enabled: !config.forceDisableOpenAI,
      hasKey: hasOpenAIKey,
      model: config.openaiModel,
    },
    costPerRequest,
  };
}

// ─── MODEL LİSTESİ (Ollama) ────────────────────────────────

export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

export async function listOllamaModels(baseUrl?: string): Promise<OllamaModel[]> {
  const url = baseUrl || getDefaultConfig().ollamaBaseUrl;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${url}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const data = await response.json() as { models?: OllamaModel[] };
    return data.models || [];
  } catch {
    return [];
  }
}
