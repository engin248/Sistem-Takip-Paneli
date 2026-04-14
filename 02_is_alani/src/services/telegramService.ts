// ============================================================
// TELEGRAM SERVİSİ — WEBHOOK ENTRY POINT
// ============================================================
// Bu dosya yalnızca webhook entry point'tir.
// Alt modüller:
//   telegram/botSetup.ts      → Bot singleton + auth + utils
//   telegram/voiceHandler.ts  → Ses tanıma + HERMAIA doğrulama
//   telegram/commandRouter.ts → Tüm komut handler'ları
//
// Dış API: handleWebhookUpdate() + isTelegramBotAvailable()
// ============================================================

import { ERR, processError } from '@/lib/errorCore';
import { getTelegramBot, ensureBotInitialized, isTelegramBotAvailable } from './telegram/botSetup';
import { registerHandlers } from './telegram/commandRouter';

// Bot başlatıldığında handler'ları kaydet
let handlersRegistered = false;

function getOrInitBot() {
  const botInstance = getTelegramBot();
  if (!botInstance) return null;

  if (!handlersRegistered) {
    registerHandlers(botInstance);
    handlersRegistered = true;
  }

  return botInstance;
}

/**
 * Next.js /api/telegram webhook'undan gelen güncellemeyi işler.
 */
export async function handleWebhookUpdate(update: unknown): Promise<void> {
  const botInstance = getOrInitBot();

  if (!botInstance) {
    processError(ERR.TELEGRAM_SEND, new Error('Bot başlatılamadı — token eksik'), {
      kaynak: 'telegramService.ts',
      islem: 'WEBHOOK_HANDLE'
    }, 'CRITICAL');
    return;
  }

  try {
    await ensureBotInitialized(botInstance);
    await botInstance.handleUpdate(update as Parameters<typeof botInstance.handleUpdate>[0]);
  } catch (error) {
    processError(ERR.TELEGRAM_SEND, error, {
      kaynak: 'telegramService.ts',
      islem: 'WEBHOOK_HANDLE'
    });
  }
}

// Re-export — geriye uyumluluk
export { isTelegramBotAvailable } from './telegram/botSetup';
