// ============================================================
// TELEGRAM WEBHOOK — Next.js API Route
// ============================================================
// Telegram Bot API'den gelen webhook çağrılarını işler.
// Grammy bot framework'ü ile entegre çalışır.
//
// Endpoint: POST /api/telegram
// Telegram Webhook URL: https://<domain>/api/telegram
//
// Kontrol Zinciri:
//   L0 → CONTROL()      : Generic null/boş/NaN gatekeeper
//   L1 → isTelegramBotAvailable() : Token doğrulama
//
// Hata Kodları:
//   ERR-STP001-016 → Telegram mesaj gönderilemedi
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { handleWebhookUpdate, isTelegramBotAvailable } from '@/services/telegramService';
import { ERR, processError } from '@/lib/errorCore';
import { CONTROL } from '@/core/control_engine';

// ─── POST: Telegram Webhook ─────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Bot token kontrolü
    if (!isTelegramBotAvailable()) {
      return NextResponse.json(
        { error: 'Telegram bot yapılandırılmamış' },
        { status: 503 }
      );
    }

    // Request body'yi parse et
    const update = await req.json();

    // ── L0 GATEKEEPER: CONTROL() ────────────────────────────
    // Ham payload sisteme girmeden önce doğrulanır.
    const ctrl = CONTROL('TELEGRAM_WEBHOOK_PAYLOAD', update);
    if (!ctrl.pass) {
      return NextResponse.json(
        { error: `Geçersiz payload [${ctrl.reason}]`, proof: ctrl.proof },
        { status: 400 }
      );
    }

    if (typeof update !== 'object' || Array.isArray(update)) {
      return NextResponse.json(
        { error: 'Geçersiz payload — obje bekleniyor' },
        { status: 400 }
      );
    }

    // Grammy bot handler'a ilet
    await handleWebhookUpdate(update);

    // Telegram'a 200 OK döndür (zorunlu)
    return NextResponse.json({ ok: true });
  } catch (error) {
    processError(ERR.TELEGRAM_SEND, error, {
      kaynak: 'api/telegram/route.ts',
      islem: 'WEBHOOK_POST'
    });

    // Telegram'a 200 OK döndür — hata durumunda bile
    // (aksi halde Telegram webhook'u tekrar tekrar gönderir)
    return NextResponse.json({ ok: true });
  }
}

// ─── GET: Webhook Durum Kontrolü ────────────────────────────
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    service: 'STP Telegram Bot Webhook',
    status: isTelegramBotAvailable() ? 'active' : 'unconfigured',
    timestamp: new Date().toISOString(),
    version: 'RELEASE-1.0-STP'
  });
}
