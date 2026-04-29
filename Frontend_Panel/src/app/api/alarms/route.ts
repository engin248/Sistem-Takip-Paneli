// ============================================================
// /api/alarms — Gerçek Alarm Endpoint'i
// ============================================================
// KÖK NEDEN: 10 satır, sabit boş dizi dönüyordu.
// Etki Alanı: HealthDashboard, NotificationBell
// Çözüm: alarmService üzerinden gerçek veri çek/oluştur
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAcikAlarmlar, alarmOlustur } from '@/services/alarmService';

export async function GET() {
    try {
        const alarmlar = await getAcikAlarmlar();
        return NextResponse.json({
            success: true,
            alarms: alarmlar,
            count: alarmlar.length,
            zaman: new Date().toISOString(),
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[/api/alarms GET] Hata:', msg);
        return NextResponse.json(
            { success: false, error: msg, alarms: [] },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        if (!body.baslik || !body.tip) {
            return NextResponse.json(
                { success: false, error: 'baslik ve tip alanları zorunludur' },
                { status: 400 }
            );
        }

        const sonuc = await alarmOlustur({
            tip: body.tip,
            baslik: body.baslik,
            aciklama: body.aciklama || '',
            kaynak: body.kaynak || 'API',
        });

        return NextResponse.json(sonuc, { status: sonuc.success ? 201 : 500 });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[/api/alarms POST] Hata:', msg);
        return NextResponse.json(
            { success: false, error: msg },
            { status: 500 }
        );
    }
}
