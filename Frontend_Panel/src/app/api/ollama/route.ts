// ============================================================
// OLLAMA API ROUTE — Yerel AI Yönetim Endpoint'i
// ============================================================
// GET  → Ollama sağlık durumu ve model listesi
// POST → AI analiz, kurul oylama, metin üretimi, model yönetimi
//
// OTORİTE HARİTASI (tek kaynak ilkesi):
//   analyze → aiManager.analyzeTaskPriority()   (görev öncelik)
//   vote    → consensusEngine.runBoardVoting()   (kurul oylama)
//   generate→ aiProvider.aiComplete()            (metin üretimi)
//   pull    → ollamaBridge.pullModel()           (model yönetimi)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getOllamaBridgeHealth,
  pullModel,
  generateCostReport,
} from '@/services/ollamaBridge';
import { getProviderStatus, aiComplete } from '@/lib/aiProvider';
import { agentRegistry } from '@/services/agentRegistry';
import { analyzeTaskPriority } from '@/services/aiManager';
import { runBoardVoting } from '@/services/consensusEngine';
import type { DecisionCategory } from '@/services/consensusEngine';
import { processError, ERR } from '@/lib/errorCore';
import { CONTROL } from '@/core/control_engine';

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
      costReport: generateCostReport(0, 0),
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

    // ── L0 GATEKEEPER: CONTROL() ──────────────────────────────
    const ctrl = CONTROL('OLLAMA_API_PAYLOAD', body);
    if (!ctrl.pass) {
      return NextResponse.json({
        success: false,
        error: `Geçersiz payload [${ctrl.reason}]`,
        proof: ctrl.proof
      }, { status: 400 });
    }
    if (!body.action) {
      return NextResponse.json({
        success: false,
        error: 'action alanı zorunlu: analyze | vote | generate | pull_model | status',
      }, { status: 400 });
    }

    switch (body.action) {

      // ── GÖREV ÖNCELİK ANALİZİ — aiManager (tek otorite) ───
      case 'analyze': {
        if (!body.taskTitle) {
          return NextResponse.json({
            success: false,
            error: 'taskTitle alanı zorunlu',
          }, { status: 400 });
        }

        const result = await analyzeTaskPriority(
          body.taskTitle,
          body.taskDescription,
          { useAI: true, timeoutMs: 15000 }
        );

        return NextResponse.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        });
      }

      // ── KURUL OYLAMA — consensusEngine (tek otorite) ────────
      case 'vote': {
        if (!body.title || !body.category) {
          return NextResponse.json({
            success: false,
            error: 'title ve category alanları zorunlu',
          }, { status: 400 });
        }

        const result = await runBoardVoting({
          title: body.title,
          description: body.description || '',
          category: body.category,
        });

        return NextResponse.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        });
      }

      // ── GENEL METİN ÜRETİMİ — aiProvider (doğrudan) ────────
      case 'generate': {
        if (!body.systemPrompt || !body.userMessage) {
          return NextResponse.json({
            success: false,
            error: 'systemPrompt ve userMessage alanları zorunlu',
          }, { status: 400 });
        }

        const result = await aiComplete({
          systemPrompt: body.systemPrompt,
          userMessage: body.userMessage,
          temperature: body.temperature,
          maxTokens: body.maxTokens,
          jsonMode: body.jsonMode,
        }, { forceDisableOpenAI: true });

        return NextResponse.json({
          success: !!result,
          data: result
            ? {
              content: result.content,
              provider: result.provider,
              model: result.model,
              durationMs: result.durationMs,
            }
            : null,
          timestamp: new Date().toISOString(),
        });
      }

      // ── MODEL İNDİRME — ollamaBridge.pullModel ──────────────
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

      // ── DURUM RAPORU ─────────────────────────────────────────
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
