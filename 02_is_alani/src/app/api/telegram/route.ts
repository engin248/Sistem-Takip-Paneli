// ============================================================
// TELEGRAM WEBHOOK — Next.js API Route
// ============================================================
// Endpoint: POST /api/telegram
// Telegram Webhook URL: https://sistem-takip-paneli.vercel.app/api/telegram
//
// Kontrol Zinciri:
//   L0 → isTelegramBotAvailable()  : Token varlık kontrolü
//   L1 → X-Telegram-Bot-Api-Secret-Token : Webhook gizli token
//   L2 → CONTROL()                 : Payload null/boş kontrolü
//   L3 → handleWebhookUpdate()     : Grammy handler
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
  // ── L0: Bot Token Varlık Kontrolü ────────────────────────
  if (!isTelegramBotAvailable()) {
    return NextResponse.json(
      { error: 'Telegram bot yapılandırılmamış — TELEGRAM_BOT_TOKEN eksik' },
      { status: 503 }
    );
  }

  // ── L1: Webhook Secret Token Doğrulama ──────────────────
  // Telegram → setWebhook() sırasında secret_token verilmişse,
  // her POST'da X-Telegram-Bot-Api-Secret-Token header'ı gönderir.
  // Şu an secret_token kullanılmıyor — header yoksa kabul et.
  // Gelecekte: TELEGRAM_WEBHOOK_SECRET env ile aktifleştir.
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const incoming = req.headers.get('x-telegram-bot-api-secret-token');
    if (incoming !== webhookSecret) {
      // Telegram'a 200 dön — aksi halde tekrar gönderir
      return NextResponse.json({ ok: true });
    }
  }

  try {
    // Request body'yi parse et
    let update: unknown;
    try {
      update = await req.json();
    } catch {
      // Parse hatası — Telegram'a 200 dön
      return NextResponse.json({ ok: true });
    }

    // ── L2: CONTROL() — Payload Null/Boş Kontrolü ───────
    const ctrl = CONTROL('TELEGRAM_WEBHOOK_PAYLOAD', update);
    if (!ctrl.pass) {
      // Geçersiz payload — 200 dön (Telegram retry'ı önle)
      return NextResponse.json({ ok: true });
    }

    if (typeof update !== 'object' || Array.isArray(update) || update === null) {
      return NextResponse.json({ ok: true });
    }

    // ── L3: Grammy Bot Handler ────────────────────────────
    await handleWebhookUpdate(update);

    // Telegram'a 200 OK döndür (zorunlu — aksi halde retry)
    return NextResponse.json({ ok: true });

  } catch (error) {
    processError(ERR.TELEGRAM_SEND, error, {
      kaynak: 'api/telegram/route.ts',
      islem: 'WEBHOOK_POST'
    });

    // Telegram'a 200 döndür — hata durumunda bile retry önle
    return NextResponse.json({ ok: true });
  }
}

// ─── GET: Webhook Durum + Diagnostik ───────────────────────
export async function GET(): Promise<NextResponse> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const botAvailable = isTelegramBotAvailable();

  // Token yoksa diagnostik bilgi dön
  if (!botAvailable) {
    return NextResponse.json({
      service: 'STP Telegram Bot Webhook',
      status:  'unconfigured',
      error:   'TELEGRAM_BOT_TOKEN tanımlı değil veya geçersiz',
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }

  // Bot token'ın ilk 10 karakteri — tam token gösterme (güvenlik)
  const tokenPreview = botToken.length > 10
    ? `${botToken.slice(0, 10)}...`
    : '???';

  return NextResponse.json({
    service:       'STP Telegram Bot Webhook',
    status:        'active',
    token_preview: tokenPreview,
    timestamp:     new Date().toISOString(),
    version:       'RELEASE-1.0-STP',
  });
}
