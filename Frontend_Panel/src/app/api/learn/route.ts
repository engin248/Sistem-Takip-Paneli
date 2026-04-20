import { NextRequest, NextResponse } from 'next/server';
import { runSelfLearning } from '@/services/selfLearningEngine';
import { ERR, processError } from '@/lib/errorCore';

// ============================================================
// SELF-LEARNING API ROUTE — /api/learn
// ============================================================
// GET: Varsayılan 24 saat pencere ile analiz
// POST: { windowHours: number } ile özel pencere
//
// ÜST: selfLearningEngine.ts
// ALT: audit_logs
// YAN: middleware.ts rate limit korumalı
// ÖN: Pattern raporunu JSON olarak döner
// ARKA: Proaktif hata önleme ve öğrenme
// ============================================================

export async function GET() {
  try {
    const report = await runSelfLearning(24);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, {
      kaynak: 'api/learn/route.ts',
      islem: 'GET',
    }, 'CRITICAL');

    return NextResponse.json(
      { success: false, error: 'Self-Learning çalıştırılamadı' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const windowHours = Math.min(Math.max(body.windowHours || 24, 1), 720); // 1 saat — 30 gün arası

    const report = await runSelfLearning(windowHours);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, {
      kaynak: 'api/learn/route.ts',
      islem: 'POST',
    }, 'CRITICAL');

    return NextResponse.json(
      { success: false, error: 'Self-Learning çalıştırılamadı' },
      { status: 500 }
    );
  }
}
