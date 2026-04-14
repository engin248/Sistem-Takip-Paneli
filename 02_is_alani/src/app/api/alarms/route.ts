// ============================================================
// ALARM API ROUTE — /api/alarms
// ============================================================
// Kırılım #4 düzeltmesi — Alarm sistemi API
//
// GET: Açık alarmları ve istatistikleri döndür
// ============================================================

import { NextResponse } from 'next/server';
import { getAcikAlarmlar, getAlarmStats } from '@/services/alarmService';
import { ERR, processError } from '@/lib/errorCore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const alarms = getAcikAlarmlar();
    const stats = getAlarmStats();

    return NextResponse.json({
      success: true,
      alarms,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'api/alarms/route.ts',
      islem: 'GET'
    }, 'CRITICAL');

    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
