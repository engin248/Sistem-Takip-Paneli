// ============================================================
// ALARM API ROUTE — /api/alarms
// ============================================================
// Kırılım #4 düzeltmesi — Alarm sistemi API
//
// GET:   Açık alarmları ve istatistikleri döndür
// PATCH: Alarm durumunu güncelle (ÇÖZÜLDÜ yapma)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAcikAlarmlar, getAlarmStats, alarmDurumGuncelle, ALARM_DURUM } from '@/services/alarmService';
import { ERR, processError } from '@/lib/errorCore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const alarms = getAcikAlarmlar();
    const stats = getAlarmStats();

    return NextResponse.json({
      success: true,
      alarms,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'api/alarms/route.ts',
      islem: 'GET'
    }, 'CRITICAL');

    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// ─── POST: Yeni Alarm Üret (Frontend'den Gelenler) ────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      modul?: string;
      baslik?: string;
      aciklama?: string;
      seviye?: string;
    };

    if (!body.modul || !body.baslik || !body.aciklama) {
      return NextResponse.json(
        { success: false, error: 'modul, baslik ve aciklama zorunludur' },
        { status: 400 }
      );
    }

    // alarmUret is backend-only, it generates or increments the alarm.
    const { alarmUret, ALARM_SEVIYE } = await import('@/services/alarmService');

    const mappedSeviye = (body.seviye && Object.values(ALARM_SEVIYE).includes(body.seviye as any))
      ? (body.seviye as any)
      : ALARM_SEVIYE.WARNING;

    const sonuc = await alarmUret({
      modul: body.modul,
      baslik: body.baslik,
      aciklama: body.aciklama,
      seviye: mappedSeviye,
    });

    return NextResponse.json({
      success: true,
      alarm: sonuc.alarm,
      yeni: sonuc.yeni,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'api/alarms/route.ts',
      islem: 'POST'
    }, 'CRITICAL');

    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

// ─── PATCH: Alarm Durumu Güncelle (Çöz / Görüldü) ──────────
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as {
      modul?: string;
      baslik?: string;
      durum?: string;
    };

    if (!body.modul || !body.baslik) {
      return NextResponse.json(
        { success: false, error: 'modul ve baslik alanları zorunludur' },
        { status: 400 }
      );
    }

    const hedefDurum = body.durum === 'GORULDU' ? ALARM_DURUM.GORULDU : ALARM_DURUM.COZULDU;
    const sonuc = await alarmDurumGuncelle(body.modul, body.baslik, hedefDurum);

    if (!sonuc) {
      return NextResponse.json(
        { success: false, error: 'Alarm bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Alarm durumu güncellendi → ${hedefDurum}`,
      modul: body.modul,
      baslik: body.baslik,
      durum: hedefDurum,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'api/alarms/route.ts',
      islem: 'PATCH'
    }, 'CRITICAL');

    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
