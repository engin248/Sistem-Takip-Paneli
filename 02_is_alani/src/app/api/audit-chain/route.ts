// src/app/api/audit-chain/route.ts
// GET /api/audit-chain?n=20  → Son N local audit kaydı
// GET /api/audit-chain/verify → Zincir bütünlük kontrolü
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { readRecentEntries, verifyChain } from '@/core/localAudit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'verify') {
    const sonuc = verifyChain();
    return NextResponse.json({ success: true, ...sonuc });
  }

  const n       = parseInt(searchParams.get('n') || '20', 10);
  const entries = readRecentEntries(Math.min(n, 100));

  return NextResponse.json({
    success    : true,
    kayit_sayisi: entries.length,
    kayitlar   : entries,
  });
}
