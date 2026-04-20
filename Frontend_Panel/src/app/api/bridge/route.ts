// ============================================================
// BRIDGE API — DIŞ SİSTEM SORGULAMA ENDPOINT'İ
// ============================================================
// GET /api/bridge → Dış sistemin tam özet durumunu döndürür
// ============================================================

import { NextResponse } from 'next/server';
import { getSystemSummary } from '@/services/bridgeService';
import { ERR, processError } from '@/lib/errorCore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const summary = await getSystemSummary();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...summary,
    });
  } catch (err) {
    processError(ERR.BRIDGE_QUERY, err, {
      kaynak: 'bridge/route.ts',
      islem: 'GET',
    }, 'CRITICAL');

    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
