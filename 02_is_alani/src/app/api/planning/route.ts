// src/app/api/planning/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createPlan, getPlans } from '@/services/planningService';
import { pushToRedLine } from '@/services/hatBridge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plans = getPlans();
    return NextResponse.json({ success: true, plans });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.title) return NextResponse.json({ success: false, message: 'title required' }, { status: 400 });
    const plan = createPlan({ title: String(body.title), description: body.description, assignee: body.assignee, start_at: body.start_at, due_at: body.due_at });

    // RED_LINE_TASKS'a fırlat — manager.lpush('RED_LINE_TASKS', payload)
    try {
      pushToRedLine({
        plan_id    : plan.id,
        title      : plan.title,
        description: plan.description || '',
        assignee   : plan.assignee || undefined,
        priority   : 'normal',
        timestamp  : new Date().toISOString(),
        source     : 'PLANNING_API',
      });
    } catch (e) {
      console.warn('[PLANNING] RED_LINE push failed:', e);
    }

    return NextResponse.json({ success: true, plan });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
