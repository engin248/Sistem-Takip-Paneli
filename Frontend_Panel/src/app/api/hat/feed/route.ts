// /api/hat/feed — LOG_LINE buffer okuma (Aktivite Akışı)
import { NextResponse } from 'next/server';
import { getLogBuffer, getHatStats } from '@/services/hatBridge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs  = getLogBuffer();
    const stats = getHatStats();

    return NextResponse.json({
      success   : true,
      timestamp : new Date().toISOString(),
      count     : logs.length,
      stats,
      logs,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
