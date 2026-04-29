// ============================================================
// TELEGRAM BOT SETUP — Bot Singleton + Auth + Utilities
// ============================================================
// Bot başlatma, yetki kontrolü ve yardımcı fonksiyonlar.
// telegramService.ts tarafından import edilir.
// ============================================================

import { Bot, type Context } from 'grammy';
import { ERR, processError } from '@/lib/errorCore';
import { validateSupabaseConnection } from '@/lib/supabase';

// ─── ORTAM DEĞİŞKENLERİ ────────────────────────────────────
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
export const AUTHORIZED_CHAT_IDS = (process.env.TELEGRAM_AUTHORIZED_CHAT_IDS ?? '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

// ─── BOT SINGLETON ──────────────────────────────────────────
let bot: Bot | null = null;
let botInitialized = false;

/**
 * Telegram Bot'u başlatır (lazy singleton).
 * Token yoksa null döner — servis devre dışı kalır.
 */
export function getTelegramBot(): Bot | null {
  if (bot) return bot;

  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN.includes('your-bot-token')) {
    processError(ERR.TELEGRAM_SEND, new Error('TELEGRAM_BOT_TOKEN tanımlı değil'), {
      kaynak: 'botSetup.ts',
      islem: 'BOT_INIT'
    }, 'WARNING');
    return null;
  }

  try {
    bot = new Bot(TELEGRAM_BOT_TOKEN);
    return bot;
  } catch (error) {
    processError(ERR.TELEGRAM_SEND, error, {
      kaynak: 'botSetup.ts',
      islem: 'BOT_INIT'
    }, 'CRITICAL');
    return null;
  }
}

/**
 * Bot'u async olarak başlatır — handleUpdate için zorunlu.
 */
export async function ensureBotInitialized(botInstance: Bot): Promise<void> {
  if (botInitialized) return;
  try {
    await botInstance.init();
    botInitialized = true;
  } catch (error) {
    processError(ERR.TELEGRAM_SEND, error, {
      kaynak: 'botSetup.ts',
      islem: 'BOT_ASYNC_INIT'
    }, 'CRITICAL');
    throw error;
  }
}

// ─── YETKİ KONTROLÜ ────────────────────────────────────────
export function isAuthorized(chatId: number): boolean {
  if (AUTHORIZED_CHAT_IDS.length === 0) return true;
  return AUTHORIZED_CHAT_IDS.includes(String(chatId));
}

// ─── TASK CODE ÜRETİCİ ─────────────────────────────────────
export function generateTaskCode(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TSK-${date}-${rand}`;
}

// ─── TELEGRAM YANIT GÖNDER ─────────────────────────────────
export async function sendReply(ctx: Context, message: string): Promise<void> {
  try {
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    processError(ERR.TELEGRAM_SEND, error, {
      kaynak: 'botSetup.ts',
      islem: 'SEND_REPLY',
      chat_id: ctx.chat?.id
    });
  }
}

// ─── BOT DURUM KONTROLÜ ─────────────────────────────────────
export function isTelegramBotAvailable(): boolean {
  return !!(TELEGRAM_BOT_TOKEN && !TELEGRAM_BOT_TOKEN.includes('your-bot-token'));
}

// ─── SİSTEM DURUMU ──────────────────────────────────────────
export function getSystemStatusMessage(): string {
  const { isValid, missingVars } = validateSupabaseConnection();
  const statusEmoji = isValid ? '🟢' : '🔴';
  const statusText = isValid ? 'OPERASYONEL' : `BAĞLANTI HATASI (Eksik: ${missingVars.join(', ')})`;
  return [
    `📊 <b>SİSTEM DURUMU</b>`,
    ``,
    `${statusEmoji} <b>Veritabanı:</b> ${statusText}`,
    `🤖 <b>AI Motoru:</b> 🟢 LOKAL MOD (Sıfır Maliyet)`,
    `📡 <b>Telegram Bot:</b> 🟢 AKTİF (WEBHOOK modu)`,
    `🕐 <b>Zaman:</b> ${new Date().toISOString()}`,
  ].join('\n');
}

// ── K-3: WEBHOOK YÖNETİMİ ────────────────────────────────────
// Bot YALNIZCA webhook modunda çalışır — polling kullanılmaz.
// Polling, sunucu ortamında (Vercel/Node) kaynak tüketir ve
// serverless ile uyumsuzdur. Telegram güncellemeyi webhook'a iter.

export interface WebhookInfo {
  url:               string;
  has_custom_certificate: boolean;
  pending_update_count:   number;
  last_error_date?:       number;
  last_error_message?:    string;
  max_connections?:       number;
}

/**
 * Telegram API'den mevcut webhook bilgisini sorgular.
 * Bot TOKEN gerektirmez — sadece okuma yapar.
 */
export async function getWebhookInfo(): Promise<{
  ok: boolean;
  info?: WebhookInfo;
  error?: string;
}> {
  if (!isTelegramBotAvailable()) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN tanımlı değil' };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`,
      { method: 'GET', signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) {
      return { ok: false, error: `Telegram API HTTP ${res.status}` };
    }

    const data = await res.json() as { ok: boolean; result?: WebhookInfo; description?: string };

    if (!data.ok) {
      return { ok: false, error: data.description ?? 'Telegram API hatası' };
    }

    return { ok: true, info: data.result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Webhook URL'ini Telegram'a kaydeder.
 * Deploy sonrası veya URL değiştiğinde çağrılmalıdır.
 * Endpoint: /api/bootstrap veya manuel curl komutuyla.
 */
export async function setWebhook(url: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!isTelegramBotAvailable()) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN tanımlı değil' };
  }

  if (!url || !url.startsWith('https://')) {
    return { ok: false, error: 'Webhook URL HTTPS olmalıdır' };
  }

  try {
    // Webhook secret varsa Telegram'a gönder — her POST'da header ile doğrulama yapılır
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const payload: Record<string, unknown> = { url, drop_pending_updates: true };
    if (webhookSecret) {
      payload.secret_token = webhookSecret;
    }

    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        signal:  AbortSignal.timeout(10000),
      }
    );

    const data = await res.json() as { ok: boolean; description?: string };
    return { ok: data.ok, error: data.ok ? undefined : (data.description ?? 'setWebhook başarısız') };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

