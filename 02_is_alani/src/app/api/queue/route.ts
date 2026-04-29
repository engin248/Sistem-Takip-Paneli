// src/app/api/queue/route.ts
// GET /api/queue — Son 50 iş geçmişi + istatistik + audit log
// NOT: /api/jobs tüm geçmişi döner (audit yok). /api/queue operasyonel sorgulama içindir.
// ============================================================

import { NextResponse } from 'next/server';
import { getJobHistory, getQueueStats } from '@/core/taskQueue';
import { logAudit } from '@/services/auditService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const history = getJobHistory();
    const stats   = getQueueStats();

    await logAudit({
      operation_type     : 'READ',
      action_description : `Kuyruk durumu sorgulandı — ${history.length} iş kaydı`,
      metadata: { action_code: 'QUEUE_STATUS_QUERY', stats },
    }).catch(() => {});

    return NextResponse.json({
      success  : true,
      timestamp: new Date().toISOString(),
      stats,
      jobs     : history.slice(0, 50), // Son 50 iş
    });

  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
