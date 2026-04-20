// /api/hat/push — RED_LINE_TASKS + Komut Zinciri entegrasyonu
import { NextResponse, type NextRequest } from 'next/server';
import { pushToRedLine } from '@/services/hatBridge';
import { komutGonder } from '@/services/komutZinciriService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.title) {
      return NextResponse.json({ success: false, message: 'title required' }, { status: 400 });
    }

    // 1. Mevcut RED_LINE push (geriye uyumluluk)
    const hatResult = pushToRedLine({
      plan_id     : body.plan_id || null,
      title       : String(body.title),
      description : body.description || '',
      assignee    : body.assignee || null,
      priority    : body.priority || 'normal',
      timestamp   : new Date().toISOString(),
      source      : 'PLANLAMA_UI',
    });

    // 2. Komut Zinciri'ne gönder (GorevKabul → algıla + sentezle)
    let komutSonuc = null;
    try {
      komutSonuc = komutGonder(
        String(body.title) + (body.description ? ` — ${body.description}` : ''),
        'YAZILI',
        'PANEL',
      );
    } catch {
      // KomutZinciri yüklenemezse sessiz devam — mevcut akış bozulmasın
    }

    return NextResponse.json({
      success: hatResult.success,
      hat_id: hatResult.hat_id,
      komut: komutSonuc ? {
        komut_id:     komutSonuc.komut_id,
        anlasilan:    komutSonuc.anlasilan,
        niyet:        komutSonuc.niyet,
        alan:         komutSonuc.alan,
        onay_gerekli: komutSonuc.onay_gerekli,
      } : null,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
