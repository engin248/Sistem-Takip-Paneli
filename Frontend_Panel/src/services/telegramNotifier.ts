// ============================================================
// TELEGRAM NOTIFIER — HTTP KÖPRÜSÜ
// ============================================================
// Telegram Bot API'ye doğrudan fetch() ile bildirim gönderir.
// Grammy bağımlılığı YOK — sadece HTTP POST.
// Vercel serverless ortamında sorunsuz çalışır.
//
// Kullanılıyor:
//   - alarmService.ts → EMERGENCY/CRITICAL alarm bildirimi
//   - l2Validator.ts  → L2 denetim raporu bildirimi
//   - /api/notify     → POST ile bildirim gönderme
//
// Gerekli ENV:
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_NOTIFICATION_CHAT_ID
// ============================================================

const BOT_TOKEN = (): string => process.env.TELEGRAM_BOT_TOKEN ?? '';
const CHAT_ID   = (): string => process.env.TELEGRAM_NOTIFICATION_CHAT_ID ?? '';

/**
 * Telegram bildirimi gönderir (HTTP POST — Grammy'ye gerek yok).
 * Vercel dahil her ortamda çalışır.
 */
export async function sendTelegramNotification(
  message: string
): Promise<{ success: boolean; message: string }> {
  const token  = BOT_TOKEN();
  const chatId = CHAT_ID();

  if (!token || !chatId) {
    return {
      success: false,
      message: 'TELEGRAM_BOT_TOKEN veya TELEGRAM_NOTIFICATION_CHAT_ID tanımlı değil.',
    };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    const data = await res.json() as { ok: boolean; description?: string };

    return {
      success: data.ok,
      message: data.ok
        ? 'Bildirim gönderildi.'
        : `Telegram hatası: ${data.description ?? 'bilinmeyen'}`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Bildirim gönderilemedi: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Telegram bildirimi gönderilebilir mi?
 * Token ve chat_id tanımlıysa true.
 */
export function isTelegramNotificationAvailable(): boolean {
  return !!(BOT_TOKEN() && CHAT_ID());
}

/**
 * Görev bildirimi formatla.
 */
export function formatTaskNotification(
  taskCode: string,
  title: string,
  status: string,
  priority: string
): string {
  const emoji: Record<string, string> = {
    kritik: '🔴', yuksek: '🟠', normal: '🟡', dusuk: '🟢',
  };
  return [
    `📋 <b>GÖREV BİLDİRİMİ</b>`,
    ``,
    `<b>Kod:</b> <code>${taskCode}</code>`,
    `<b>Başlık:</b> ${title}`,
    `${emoji[priority] ?? '🟡'} <b>Öncelik:</b> ${priority.toUpperCase()}`,
    `<b>Durum:</b> ${status}`,
    `🕐 ${new Date().toISOString()}`,
  ].join('\n');
}

/**
 * L2 denetim raporu formatla.
 */
export function formatL2Report(
  status: string,
  errors: number,
  warnings: number,
  durationMs: number
): string {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  return [
    `${icon} <b>L2 DENETİM RAPORU</b>`,
    ``,
    `<b>Sonuç:</b> ${status}`,
    `🔴 <b>Hata:</b> ${errors}`,
    `🟡 <b>Uyarı:</b> ${warnings}`,
    `⏱️ <b>Süre:</b> ${durationMs}ms`,
    `🕐 ${new Date().toISOString()}`,
  ].join('\n');
}

/**
 * Sistem uyarısı formatla.
 */
export function formatSystemAlert(
  title: string,
  message: string,
  severity: string
): string {
  const icon: Record<string, string> = {
    EMERGENCY: '🚨', CRITICAL: '⛔', WARNING: '⚠️', INFO: 'ℹ️',
  };
  return [
    `${icon[severity] ?? '📢'} <b>${severity} — ${title}</b>`,
    ``,
    message,
    ``,
    `🕐 ${new Date().toISOString()}`,
  ].join('\n');
}
