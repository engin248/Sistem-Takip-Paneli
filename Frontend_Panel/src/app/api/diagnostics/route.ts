// src/app/api/diagnostics/route.ts
import { NextResponse } from 'next/server';
import { agentRegistry } from '@/services/agentRegistry';
import { getProviderStatus } from '@/lib/aiProvider';
import { getCBDurum } from '@/core/circuitBreaker';
import { logAudit } from '@/services/auditService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = agentRegistry.getStats();
    const agents = agentRegistry.getAll();
    const aiStatus = await getProviderStatus().catch(() => null);
    const cb = getCBDurum ? getCBDurum() : null;

    // Audit
    void logAudit({
      operation_type: 'READ',
      action_description: `Diagnostics queried`,
      metadata: { action_code: 'DIAGNOSTICS_QUERY', toplam_ajan: stats.toplam },
    }).catch(() => {});

    return NextResponse.json({ success: true, stats, agents_count: agents.length, aiStatus, circuitBreaker: cb });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
