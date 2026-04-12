// ============================================================
// ALARM API ROUTE — /api/alarms
// ============================================================
// Kırılım #4 düzeltmesi — Alarm sistemi API
//
// GET: Açık alarmları ve istatistikleri döndür
// ============================================================

import { NextResponse } from 'next/server';
import { getAcikAlarmlar, getAlarmStats } from '@/services/alarmService';

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
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
