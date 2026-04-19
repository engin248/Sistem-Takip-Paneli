// /api/hat/onay — Yönetici komut onayı
import { NextResponse, type NextRequest } from 'next/server';
import { onayVer, bekleyenKomutlar } from '@/services/komutZinciriService';

export const dynamic = 'force-dynamic';

// GET — Bekleyen onayları listele
export async function GET() {
  try {
    const bekleyenler = bekleyenKomutlar();
    return NextResponse.json({ success: true, bekleyenler, toplam: bekleyenler.length });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// POST — Onay ver (EVET/HAYIR)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.komut_id) {
      return NextResponse.json({ success: false, message: 'komut_id required' }, { status: 400 });
    }

    const onay = body.onay === true || body.onay === 'EVET';
    const duzeltme = body.duzeltme || undefined;

    const sonuc = onayVer(body.komut_id, onay, duzeltme);

    return NextResponse.json({
      success: sonuc.basarili,
      durum: sonuc.durum,
      komut_id: sonuc.komut_id,
      gorev_id: sonuc.gorev_id || null,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
