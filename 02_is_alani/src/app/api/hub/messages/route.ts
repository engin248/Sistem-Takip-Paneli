// src/app/api/hub/messages/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { getRecentMessages } from '@/lib/eventBus';
import { logAudit } from '@/services/auditService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rawLimit = request.nextUrl.searchParams.get('limit');
    const parsedLimit = Number.parseInt(rawLimit ?? '50', 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 200) : 50;
    const messages = getRecentMessages(limit);

    void logAudit({
      operation_type: 'READ',
      action_description: `Hub messages fetched: ${messages.length}`,
      metadata: { action_code: 'HUB_FETCH', count: messages.length },
    }).catch(() => {});

    return NextResponse.json({ success: true, messages, count: messages.length });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
