// ============================================================
// TELEGRAM BİLDİRİM SERVİSİ — Tek Yönlü Bildirim Gönderici
// ============================================================
// Görev: Sistem olaylarını Telegram'a bildirim olarak göndermek.
// Grammy framework'e BAĞIMLI DEĞİL — doğrudan HTTP API kullanır.
//
// Kullanım alanları:
//   - L2 Validator sonuçları
//   - Kritik hata bildirimi
//   - Build/Deploy durumu
//   - Görev tamamlanma bildirimi
//
// Gerekli env:
//   TELEGRAM_BOT_TOKEN — BotFather'dan alınan token
//   TELEGRAM_NOTIFICATION_CHAT_ID — Bildirim gönderilecek chat ID
//
// Hata Kodu: ERR-STP001-016
// ============================================================

import { ERR, processError } from '@/lib/errorCore';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const CHAT_ID = process.env.TELEGRAM_NOTIFICATION_CHAT_ID ?? process.env.TELEGRAM_AUTHORIZED_CHAT_IDS?.split(',')[0] ?? '';

// ─── TELEGRAM API BASE ──────────────────────────────────────

function apiUrl(method: string): string {
  return `https://api.telegram.org/bot${BOT_TOKEN}/${method}`;
}

// ─── KULLANILABILIRLIK KONTROLÜ ─────────────────────────────

export function isTelegramNotificationAvailable(): boolean {
  return !!(BOT_TOKEN && CHAT_ID);
}

// ─── MESAJ GÖNDER ───────────────────────────────────────────

export async function sendTelegramNotification(
  message: string,
  options?: { parse_mode?: 'HTML' | 'MarkdownV2'; disable_notification?: boolean }
): Promise<{ success: boolean; error?: string }> {
  if (!isTelegramNotificationAvailable()) {
    return {
      success: false,
      error: 'TELEGRAM_BOT_TOKEN veya CHAT_ID yapılandırılmamış',
    };
  }

  try {
    const response = await fetch(apiUrl('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: options?.parse_mode || 'HTML',
        disable_notification: options?.disable_notification || false,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      processError(ERR.TELEGRAM_SEND, new Error(data.description || 'Telegram API hatası'), {
        kaynak: 'telegramNotifier.ts',
        islem: 'SEND_NOTIFICATION',
        chat_id: CHAT_ID,
        api_error: data.description,
      }, 'WARNING');
      return { success: false, error: data.description };
    }

    return { success: true };
  } catch (error) {
    processError(ERR.TELEGRAM_SEND, error, {
      kaynak: 'telegramNotifier.ts',
      islem: 'SEND_NOTIFICATION',
    }, 'WARNING');
    return { success: false, error: String(error) };
  }
}

// ─── FORMATLAMA YARDIMCILARI ────────────────────────────────

export function formatSystemAlert(title: string, body: string, severity: string = 'INFO'): string {
  const icon = severity === 'CRITICAL' ? '🔴'
    : severity === 'WARNING' ? '🟡'
    : severity === 'ERROR' ? '🟠'
    : '🟢';

  return `${icon} <b>STP — ${title}</b>\n\n${body}\n\n<i>🕐 ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</i>`;
}

export function formatL2Report(status: string, errors: number, warnings: number, duration: number): string {
  const icon = status === 'FAIL' ? '🔴' : status === 'WARNING' ? '🟡' : '🟢';
  return formatSystemAlert(
    'L2 DENETİM RAPORU',
    `Durum: ${icon} ${status}\nHata: ${errors} | Uyarı: ${warnings}\nSüre: ${duration}ms`,
    status === 'FAIL' ? 'CRITICAL' : status === 'WARNING' ? 'WARNING' : 'INFO'
  );
}

export function formatTaskNotification(action: string, taskCode: string, title: string): string {
  return formatSystemAlert(
    `GÖREV ${action}`,
    `Kod: <code>${taskCode}</code>\nBaşlık: ${title}`,
    'INFO'
  );
}
