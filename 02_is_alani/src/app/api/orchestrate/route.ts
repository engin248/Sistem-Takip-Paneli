// src/app/api/orchestrate/route.ts
// POST /api/orchestrate
// ============================================================
// Body: { gorev: string, ajan_id?: string }
// Görevi analiz eder, doğru ajana yönlendirir, çalıştırır.
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { orkestrat } from '@/core/orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: { gorev?: string; ajan_id?: string };

  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ success: false, message: 'Geçersiz JSON' }, { status: 400 });
  }

  const gorev = body.gorev?.trim();
  if (!gorev || gorev.length < 3) {
    return NextResponse.json(
      { success: false, message: '"gorev" alanı gerekli (min 3 karakter)' },
      { status: 400 }
    );
  }

  try {
    const sonuc = await orkestrat(gorev, body.ajan_id);
    return NextResponse.json({
      success        : true,
      gorev,
      atanan_ajan    : sonuc.atanan_ajan_id,
      atama_gerekce  : sonuc.atama_gerekce,
      atama_skoru    : sonuc.atama_skoru,
      worker         : sonuc.worker_result,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
