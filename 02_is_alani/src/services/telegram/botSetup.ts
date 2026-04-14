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
    `📡 <b>Telegram Bot:</b> 🟢 AKTİF`,
    `🕐 <b>Zaman:</b> ${new Date().toISOString()}`,
  ].join('\n');
}
