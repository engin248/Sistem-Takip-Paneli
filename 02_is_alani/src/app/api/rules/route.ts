// src/app/api/rules/route.ts
// GET /api/rules              → Tüm kurallar
// GET /api/rules?katman=L1   → Katmana özel kurallar
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  EVRENSEL_KURALLAR,
  KATMAN_KURALLARI,
  CALISMA_KURALLARI,
  getKatmanKurallari,
  TOPLAM_KURAL_SAYISI,
} from '@/core/agentRules';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const katman = searchParams.get('katman');

  if (katman) {
    const kurallar = getKatmanKurallari(katman.toUpperCase());
    return NextResponse.json({
      success : true,
      katman  : katman.toUpperCase(),
      toplam  : kurallar.length,
      kurallar,
    });
  }

  return NextResponse.json({
    success       : true,
    toplam_kural  : TOPLAM_KURAL_SAYISI,
    evrensel      : { adet: EVRENSEL_KURALLAR.length,  kurallar: EVRENSEL_KURALLAR },
    katman_kurali : { adet: KATMAN_KURALLARI.length,   kurallar: KATMAN_KURALLARI },
    calisma       : { adet: CALISMA_KURALLARI.length,  kurallar: CALISMA_KURALLARI },
    katmanlar     : ['KOMUTA', 'L1', 'L2', 'L3', 'DESTEK'],
  });
}
