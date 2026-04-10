// ============================================================
// TELEGRAM SERVİSİ — SAHA KOMUT ALICI + AI ÖNCELİK KÖPRÜSÜ
// ============================================================
// Görev: Telegram Bot üzerinden gelen yazılı/sesli komutları
// AI ile analiz edip öncelik atayarak Supabase tasks tablosuna
// yazmak.
//
// Akış:
//   1. Telegram mesajı gelir (metin veya ses)
//   2. Ses ise → Whisper API ile metne çevrilir
//   3. Metin → analyzeTaskPriority() ile AI öncelik analizi
//   4. Görev → Supabase tasks tablosuna INSERT (status: 'beklemede')
//   5. Sonuç → Telegram'a onay mesajı gönderilir
//   6. Her adım → audit_logs'a kaydedilir
//
// Hata Kodları:
//   ERR-STP001-014 → AI analiz başarısız (fallback: lokal analiz)
//   ERR-STP001-015 → OpenAI API bağlantı hatası
//   ERR-STP001-016 → Telegram mesaj gönderilemedi
// ============================================================

import { Bot, type Context } from 'grammy';
import { supabase, validateSupabaseConnection } from '@/lib/supabase';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';
import { analyzeTaskPriority, getPriorityLabel, getPriorityEmoji } from './aiManager';
import type { TaskPriority } from '@/store/useTaskStore';

// ─── ORTAM DEĞİŞKENLERİ ────────────────────────────────────
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
const AUTHORIZED_CHAT_IDS = (process.env.TELEGRAM_AUTHORIZED_CHAT_IDS ?? '')
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
      kaynak: 'telegramService.ts',
      islem: 'BOT_INIT'
    }, 'WARNING');
    return null;
  }

  try {
    bot = new Bot(TELEGRAM_BOT_TOKEN);
    registerHandlers(bot);
    return bot;
  } catch (error) {
    processError(ERR.TELEGRAM_SEND, error, {
      kaynak: 'telegramService.ts',
      islem: 'BOT_INIT'
    }, 'CRITICAL');
    return null;
  }
}

/**
 * Bot'u async olarak başlatır — handleUpdate için zorunlu.
 * Grammy kütüphanesi bot.init() çağrılmadan handleUpdate çalıştırmaz.
 */
async function ensureBotInitialized(botInstance: Bot): Promise<void> {
  if (botInitialized) return;
  try {
    await botInstance.init();
    botInitialized = true;
  } catch (error) {
    processError(ERR.TELEGRAM_SEND, error, {
      kaynak: 'telegramService.ts',
      islem: 'BOT_ASYNC_INIT'
    }, 'CRITICAL');
    throw error;
  }
}

// ─── TASK CODE ÜRETİCİ ─────────────────────────────────────
function generateTaskCode(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TSK-${date}-${rand}`;
}

// ─── YETKİ KONTROLÜ ────────────────────────────────────────
function isAuthorized(chatId: number): boolean {
  // Eğer AUTHORIZED_CHAT_IDS tanımlı değilse → tüm kullanıcılar kabul (geliştirme modu)
  if (AUTHORIZED_CHAT_IDS.length === 0) return true;
  return AUTHORIZED_CHAT_IDS.includes(String(chatId));
}

// ─── SES MESAJINI METİNE ÇEVİR (Whisper API) ───────────────
async function transcribeVoice(fileUrl: string): Promise<string | null> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('your-api-key')) {
    processError(ERR.AI_CONNECTION, new Error('OPENAI_API_KEY tanımlı değil — sesli mesaj çevrilemez'), {
      kaynak: 'telegramService.ts',
      islem: 'WHISPER_TRANSCRIBE'
    }, 'WARNING');
    return null;
  }

  try {
    // Ses dosyasını indir
    const audioResponse = await fetch(fileUrl);
    if (!audioResponse.ok) {
      throw new Error(`Ses dosyası indirilemedi: HTTP ${audioResponse.status}`);
    }
    const audioBlob = await audioResponse.blob();

    // Whisper API'ye gönder
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'tr');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorBody = await whisperResponse.text();
      throw new Error(`Whisper API hatası: HTTP ${whisperResponse.status} — ${errorBody}`);
    }

    const result = await whisperResponse.json() as { text?: string };
    return result.text || null;
  } catch (error) {
    processError(ERR.AI_ANALYSIS, error, {
      kaynak: 'telegramService.ts',
      islem: 'WHISPER_TRANSCRIBE'
    });
    return null;
  }
}

// ─── GÖREV OLUŞTUR (Supabase) ──────────────────────────────
async function createTaskFromTelegram(
  title: string,
  priority: TaskPriority,
  source: 'text' | 'voice',
  senderName: string,
  chatId: number,
  aiReasoning: string,
  aiConfidence: number,
  aiSource: 'local' | 'ai'
): Promise<{ success: boolean; taskCode: string; error?: string }> {
  const { isValid } = validateSupabaseConnection();
  if (!isValid) {
    processError(ERR.CONNECTION_INVALID, new Error('Supabase bağlantı bilgileri eksik'), {
      islem: 'TELEGRAM_TASK_CREATE'
    }, 'CRITICAL');
    return { success: false, taskCode: '', error: 'Veritabanı bağlantısı yok' };
  }

  const taskCode = generateTaskCode();

  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        title: title.trim(),
        task_code: taskCode,
        status: 'beklemede',
        priority,
        assigned_to: senderName,
        assigned_by: 'TELEGRAM-BOT',
        evidence_required: true,
        evidence_provided: false,
        retry_count: 0,
        is_archived: false,
        metadata: {
          kaynak: 'telegram',
          mesaj_tipi: source,
          chat_id: chatId,
          gonderen: senderName,
          ai_analiz: {
            oncelik: priority,
            gerekce: aiReasoning,
            guven: aiConfidence,
            motor: aiSource
          }
        }
      }])
      .select();

    if (error) {
      processError(ERR.TASK_CREATE, error, {
        tablo: 'tasks',
        islem: 'INSERT',
        task_code: taskCode,
        kaynak: 'telegram'
      });
      return { success: false, taskCode, error: error.message };
    }

    // Audit log
    await logAudit({
      operation_type: 'CREATE',
      action_description: `Telegram'dan görev oluşturuldu: "${title}" [${taskCode}] → ${priority.toUpperCase()}`,
      task_id: data?.[0]?.id ?? null,
      metadata: {
        action_code: 'TELEGRAM_TASK_CREATED',
        task_code: taskCode,
        title,
        priority,
        source,
        sender: senderName,
        chat_id: chatId,
        ai_source: aiSource,
        ai_confidence: aiConfidence,
        ai_reasoning: aiReasoning
      }
    }).catch(() => {
      // Audit hatası — processError zaten logluyor
    });

    return { success: true, taskCode };
  } catch (err) {
    processError(ERR.TASK_CREATE_GENERAL, err, {
      tablo: 'tasks',
      islem: 'INSERT',
      kaynak: 'telegram'
    });
    return { success: false, taskCode, error: String(err) };
  }
}

// ─── TELEGRAM YANIT GÖNDER ─────────────────────────────────
async function sendReply(ctx: Context, message: string): Promise<void> {
  try {
    await ctx.reply(message, { parse_mode: 'HTML' });
  } catch (error) {
    processError(ERR.TELEGRAM_SEND, error, {
      kaynak: 'telegramService.ts',
      islem: 'SEND_REPLY',
      chat_id: ctx.chat?.id
    });
  }
}

// ─── ANA MESAJ İŞLEYİCİ ────────────────────────────────────
async function handleTaskMessage(ctx: Context, text: string, source: 'text' | 'voice'): Promise<void> {
  const chatId = ctx.chat?.id ?? 0;
  const senderName = ctx.from?.first_name
    ? `${ctx.from.first_name}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}`
    : 'Bilinmeyen';

  // ── GÖZCÜ: IA_COMMAND_RECEIVED — Komutu anında kaydet ──────
  // Telegram'dan gelen her komut, işlenmeden ÖNCE audit_logs'a düşer.
  // Bu sayede mesaj işleme sırasında hata olsa bile komutun
  // alındığı kanıtlanmış olur.
  await logAudit({
    operation_type: 'SYSTEM',
    action_description: `Telegram komut alındı: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}" [${source.toUpperCase()}]`,
    metadata: {
      action_code: 'IA_COMMAND_RECEIVED',
      message_type: source,
      chat_id: chatId,
      sender: senderName,
      message_length: text.length,
      message_preview: text.substring(0, 120),
      received_at: new Date().toISOString(),
    }
  }).catch(() => {
    // Audit yazma hatası — sessizce devam et, processError zaten logluyor
  });

  // Yetki kontrolü
  if (!isAuthorized(chatId)) {
    await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM. Bu bot yalnızca yetkilendirilmiş operatörler tarafından kullanılabilir.');

    await logAudit({
      operation_type: 'REJECT',
      action_description: `Yetkisiz Telegram erişim girişimi: ${senderName} (Chat: ${chatId})`,
      metadata: {
        action_code: 'TELEGRAM_UNAUTHORIZED',
        chat_id: chatId,
        sender: senderName
      }
    }).catch(() => {});

    return;
  }

  // Boş mesaj kontrolü
  if (!text || text.trim().length < 3) {
    await sendReply(ctx, '⚠️ Görev metni çok kısa. En az 3 karakter gereklidir.');
    return;
  }

  // AI öncelik analizi
  await sendReply(ctx, '🔄 Görev analiz ediliyor...');

  const analysis = await analyzeTaskPriority(text, null, { useAI: true, timeoutMs: 15000 });

  // Supabase'e yaz
  const result = await createTaskFromTelegram(
    text,
    analysis.priority,
    source,
    senderName,
    chatId,
    analysis.reasoning,
    analysis.confidence,
    analysis.source
  );

  if (result.success) {
    const emoji = getPriorityEmoji(analysis.priority);
    const label = getPriorityLabel(analysis.priority);
    const motorIcon = analysis.source === 'ai' ? '🤖' : '📐';
    const motorLabel = analysis.source === 'ai' ? 'AI (GPT-4o-mini)' : 'Lokal Analiz';

    const successMsg = [
      `✅ <b>GÖREV OLUŞTURULDU</b>`,
      ``,
      `📋 <b>Kod:</b> ${result.taskCode}`,
      `📝 <b>Başlık:</b> ${text}`,
      `${emoji} <b>Öncelik:</b> ${label}`,
      `${motorIcon} <b>Motor:</b> ${motorLabel}`,
      `📊 <b>Güven:</b> %${Math.round(analysis.confidence * 100)}`,
      `💬 <b>Gerekçe:</b> ${analysis.reasoning}`,
      ``,
      `📌 <b>Durum:</b> Beklemede`,
      `👤 <b>Atanan:</b> ${senderName}`,
      `📡 <b>Kaynak:</b> ${source === 'voice' ? '🎤 Sesli Komut' : '💬 Yazılı Komut'}`,
    ].join('\n');

    await sendReply(ctx, successMsg);
  } else {
    await sendReply(ctx, `❌ <b>HATA:</b> Görev oluşturulamadı.\n\n<code>${result.error || 'Bilinmeyen hata'}</code>`);
  }
}

// ─── BOT HANDLER KAYDI ─────────────────────────────────────
function registerHandlers(botInstance: Bot): void {
  // /start komutu
  botInstance.command('start', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    await sendReply(ctx, [
      `🏗️ <b>STP KOMUT MERKEZİ</b>`,
      ``,
      `Merhaba! Ben Sistem Takip Paneli'nin Telegram botu.`,
      ``,
      `<b>Kullanım:</b>`,
      `• Yazılı mesaj gönder → Görev oluşturulur`,
      `• Sesli mesaj gönder → Metne çevrilip görev oluşturulur`,
      `• /durum → Sistem durumu`,
      `• /yardim → Komut listesi`,
      ``,
      `<b>AI Motoru:</b> Gönderdiğin görevlerin önceliğini otomatik analiz ederim.`,
      ``,
      `📡 Chat ID: <code>${chatId}</code>`,
    ].join('\n'));
  });

  // /durum komutu — sistem durumu
  botInstance.command('durum', async (ctx) => {
    const { isValid, missingVars } = validateSupabaseConnection();
    const statusEmoji = isValid ? '🟢' : '🔴';
    const statusText = isValid ? 'OPERASYONEL' : `BAĞLANTI HATASI (Eksik: ${missingVars.join(', ')})`;

    await sendReply(ctx, [
      `📊 <b>SİSTEM DURUMU</b>`,
      ``,
      `${statusEmoji} <b>Veritabanı:</b> ${statusText}`,
      `🤖 <b>AI Motoru:</b> ${OPENAI_API_KEY ? '🟢 AKTİF' : '🟡 DEVRE DIŞI (Lokal mod)'}`,
      `📡 <b>Telegram Bot:</b> 🟢 AKTİF`,
      `🕐 <b>Zaman:</b> ${new Date().toISOString()}`,
    ].join('\n'));
  });

  // /yardim komutu
  botInstance.command('yardim', async (ctx) => {
    await sendReply(ctx, [
      `📖 <b>KOMUT LİSTESİ</b>`,
      ``,
      `💬 <b>Metin mesaj:</b> Doğrudan görev olarak kaydedilir`,
      `🎤 <b>Sesli mesaj:</b> Whisper ile metne çevrilip görev olarak kaydedilir`,
      ``,
      `<b>Komutlar:</b>`,
      `/start — Karşılama ve bilgi`,
      `/durum — Sistem durumu`,
      `/yardim — Bu mesaj`,
      ``,
      `<b>Öncelik Seviyeleri (AI atar):</b>`,
      `🚨 KRİTİK — Acil müdahale`,
      `⚠️ YÜKSEK — Aynı gün`,
      `📋 NORMAL — Standart akış`,
      `📝 DÜŞÜK — Zamanı gelince`,
    ].join('\n'));
  });

  // Yazılı mesaj → Görev oluştur
  botInstance.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    // Komut mesajlarını atla (/ ile başlayanlar zaten command handler'dan geçti)
    if (text.startsWith('/')) return;
    await handleTaskMessage(ctx, text, 'text');
  });

  // Sesli mesaj → Whisper → Görev oluştur
  botInstance.on('message:voice', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;

    if (!isAuthorized(chatId)) {
      await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM.');
      return;
    }

    await sendReply(ctx, '🎙️ Ses tanınıyor...');

    try {
      const file = await ctx.getFile();
      const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${file.file_path}`;

      const transcription = await transcribeVoice(fileUrl);

      if (!transcription) {
        await sendReply(ctx, '❌ Ses tanıma başarısız. Lütfen yazılı mesaj gönderin.');
        return;
      }

      await sendReply(ctx, `📝 <b>Algılanan metin:</b> "${transcription}"`);
      await handleTaskMessage(ctx, transcription, 'voice');
    } catch (error) {
      processError(ERR.AI_ANALYSIS, error, {
        kaynak: 'telegramService.ts',
        islem: 'VOICE_PROCESS',
        chat_id: chatId
      });
      await sendReply(ctx, '❌ Sesli mesaj işlenemedi. Lütfen yazılı mesaj gönderin.');
    }
  });
}

// ─── WEBHOOK İŞLEYİCİ ──────────────────────────────────────
/**
 * Next.js API Route'dan gelen webhook payload'ını işler.
 * Grammy'nin handleUpdate metodu ile Telegram güncelleme nesnesini bot'a iletir.
 */
export async function handleWebhookUpdate(update: unknown): Promise<void> {
  const botInstance = getTelegramBot();
  if (!botInstance) {
    processError(ERR.TELEGRAM_SEND, new Error('Bot başlatılamadı — token eksik'), {
      kaynak: 'telegramService.ts',
      islem: 'WEBHOOK_HANDLE'
    }, 'CRITICAL');
    return;
  }

  try {
    // Grammy bot.init() — handleUpdate öncesi zorunlu
    await ensureBotInitialized(botInstance);
    // Grammy'nin update handler'ı
    await botInstance.handleUpdate(update as Parameters<typeof botInstance.handleUpdate>[0]);
  } catch (error) {
    processError(ERR.TELEGRAM_SEND, error, {
      kaynak: 'telegramService.ts',
      islem: 'WEBHOOK_HANDLE'
    });
  }
}

// ─── BOT DURUMU KONTROLÜ ───────────────────────────────────
export function isTelegramBotAvailable(): boolean {
  return !!(TELEGRAM_BOT_TOKEN && !TELEGRAM_BOT_TOKEN.includes('your-bot-token'));
}
