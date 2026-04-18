// src/app/api/agents/route.ts
// GET /api/agents — 16 ajanlık kadronun anlık durumu
// ============================================================

import { NextResponse } from 'next/server';
import { agentRegistry } from '@/services/agentRegistry';
import { logAudit } from '@/services/auditService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const agents = agentRegistry.getAll();
    const stats  = agentRegistry.getStats();

    // Audit log işlemini izole et
    try {
      await logAudit({
        operation_type: 'READ',
        action_description: `Agent kadrosu sorgulandı — ${agents.length} ajan`,
        metadata: {
          action_code: 'AGENT_STATUS_QUERY',
          toplam: stats.toplam,
          aktif:  stats.aktif,
          pasif:  stats.pasif,
        },
      });
    } catch (e) {
      console.warn('[AUDIT_SKIP] Agent list log failed:', e);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
      agents,
    });

  } catch (err) {
    console.error('[API_500] /api/agents:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
