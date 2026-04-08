// ============================================================
// BOARD API ROUTE — Yönetim Kurulu Karar Endpoint
// ============================================================
// POST: Yeni karar oluşturur ve 3 AI ajan konsensüs oylaması yapar
// GET: Karar geçmişini döndürür
// Hata Kodları: ERR-STP001-018, 019, 020, 021, 022
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAndVoteDecision, fetchBoardDecisions } from '@/services/boardService';
import { ERR, processError } from '@/lib/errorCore';
import type { DecisionCategory } from '@/services/consensusEngine';

const VALID_CATEGORIES: DecisionCategory[] = [
  'DEPLOYMENT', 'SCHEMA_CHANGE', 'SECURITY', 'ROLLBACK', 'CONFIG_CHANGE',
];

// ─── POST: Yeni Karar + Konsensüs Oylama ────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category } = body as {
      title?: string;
      description?: string;
      category?: string;
    };

    // Validasyon
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Karar başlığı zorunludur.' },
        { status: 400 }
      );
    }

    if (!category || !VALID_CATEGORIES.includes(category as DecisionCategory)) {
      return NextResponse.json(
        { success: false, error: `Geçersiz kategori. Geçerli: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await createAndVoteDecision({
      title: title.trim(),
      description: description?.trim(),
      category: category as DecisionCategory,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      decision: result.decision,
    });
  } catch (error) {
    processError(ERR.BOARD_CREATE, error, {
      kaynak: 'api/board/decide/route.ts',
      islem: 'POST',
    });

    return NextResponse.json(
      { success: false, error: 'Kurul kararı işlenirken hata oluştu.' },
      { status: 500 }
    );
  }
}

// ─── GET: Karar Geçmişi ─────────────────────────────────────
export async function GET() {
  try {
    const decisions = await fetchBoardDecisions();

    return NextResponse.json({
      success: true,
      decisions,
      count: decisions.length,
    });
  } catch (error) {
    processError(ERR.BOARD_FETCH, error, {
      kaynak: 'api/board/decide/route.ts',
      islem: 'GET',
    });

    return NextResponse.json(
      { success: false, error: 'Kurul kararları alınamadı.' },
      { status: 500 }
    );
  }
}
