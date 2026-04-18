// src/app/api/bootstrap/dev/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { agentRegistry } from '@/services/agentRegistry';
import { logAudit } from '@/services/auditService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Optional body to control behavior in future
    const body = await request.json().catch(() => ({}));

    const res = agentRegistry.reinitialize();

    void logAudit({
      operation_type: 'EXECUTE',
      action_description: `Dev bootstrap: agent registry reinitialized`,
      metadata: { action_code: 'DEV_BOOTSTRAP', success: res.success, toplam: res.toplam, body },
    }).catch(() => {});

    return NextResponse.json({ success: res.success, toplam: res.toplam });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
