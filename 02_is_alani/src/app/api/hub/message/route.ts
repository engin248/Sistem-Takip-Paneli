// src/app/api/hub/message/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { publishMessage } from '@/lib/eventBus';
import { logAudit } from '@/services/auditService';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.text) return NextResponse.json({ success: false, message: 'text required' }, { status: 400 });
    const msg = publishMessage({ source: body.source, target: body.target, text: String(body.text) });

    // Persist to DB hub_messages (best-effort)
    void (async () => {
      try {
        await supabase.from('hub_messages').insert([{ message_id: msg.id, source: msg.source || null, target: msg.target || null, text: msg.text, timestamp: msg.ts }]);
      } catch {
        // ignore
      }
    })();

    void logAudit({ operation_type: 'EXECUTE', action_description: `Hub message published: ${msg.id}`, metadata: { action_code: 'HUB_PUBLISH', message_id: msg.id, source: msg.source, target: msg.target } }).catch(() => {});

    return NextResponse.json({ success: true, msg });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
