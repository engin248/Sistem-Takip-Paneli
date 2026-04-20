// /api/hat/data — DATA_LINE buffer okuma (Canlı Metrikler)
import { NextResponse } from 'next/server';
import { getMetricBuffer, getHatStats } from '@/services/hatBridge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const metrics = getMetricBuffer();
    const stats   = getHatStats();

    return NextResponse.json({
      success   : true,
      timestamp : new Date().toISOString(),
      count     : metrics.length,
      stats,
      metrics,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
