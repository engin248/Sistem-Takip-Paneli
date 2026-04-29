// src/app/api/agents/[id]/task/route.ts
// POST /api/agents/:id/task — Ajana görev atar, WORKER ile icra eder
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { runAgentWorker } from '@/core/agentWorker';
import { agentRegistry }  from '@/services/agentRegistry';

export const dynamic = 'force-dynamic';

interface TaskBody {
  task    : string;
  priority?: number;
  use_rag ?: boolean;
  use_web ?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;

  // ── Ajan var mı? ─────────────────────────────────────────
  const agent = agentRegistry.getById(agentId);
  if (!agent) {
    return NextResponse.json(
      { success: false, message: `Ajan bulunamadı: ${agentId}` },
      { status: 404 }
    );
  }

  // ── Devre dışı kontrolü ───────────────────────────────────
  if (agent.durum === 'devre_disi') {
    return NextResponse.json(
      { success: false, message: `Ajan devre dışı: ${agentId} (${agent.kod_adi})` },
      { status: 403 }
    );
  }

  // ── Body parse ───────────────────────────────────────────
  let body: TaskBody;
  try {
    body = await request.json() as TaskBody;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Geçersiz JSON gövdesi' },
      { status: 400 }
    );
  }

  const { task, priority = 2, use_rag = true, use_web = false } = body;

  if (!task || typeof task !== 'string' || task.trim().length < 3) {
    return NextResponse.json(
      { success: false, message: 'Görev metni en az 3 karakter olmalıdır' },
      { status: 400 }
    );
  }

  // ── WORKER ile icra et ─────────────────────────────────────────────
  try {
    const workerResult = await runAgentWorker({
      agent_id : agentId,
      task     : task.trim(),
      priority,
      use_rag,
      use_web,
    });

    return NextResponse.json({
      success       : workerResult.status === 'tamamlandi',
      message       : workerResult.status === 'tamamlandi'
        ? `${workerResult.kod_adi} görevi tamamladı (${workerResult.ai_kullandi ? 'AI' : 'LOKAL'}, ${workerResult.duration_ms}ms)`
        : `Görev başarısız: ${workerResult.status}`,
      job_id        : workerResult.job_id,
      agent_id      : workerResult.agent_id,
      kod_adi       : workerResult.kod_adi,
      katman        : workerResult.katman,
      status        : workerResult.status,
      ai_kullandi   : workerResult.ai_kullandi,
      rag_kullandi  : workerResult.rag_kullandi,
      web_kullandi  : workerResult.web_kullandi,
      arac_kullandi : workerResult.arac_kullandi,
      iterasyon     : workerResult.iterasyon,
      duration_ms   : workerResult.duration_ms,
      result        : workerResult.result,
      timestamp     : workerResult.timestamp,
    });

  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : 'Worker hatası',
      },
      { status: 500 }
    );
  }
}
