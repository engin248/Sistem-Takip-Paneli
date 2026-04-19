// /api/hat/push — RED_LINE_TASKS'a plan fırlatma
import { NextResponse, type NextRequest } from 'next/server';
import { pushToRedLine } from '@/services/hatBridge';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.title) {
      return NextResponse.json({ success: false, message: 'title required' }, { status: 400 });
    }

    const result = pushToRedLine({
      plan_id     : body.plan_id || null,
      title       : String(body.title),
      description : body.description || '',
      assignee    : body.assignee || null,
      priority    : body.priority || 'normal',
      timestamp   : new Date().toISOString(),
      source      : 'PLANLAMA_UI',
    });

    return NextResponse.json({ success: result.success, hat_id: result.hat_id });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
