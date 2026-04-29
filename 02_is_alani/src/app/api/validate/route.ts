import { NextResponse } from 'next/server';
import { runL2Validation } from '@/services/l2Validator';
import { ERR, processError } from '@/lib/errorCore';

// ============================================================
// L2 VALIDATOR API ROUTE — /api/validate
// ============================================================
// GET: L2 bağımsız denetim çalıştır
//
// ÜST: l2Validator.ts
// ALT: audit_logs + tasks + board_decisions
// YAN: middleware.ts rate limit korumalı
// ÖN: Denetim raporunu JSON olarak döner
// ARKA: Otonom sistem bütünlük kontrolü
// ============================================================

export async function GET() {
  try {
    const report = await runL2Validation();

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, {
      kaynak: 'api/validate/route.ts',
      islem: 'GET',
    }, 'CRITICAL');

    return NextResponse.json(
      { success: false, error: 'L2 Validator çalıştırılamadı' },
      { status: 500 }
    );
  }
}
