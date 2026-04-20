// ============================================================
// TELEGRAM NOTIFIER — STUB (Köprü Dosyası)
// ============================================================
// Telegram Bot artık bağımsız modül olarak çalışıyor.
// Bu dosya mevcut import'ları kırmamak için stub olarak tutulur.
// Bildirimler Supabase üzerinden Telegram_Bot tarafından gönderilir.
// ============================================================

export async function sendTelegramNotification(...args: any[]): Promise<{ success: boolean; message: string }> {
  console.log('[TELEGRAM-STUB] Bildirim atlandi');
  return { success: true, message: 'Telegram Bot bagimsiz module tasindi.' };
}

export function isTelegramNotificationAvailable(): boolean {
  return false; 
}

export function formatTaskNotification(...args: any[]): string {
  return `[STUB] Gorev bildirimi`;
}

export function formatL2Report(...args: any[]): string {
  return `[STUB] L2 Rapor`;
}

export function formatSystemAlert(...args: any[]): string {
  return `[STUB] Sistem uyarisi`;
}
