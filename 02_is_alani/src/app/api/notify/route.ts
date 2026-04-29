import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramNotification, formatSystemAlert, isTelegramNotificationAvailable } from '@/services/telegramNotifier';
import { ERR, processError } from '@/lib/errorCore';
import { CONTROL } from '@/core/control_engine';

// ============================================================
// TELEGRAM BİLDİRİM API — /api/notify
// ============================================================
// POST: { message, severity?, title? }
// GET: Bağlantı durumu kontrolü
//
// ÜST: telegramNotifier.ts
// ALT: Telegram Bot API (HTTP)
// YAN: middleware.ts rate limit korumalı
// ÖN: Operatöre/kurucuya bildirim
// ARKA: İzlenebilirlik + otonom bildirim
// ============================================================

export async function GET() {
  return NextResponse.json({
    success: true,
    available: isTelegramNotificationAvailable(),
    message: isTelegramNotificationAvailable()
      ? 'Telegram bildirim hazır'
      : 'TELEGRAM_BOT_TOKEN veya CHAT_ID yapılandırılmamış',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── L0 GATEKEEPER: CONTROL() ──────────────────────────────
    const ctrl = CONTROL('NOTIFY_API_PAYLOAD', body);
    if (!ctrl.pass) {
      return NextResponse.json(
        { success: false, error: `Geçersiz payload [${ctrl.reason}]`, proof: ctrl.proof },
        { status: 400 }
      );
    }

    const { message, title, severity } = body as {
      message: string;
      title?: string;
      severity?: string;
    };

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'message alanı zorunludur' },
        { status: 400 }
      );
    }

    const formatted = title
      ? formatSystemAlert(title, message, severity || 'INFO')
      : message;

    const result = await sendTelegramNotification(formatted);

    return NextResponse.json(result);
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, {
      kaynak: 'api/notify/route.ts',
      islem: 'POST',
    });

    return NextResponse.json(
      { success: false, error: 'Bildirim gönderilemedi' },
      { status: 500 }
    );
  }
}
