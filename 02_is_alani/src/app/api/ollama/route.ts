// ============================================================
// OLLAMA API ROUTE — Yerel AI Köprüsü Endpoint
// ============================================================
// GET  → Ollama sağlık durumu ve model listesi
// POST → AI analiz, oylama, metin üretimi
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getOllamaBridgeHealth,
  analyzeTaskWithOllama,
  voteWithOllama,
  generateText,
  pullModel,
  generateCostReport,
} from '@/services/ollamaBridge';
import { getProviderStatus } from '@/lib/aiProvider';
import { agentRegistry } from '@/services/agentRegistry';
import { processError, ERR } from '@/lib/errorCore';
import type { AgentRole, DecisionCategory } from '@/services/consensusEngine';

// ─── GET: Sağlık kontrolü + durum raporu ────────────────────

export async function GET() {
  try {
    const [health, providerStatus, agentStats] = await Promise.all([
      getOllamaBridgeHealth(),
      getProviderStatus(),
      Promise.resolve(agentRegistry.getStats()),
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ollama: {
        running: health.running,
        baseUrl: health.baseUrl,
        model: health.model,
        availableModels: health.availableModels.map(m => m.name),
        latencyMs: health.latencyMs,
      },
      provider: providerStatus,
      agents: agentStats,
      costReport: generateCostReport(0, 0), // İlk çağrıda boş
    }, { status: 200 });
  } catch (error) {
    processError(ERR.OLLAMA_CONNECTION, error, {
      kaynak: 'api/ollama/route.ts',
      islem: 'GET_HEALTH',
    });

    return NextResponse.json({
      success: false,
      error: 'Ollama sağlık kontrolü başarısız',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// ─── POST: AI işlemleri ─────────────────────────────────────

interface OllamaPostBody {
  action: 'analyze' | 'vote' | 'generate' | 'pull_model' | 'status';
  // analyze
  taskTitle?: string;
  taskDescription?: string;
  // vote
  agent?: AgentRole;
  title?: string;
  description?: string;
  category?: DecisionCategory;
  // generate
  systemPrompt?: string;
  userMessage?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  // pull_model
  modelName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as OllamaPostBody;

    if (!body.action) {
      return NextResponse.json({
        success: false,
        error: 'action alanı zorunlu: analyze | vote | generate | pull_model | status',
      }, { status: 400 });
    }

    switch (body.action) {
      // ── GÖREV ÖNCELİK ANALİZİ ──────────────────────────────
      case 'analyze': {
        if (!body.taskTitle) {
          return NextResponse.json({
            success: false,
            error: 'taskTitle alanı zorunlu',
          }, { status: 400 });
        }

        const result = await analyzeTaskWithOllama(body.taskTitle, body.taskDescription);

        return NextResponse.json({
          success: !!result,
          data: result,
          fallback: result === null ? 'Ollama devre dışı — lokal kurallar gerekli' : undefined,
          timestamp: new Date().toISOString(),
        });
      }

      // ── KONSENSÜS OYLAMA ────────────────────────────────────
      case 'vote': {
        if (!body.agent || !body.title || !body.category) {
          return NextResponse.json({
            success: false,
            error: 'agent, title ve category alanları zorunlu',
          }, { status: 400 });
        }

        const vote = await voteWithOllama(
          body.agent,
          body.title,
          body.description || '',
          body.category
        );

        return NextResponse.json({
          success: !!vote,
          data: vote,
          timestamp: new Date().toISOString(),
        });
      }

      // ── GENEL METİN ÜRETİMİ ────────────────────────────────
      case 'generate': {
        if (!body.systemPrompt || !body.userMessage) {
          return NextResponse.json({
            success: false,
            error: 'systemPrompt ve userMessage alanları zorunlu',
          }, { status: 400 });
        }

        const result = await generateText(body.systemPrompt, body.userMessage, {
          temperature: body.temperature,
          maxTokens: body.maxTokens,
          jsonMode: body.jsonMode,
        });

        return NextResponse.json({
          success: !!result,
          data: result ? {
            content: result.content,
            provider: result.provider,
            model: result.model,
            durationMs: result.durationMs,
          } : null,
          timestamp: new Date().toISOString(),
        });
      }

      // ── MODEL İNDİRME ───────────────────────────────────────
      case 'pull_model': {
        if (!body.modelName) {
          return NextResponse.json({
            success: false,
            error: 'modelName alanı zorunlu',
          }, { status: 400 });
        }

        const result = await pullModel(body.modelName);

        return NextResponse.json({
          success: result.success,
          error: result.error,
          timestamp: new Date().toISOString(),
        });
      }

      // ── DURUM RAPORU ────────────────────────────────────────
      case 'status': {
        const [health, providerStatus] = await Promise.all([
          getOllamaBridgeHealth(),
          getProviderStatus(),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            ollama: health,
            provider: providerStatus,
            agents: agentRegistry.getStats(),
          },
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Bilinmeyen action: ${body.action}. Geçerli: analyze, vote, generate, pull_model, status`,
        }, { status: 400 });
    }
  } catch (error) {
    processError(ERR.OLLAMA_CONNECTION, error, {
      kaynak: 'api/ollama/route.ts',
      islem: 'POST',
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Ollama API hatası',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
