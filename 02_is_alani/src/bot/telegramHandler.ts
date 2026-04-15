// src/bot/telegramHandler.ts
// Telegram Bot → V-FINAL Pipeline Köprüsü
// @Sistem_takip_bot entegrasyonu

import { executePipeline } from '../core';
import type { CommandContext } from '../core';
import crypto from 'crypto';

const AUTHORIZED_CHAT_IDS = (process.env.TELEGRAM_AUTHORIZED_CHAT_IDS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
const NOTIFICATION_CHAT_ID = process.env.TELEGRAM_NOTIFICATION_CHAT_ID || '';

/**
 * Telegram mesajını V-FINAL pipeline'a gönderir.
 *
 * Kullanım (Grammy bot handler içinde):
 *   bot.on('message:text', (ctx) => handleTelegramCommand(ctx));
 */
export async function handleTelegramCommand(ctx: {
    message: { text: string; from: { id: number; first_name: string }; chat: { id: number } };
    reply: (text: string) => Promise<void>;
}): Promise<void> {

    const chatId = String(ctx.message.chat.id);
    const userId = String(ctx.message.from.id);
    const input  = ctx.message.text;

    // Yetki kontrolü
    if (!AUTHORIZED_CHAT_IDS.includes(chatId)) {
        await ctx.reply('⛔ Yetkisiz erişim — bu chat ID kayıtlı değil.');
        return;
    }

    // Pipeline context oluştur
    const context: CommandContext = {
        userId,
        channel:      'telegram',
        isAuthorized: true,
        role:         'admin',
        scope:        ['all'],
        nonce:        crypto.randomBytes(16).toString('hex'),
        isVoice:      false,
    };

    await ctx.reply('⏳ İşleniyor...');

    try {
        const result = await executePipeline(input, context, 'NORMAL');

        const emoji = {
            APPROVED:  '✅',
            REJECTED:  '❌',
            ESCALATED: '⚠️',
            ERROR:     '🔴',
        }[result.status];

        let response = `${emoji} **${result.status}** (${result.totalMs}ms)\n`;
        response    += `📊 Aşama: ${result.stage}\n`;

        if (result.criteria) {
            response += `📋 Kriter: ${result.criteria.score}/100 (${result.criteria.mode})\n`;
        }
        if (result.proof) {
            response += `🔐 Proof: ${result.proof.status} ${result.proof.verified ? '✓' : '✗'}\n`;
        }
        if (result.consensus) {
            response += `⚖️ Konsensüs: ${result.consensus.decision} (${result.consensus.confidence})\n`;
        }
        if (result.gateCheck) {
            response += `🚪 Gate: ${result.gateCheck.allPassed ? '9/9 ✓' : `FAIL → ${result.gateCheck.failedGate}`}\n`;
        }
        if (result.errors.length > 0) {
            response += `\n⚠️ ${result.errors.join('\n⚠️ ')}`;
        }

        await ctx.reply(response);

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
        await ctx.reply(`🔴 Pipeline Hatası: ${msg}`);
    }
}

/**
 * Telegram'a bildirim gönderir (alert sistemi için).
 */
export async function sendTelegramAlert(
    botToken: string,
    message:  string
): Promise<void> {
    if (!NOTIFICATION_CHAT_ID || !botToken) return;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
            chat_id:    NOTIFICATION_CHAT_ID,
            text:       message,
            parse_mode: 'Markdown',
        }),
    });
}
