// src/app/api/agents/[id]/task/route.ts
// POST /api/agents/:id/task — Ajana görev atar, durumunu aktive eder
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { agentRegistry } from '@/services/agentRegistry';
import { logAudit } from '@/services/auditService';

export const dynamic = 'force-dynamic';

interface TaskBody {
  task: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agentId = params.id;

  // ── Ajan kontrolü ─────────────────────────────────────────
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

  // ── Görev metni kontrolü ──────────────────────────────────
  let body: TaskBody;
  try {
    body = await request.json() as TaskBody;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Geçersiz JSON gövdesi' },
      { status: 400 }
    );
  }

  const { task } = body;

  if (!task || typeof task !== 'string' || task.trim().length < 3) {
    return NextResponse.json(
      { success: false, message: 'Görev metni en az 3 karakter olmalıdır' },
      { status: 400 }
    );
  }

  // ── Ajana görevi ata (aktive et) ──────────────────────────
  agentRegistry.updateDurum(agentId, 'aktif');

  // ── Audit log ─────────────────────────────────────────────
  await logAudit({
    operation_type: 'EXECUTE',
    action_description: `Ajana görev atandı: ${agentId} (${agent.kod_adi}) — ${task.trim().slice(0, 100)}`,
    metadata: {
      action_code : 'AGENT_TASK_ASSIGN',
      agent_id    : agentId,
      kod_adi     : agent.kod_adi,
      katman      : agent.katman,
      onceki_durum: agent.durum,
      yeni_durum  : 'aktif',
      gorev_ozeti : task.trim().slice(0, 200),
    },
  }).catch(() => {});

  return NextResponse.json({
    success   : true,
    message   : `Görev alındı — ${agent.kod_adi} aktive edildi`,
    agent_id  : agentId,
    kod_adi   : agent.kod_adi,
    katman    : agent.katman,
    yeni_durum: 'aktif',
    gorev     : task.trim(),
    timestamp : new Date().toISOString(),
  });
}
