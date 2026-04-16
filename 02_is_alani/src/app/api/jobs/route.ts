// src/app/api/jobs/route.ts
// GET /api/jobs  → Son 100 iş + istatistik

import { NextResponse } from 'next/server';
import { getJobHistory, getQueueStats } from '@/core/taskQueue';

export const dynamic = 'force-dynamic';

export async function GET() {
  const jobs  = getJobHistory();
  const stats = getQueueStats();

  return NextResponse.json({
    success: true,
    jobs,
    stats,
    count: jobs.length,
  });
}
