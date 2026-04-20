// src/core/bootstrap.ts
// Sistem başlatma, sağlık kontrolü ve Telegram webhook auto-register

import { supabase } from '@/lib/supabase';

export interface BootstrapResult {
    status:    'READY' | 'DEGRADED' | 'FATAL';
    checks:    BootstrapCheck[];
    timestamp: number;
}

interface BootstrapCheck {
    name:    string;
    passed:  boolean;
    message: string;
}

// ─── TELEGRAM WEBHOOK AUTO-REGISTER ─────────────────────────
// Her deploy sonrası /api/bootstrap çağrıldığında webhook'u
// otomatik kontrol eder, boşsa veya hatalıysa yeniden kaydeder.
// Bu sayede "webhook boş kalma" sorunu kalıcı olarak çözülür.
async function ensureTelegramWebhook(): Promise<BootstrapCheck> {
    const token      = process.env.TELEGRAM_BOT_TOKEN ?? '';
    // Webhook URL: Env var → APP_URL → Hardcode fallback
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL
        || (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram` : '')
        || 'https://sistem-takip-paneli.vercel.app/api/telegram';

    if (!token || token.length < 20) {
        return {
            name:    'telegram_webhook',
            passed:  false,
            message: 'TELEGRAM_BOT_TOKEN tanımlı değil',
        };
    }

    try {
        // Mevcut webhook durumunu sorgula
        const infoRes  = await fetch(
            `https://api.telegram.org/bot${token}/getWebhookInfo`,
            { signal: AbortSignal.timeout(5000) }
        );
        const info = await infoRes.json() as {
            ok: boolean;
            result?: { url: string; last_error_message?: string };
        };

        const currentUrl = info.result?.url ?? '';
        const lastError  = info.result?.last_error_message ?? '';

        // Webhook doğru URL'de ve hata yoksa — geç
        if (currentUrl === webhookUrl && !lastError) {
            return {
                name:    'telegram_webhook',
                passed:  true,
                message: `Webhook aktif: ${webhookUrl}`,
            };
        }

        // Webhook boş, yanlış veya hatalı — yeniden kaydet
        const setRes = await fetch(
            `https://api.telegram.org/bot${token}/setWebhook`,
            {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    url:                  webhookUrl,
                    allowed_updates:      ['message', 'callback_query', 'edited_message'],
                    drop_pending_updates: true,
                }),
                signal: AbortSignal.timeout(8000),
            }
        );
        const setData = await setRes.json() as { ok: boolean; description?: string };

        return {
            name:    'telegram_webhook',
            passed:  setData.ok,
            message: setData.ok
                ? `Webhook yeniden kaydedildi: ${webhookUrl}`
                : `Webhook kayıt başarısız: ${setData.description ?? 'bilinmeyen hata'}`,
        };
    } catch (e) {
        return {
            name:    'telegram_webhook',
            passed:  false,
            message: `Webhook kontrol hatası: ${String(e)}`,
        };
    }
}

// ─── ANA BOOTSTRAP ──────────────────────────────────────────
export async function runBootstrap(): Promise<BootstrapResult> {
    const checks: BootstrapCheck[] = [];

    // 1. Supabase bağlantısı
    try {
        const { error } = await supabase.from('commands').select('id').limit(1);
        checks.push({
            name:    'supabase_connection',
            passed:  !error,
            message: error ? `DB hatası: ${error.message}` : 'Bağlantı OK',
        });
    } catch (e) {
        checks.push({ name: 'supabase_connection', passed: false, message: String(e) });
    }

    // 2. immutable_logs tablosu
    try {
        const { error } = await supabase.from('immutable_logs').select('id').limit(1);
        checks.push({
            name:    'immutable_logs',
            passed:  !error,
            message: error ? error.message : 'Tablo OK',
        });
    } catch (e) {
        checks.push({ name: 'immutable_logs', passed: false, message: String(e) });
    }

    // 3. commands tablosu
    try {
        const { error } = await supabase.from('commands').select('id').limit(1);
        checks.push({
            name:    'commands_table',
            passed:  !error,
            message: error ? error.message : 'Tablo OK',
        });
    } catch (e) {
        checks.push({ name: 'commands_table', passed: false, message: String(e) });
    }

    // 4. proof_chain tablosu
    try {
        const { error } = await supabase.from('proof_chain').select('id').limit(1);
        checks.push({
            name:    'proof_chain',
            passed:  !error,
            message: error ? error.message : 'Tablo OK',
        });
    } catch (e) {
        checks.push({ name: 'proof_chain', passed: false, message: String(e) });
    }

    // 5. ENV kontrol
    const envOk = !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    checks.push({
        name:    'env_vars',
        passed:  envOk,
        message: envOk ? 'ENV OK' : 'SUPABASE env eksik',
    });

    // 6. Telegram Webhook — Auto Register
    const telegramCheck = await ensureTelegramWebhook();
    checks.push(telegramCheck);

    // Sonuç
    const failed = checks.filter(c => !c.passed).length;
    const status: BootstrapResult['status'] =
        failed === 0 ? 'READY' :
        failed <= 2  ? 'DEGRADED' : 'FATAL';

    return { status, checks, timestamp: Date.now() };
}
