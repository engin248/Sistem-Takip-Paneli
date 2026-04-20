// src/app/api/circuit-breaker/route.ts
// GET  /api/circuit-breaker → Durum
// POST /api/circuit-breaker action=reset → Sıfırla
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { getCBDurum, sifirla } from '@/core/circuitBreaker';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ success: true, ...getCBDurum() });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}) as Record<string, string>);
  if ((body as Record<string, string>).action === 'reset') {
    sifirla();
    return NextResponse.json({ success: true, message: 'Circuit Breaker sıfırlandı', ...getCBDurum() });
  }
  return NextResponse.json({ success: false, message: 'Geçersiz action' }, { status: 400 });
}
