// src/app/api/jobs/route.ts
// GET /api/jobs  → Son 100 iş + istatistik

import { NextResponse } from 'next/server';
import { getJobHistory, getQueueStats } from '@/core/taskQueue';
import { alarmUret, ALARM_SEVIYE } from '@/services/alarmService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const jobs  = getJobHistory();
    const stats = getQueueStats();

    return NextResponse.json({
      success: true,
      jobs,
      stats,
      count: jobs.length,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    void alarmUret({
      modul: 'JOB_MONITOR',
      baslik: 'Jobs API Getirme Hatası',
      aciklama: 'Kuyruk geçmişi API üzerinden getirilirken hata oluştu: ' + errorMessage,
      seviye: ALARM_SEVIYE.CRITICAL,
    }).catch(() => {});

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
