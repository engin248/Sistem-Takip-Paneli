// src/app/api/rag/route.ts
// GET /api/rag?q=sorgu&max=5
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { ragSorgula, getArsivDurumu }     from '@/services/ragService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sorgu = searchParams.get('q')?.trim() || '';
  const max   = parseInt(searchParams.get('max') || '5', 10);

  // Arşiv durumu sorgusuysa
  if (sorgu === '__status__') {
    const belgeler = getArsivDurumu();
    return NextResponse.json({
      success    : true,
      arsiv_yolu : process.env.RAG_ARSIV_DIR || 'C:\\Users\\Esisya\\Desktop\\KONSOLIDE_ARSIV',
      belge_sayisi: belgeler.length,
      belgeler,
    });
  }

  if (!sorgu || sorgu.length < 2) {
    return NextResponse.json(
      { success: false, message: 'Sorgu en az 2 karakter olmalı' },
      { status: 400 }
    );
  }

  const yanit = ragSorgula(sorgu, Math.min(max, 10));

  return NextResponse.json({
    success     : true,
    sorgu,
    toplam_hit  : yanit.toplamHit,
    sonuc_sayisi: yanit.sonuclar.length,
    kaynaklar   : yanit.kaynaklar,
    sonuclar    : yanit.sonuclar,
  });
}
