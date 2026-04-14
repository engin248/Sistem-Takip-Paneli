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

import { Bot, InlineKeyboard, type Context } from 'grammy';
import { supabase, validateSupabaseConnection } from '@/lib/supabase';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';
import { analyzeTaskPriority, getPriorityLabel, getPriorityEmoji } from './aiManager';
import { CONTROL } from '@/core/control_engine';
import type { TaskPriority } from '@/store/useTaskStore';

// ─── ORTAM DEĞİŞKENLERİ ────────────────────────────────────
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
// OPENAI_API_KEY KULLANILMAZ — sıfır maliyet politikası
const AUTHORIZED_CHAT_IDS = (process.env.TELEGRAM_AUTHORIZED_CHAT_IDS ?? '')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

// ─── BOT SINGLETON ──────────────────────────────────────────
let bot: Bot | null = null;
let botInitialized = false;

// ─── SESSLİ KOMUT ONAY BEKLEYENLERİ ────────────────────────
// chatId → { text, timestamp } şeklinde bekleyen sesli komutlar.
// Kullanıcı sesi metne çevrildikten sonra onay vermezse 5dk sonra silinir.
const pendingVoiceCommands = new Map<number, { text: string; timestamp: number }>();

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

// ─── SES MESAJINI METİNE ÇEVİR ─────────────────────────────
// SIFIR MALİYET POLİTİKASI: OpenAI Whisper API kullanılmaz.
// Sesli mesaj geldiğinde kullanıcıdan yazılı doğrulama istenir.
// Gelecekte lokal Ollama/Whisper entegrasyonu eklenebilir ($0).
// ─────────────────────────────────────────────────────────────
// NOT: Lokal Whisper Entegrasyonu (Zero-Cost / Sıfır Maliyet)
// Masaüstünde çalışan (http://127.0.0.1:8000) LocalAI Docker container'ına bağlanır.
type HermaiaReport = {
  durum: 'Doğru' | 'Eksik/Yetersiz' | 'Hatalı';
  wer_tahmini: number;
  neden: string[];
};

type TranscribeResult = { success: boolean; text?: string; errorMsg?: string; hermaia?: HermaiaReport };

async function transcribeVoice(fileUrl: string): Promise<TranscribeResult> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error('Telegram ses dosyası indirilemedi');
    
    // Telegram'dan gelen dosyayı FormData'ya uygun Blob'a çeviriyoruz
    const fileBlob = await response.blob();
    const formData = new FormData();
    formData.append('file', fileBlob, 'audio.ogg');
    formData.append('model', 'whisper-1'); // İsim fark etmez, local server yönlendirir
    formData.append('response_format', 'verbose_json'); // HERMAIA Metrikleri

    // Masaüstündeki Local Whisper API'sine istek at
    const whisperRes = await fetch('http://127.0.0.1:8000/v1/audio/transcriptions', {
      method: 'POST',
      body: formData,
    });

    if (!whisperRes.ok) {
      throw new Error(`Lokal API Hatası (HTTP ${whisperRes.status})`);
    }

    const json = await whisperRes.json();

    // --- HERMAIA MOTORU ---
    let errRate = 0;
    const reasons: string[] = [];
    
    if (json.segments && json.segments.length > 0) {
      let totalLogProb = 0;
      let maxNoSpeech = 0;
      
      json.segments.forEach((seg: any) => {
        totalLogProb += seg.avg_logprob || 0;
        if (seg.no_speech_prob > maxNoSpeech) maxNoSpeech = seg.no_speech_prob;
      });
      
      const avgLogProb = totalLogProb / json.segments.length;
      const confidence = Math.exp(avgLogProb);
      errRate = 1 - confidence;

      if (maxNoSpeech > 0.15) reasons.push('arka plan gürültüsü ortamda yüksek');
      if (errRate > 0.10) reasons.push('belirsiz akustik telaffuz / devrik ifade');
      if (json.duration && (json.text?.split(' ').length || 0) / json.duration > 3.0) {
        reasons.push('konuşma hızı normale göre yüksek');
      }
    }

    if (reasons.length === 0 && errRate > 0.05) {
      reasons.push('kelime/harf yutulması veya benzer kelime karışması');
    }

    let durum: 'Doğru' | 'Eksik/Yetersiz' | 'Hatalı' = 'Doğru';
    if (errRate > 0.15) durum = 'Hatalı';
    else if (errRate > 0.05) durum = 'Eksik/Yetersiz';

    const hermaia: HermaiaReport = {
      durum,
      wer_tahmini: errRate,
      neden: reasons
    };

    return { success: true, text: json.text || '', hermaia };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Bilinmeyen bağlantı hatası';
    // Sunucu kapalıysa veya hata varsa hatayı logla
    processError(ERR.AI_ANALYSIS, error, {
       kaynak: 'telegramService.ts',
       islem: 'WHISPER_TRANSCRIBE'
    }, 'WARNING');
    
    // Hata mesajını dışarı aktar ki Telegram panelinde kullanıcıya gösterilsin
    return { success: false, errorMsg: errMsg };
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

  // ── L0 GENERIC CONTROL (Gatekeeper) ─────────────
  const controlResult = CONTROL('TELEGRAM_MSG_TEXT', text);
  if (!controlResult.pass) {
    await sendReply(ctx, '⚠️ Geçersiz veya boş veri gönderildi.');
    await logAudit({
      operation_type: 'REJECT',
      action_description: `Geçersiz Telegram komutu: ${controlResult.reason}`,
      metadata: { action_code: 'TELEGRAM_L0_REJECT', chat_id: chatId, sender: senderName }
    }).catch(() => {});
    return;
  }

  // Boş mesaj kontrolü (Ekstra uzunluk kısıtlaması)
  if (text.trim().length < 3) {
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
      `🤖 <b>AI Motoru:</b> 🟢 LOKAL MOD (Sıfır Maliyet)`,
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
      `/gorevler — Aktif görev listesi`,
      `/gorev TSK-xxx — Görev detayı`,
      `/tamamla TSK-xxx — Görevi tamamla`,
      `/iptal TSK-xxx — Görevi iptal et`,
      `/yardim — Bu mesaj`,
      ``,
      `<b>Öncelik Seviyeleri (AI atar):</b>`,
      `🚨 KRİTİK — Acil müdahale`,
      `⚠️ YÜKSEK — Aynı gün`,
      `📋 NORMAL — Standart akış`,
      `📝 DÜŞÜK — Zamanı gelince`,
    ].join('\n'));
  });

  // /gorevler komutu — aktif görev listesi
  botInstance.command('gorevler', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    if (!isAuthorized(chatId)) {
      await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('task_code, title, status, priority, assigned_to, created_at')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) {
        await sendReply(ctx, `❌ Görevler yüklenemedi: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        await sendReply(ctx, '📭 Aktif görev bulunamadı.');
        return;
      }

      const priorityEmoji: Record<string, string> = {
        kritik: '🔴', yuksek: '🟠', normal: '🟡', dusuk: '🟢',
      };
      const statusEmoji: Record<string, string> = {
        beklemede: '⏳', devam_ediyor: '⚡', dogrulama: '🔍', tamamlandi: '✅', reddedildi: '❌', iptal: '🚫',
      };

      const lines = data.map((t, i) => {
        const pe = priorityEmoji[t.priority] ?? '🟡';
        const se = statusEmoji[t.status] ?? '⏳';
        return `${i + 1}. ${pe}${se} <code>${t.task_code}</code>\n   ${t.title}\n   → ${t.assigned_to} | ${t.status}`;
      });

      await sendReply(ctx, [
        `📋 <b>AKTİF GÖREVLER</b> (${data.length})`,
        ``,
        ...lines,
        ``,
        `📌 Detay: /gorev TSK-xxx`,
        `✅ Tamamla: /tamamla TSK-xxx`,
      ].join('\n'));
    } catch (err) {
      processError(ERR.TASK_FETCH, err, { kaynak: 'telegramService.ts', islem: 'GOREVLER_CMD' });
      await sendReply(ctx, '❌ Görev listesi alınırken hata oluştu.');
    }
  });

  // /gorev TSK-xxx — görev detayı
  botInstance.command('gorev', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    if (!isAuthorized(chatId)) {
      await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM.');
      return;
    }

    const taskCode = ctx.match?.trim();
    if (!taskCode) {
      await sendReply(ctx, '⚠️ Kullanım: /gorev TSK-20260413-XXXX');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('task_code', taskCode.toUpperCase())
        .single();

      if (error || !data) {
        await sendReply(ctx, `❌ Görev bulunamadı: <code>${taskCode}</code>`);
        return;
      }

      const pe: Record<string, string> = { kritik: '🔴', yuksek: '🟠', normal: '🟡', dusuk: '🟢' };
      const createdAt = new Date(data.created_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

      await sendReply(ctx, [
        `📋 <b>GÖREV DETAYI</b>`,
        ``,
        `<b>Kod:</b> <code>${data.task_code}</code>`,
        `<b>Başlık:</b> ${data.title}`,
        data.description ? `<b>Açıklama:</b> ${data.description}` : '',
        `${pe[data.priority] ?? '🟡'} <b>Öncelik:</b> ${data.priority.toUpperCase()}`,
        `<b>Durum:</b> ${data.status}`,
        `<b>Atanan:</b> ${data.assigned_to}`,
        `<b>Oluşturulma:</b> ${createdAt}`,
        data.due_date ? `<b>Son Tarih:</b> ${new Date(data.due_date).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}` : '',
        ``,
        `✅ /tamamla ${data.task_code}`,
        `🚫 /iptal ${data.task_code}`,
      ].filter(Boolean).join('\n'));
    } catch (err) {
      processError(ERR.TASK_FETCH, err, { kaynak: 'telegramService.ts', islem: 'GOREV_DETAIL_CMD' });
      await sendReply(ctx, '❌ Görev detayı alınırken hata oluştu.');
    }
  });

  // /tamamla TSK-xxx — görevi tamamla
  botInstance.command('tamamla', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    if (!isAuthorized(chatId)) {
      await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM.');
      return;
    }

    const taskCode = ctx.match?.trim();
    if (!taskCode) {
      await sendReply(ctx, '⚠️ Kullanım: /tamamla TSK-20260413-XXXX');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: 'tamamlandi', updated_at: new Date().toISOString() })
        .eq('task_code', taskCode.toUpperCase())
        .select();

      if (error || !data || data.length === 0) {
        await sendReply(ctx, `❌ Görev bulunamadı veya güncellenemedi: <code>${taskCode}</code>`);
        return;
      }

      await logAudit({
        operation_type: 'UPDATE',
        action_description: `Telegram'dan görev tamamlandı: ${taskCode}`,
        task_id: data[0]?.id ?? null,
        metadata: { action_code: 'TASK_COMPLETED_VIA_TELEGRAM', task_code: taskCode, chat_id: chatId },
      }).catch(() => {});

      await sendReply(ctx, `✅ <b>GÖREV TAMAMLANDI</b>\n\nKod: <code>${taskCode}</code>\nBaşlık: ${data[0]?.title ?? ''}`);
    } catch (err) {
      processError(ERR.TASK_UPDATE, err, { kaynak: 'telegramService.ts', islem: 'TAMAMLA_CMD' });
      await sendReply(ctx, '❌ Görev tamamlanırken hata oluştu.');
    }
  });

  // /iptal TSK-xxx — görevi iptal et
  botInstance.command('iptal', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    if (!isAuthorized(chatId)) {
      await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM.');
      return;
    }

    const taskCode = ctx.match?.trim();
    if (!taskCode) {
      await sendReply(ctx, '⚠️ Kullanım: /iptal TSK-20260413-XXXX');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: 'iptal', updated_at: new Date().toISOString() })
        .eq('task_code', taskCode.toUpperCase())
        .select();

      if (error || !data || data.length === 0) {
        await sendReply(ctx, `❌ Görev bulunamadı veya güncellenemedi: <code>${taskCode}</code>`);
        return;
      }

      await logAudit({
        operation_type: 'UPDATE',
        action_description: `Telegram'dan görev iptal edildi: ${taskCode}`,
        task_id: data[0]?.id ?? null,
        metadata: { action_code: 'TASK_CANCELLED_VIA_TELEGRAM', task_code: taskCode, chat_id: chatId },
      }).catch(() => {});

      await sendReply(ctx, `🚫 <b>GÖREV İPTAL EDİLDİ</b>\n\nKod: <code>${taskCode}</code>\nBaşlık: ${data[0]?.title ?? ''}`);
    } catch (err) {
      processError(ERR.TASK_UPDATE, err, { kaynak: 'telegramService.ts', islem: 'IPTAL_CMD' });
      await sendReply(ctx, '❌ Görev iptal edilirken hata oluştu.');
    }
  });

  // Yazılı mesaj → Görev oluştur
  botInstance.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    // Komut mesajlarını atla (/ ile başlayanlar zaten command handler'dan geçti)
    if (text.startsWith('/')) return;
    await handleTaskMessage(ctx, text, 'text');
  });

  // Sesli mesaj → Whisper → ONAY KATMANI → Görev oluştur
  // Ses metne çevrildikten sonra kullanıcıya onay butonu gösterilir.
  // %100 doğruluk garanti edilir — kullanıcı onaylamadan işleme alınmaz.
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

      const result = await transcribeVoice(fileUrl);

      if (!result.success || !result.text) {
        const fallbackMsg = result.errorMsg 
          ? `❌ <b>SİSTEM UYARISI</b>\n\nLokal Yapay Zeka Sunucusuna ulaşılamadı veya hata verdi.\n\n<code>Hata Detayı: ${result.errorMsg}</code>\n\n📌 <i>Çözüm: Lütfen masaüstündeki STP_LOCAL_AI klasöründeki baslat.bat dosyasını çalıştırdığınızdan emin olun.</i>\n\nŞimdilik lütfen yazılı mesaj gönderin.`
          : '❌ Ses tanıma başarısız. Lütfen yazılı mesaj gönderin.';
        
        await sendReply(ctx, fallbackMsg);
        return;
      }

      const transcription = result.text;

      // ── SES DOĞRULAMA KATMANI ──────────────────────────────
      // Sesi metne çevirdik — şimdi kullanıcıya onay soruyoruz.
      // İşleme almadan ÖNCE kullanıcının "EVET" demesi zorunlu.
      pendingVoiceCommands.set(chatId, {
        text: transcription,
        timestamp: Date.now(),
      });

      // 5 dakika sonra otomatik sil (timeout temizliği)
      setTimeout(() => {
        pendingVoiceCommands.delete(chatId);
      }, 5 * 60 * 1000);

      const keyboard = new InlineKeyboard()
        .text('✅ DOĞRU — İşleme Al', 'voice_confirm')
        .text('❌ YANLIŞ — İptal', 'voice_reject');

      await ctx.reply(
        [
          `🎙️ <b>SES TANIMA SONUCU</b>`,
          ``,
          `📝 <b>Sistem Çıktısı:</b>`,
          `<blockquote>${transcription}</blockquote>`,
          ``,
          `📊 <b>HERMAIA Kalite Denetimi</b>`,
          `Durum: ${result.hermaia?.durum === 'Doğru' ? '🟢' : result.hermaia?.durum === 'Eksik/Yetersiz' ? '🟡' : '🔴'} <b>${result.hermaia?.durum}</b> (WER Tahmini: %${Math.round((result.hermaia?.wer_tahmini || 0) * 100)})`,
          `Gerekçe: <i>${result.hermaia?.neden.length ? result.hermaia.neden.join(' / ') : 'Kusursuz Tanımlandı'}</i>`,
          ``,
          `⚠️ <b>Bu metin işleme alınsın mı?</b>`,

          `Doğruysa ✅ DOĞRU butonuna basın.`,
          `Yanlışsa ❌ YANLIŞ butonuna basın veya yazılı gönderin.`,
        ].join('\n'),
        { parse_mode: 'HTML', reply_markup: keyboard }
      );
    } catch (error) {
      processError(ERR.AI_ANALYSIS, error, {
        kaynak: 'telegramService.ts',
        islem: 'VOICE_PROCESS',
        chat_id: chatId
      });
      await sendReply(ctx, '❌ Sesli mesaj işlenemedi. Lütfen yazılı mesaj gönderin.');
    }
  });

  // ── SES ONAY CALLBACK HANDLERLARI ─────────────────────────
  // Kullanıcı ✅ DOĞRU butonuna basarsa → görev oluştur
  // Kullanıcı ❌ YANLIŞ butonuna basarsa → iptal et
  botInstance.callbackQuery('voice_confirm', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    const pending = pendingVoiceCommands.get(chatId);

    if (!pending) {
      await ctx.answerCallbackQuery({ text: '⏰ Süre doldu — yeni sesli mesaj gönderin.' });
      return;
    }

    // Onayı temizle
    pendingVoiceCommands.delete(chatId);
    await ctx.answerCallbackQuery({ text: '✅ Onaylandı — görev oluşturuluyor...' });

    // Onay mesajını güncelle
    try {
      await ctx.editMessageText(
        `✅ <b>ONAYLANDI</b>\n\n📝 "${pending.text}"\n\n⏳ Görev oluşturuluyor...`,
        { parse_mode: 'HTML' }
      );
    } catch { /* mesaj düzenleme hatası — kritik değil */ }

    // Görev oluştur
    await handleTaskMessage(ctx, pending.text, 'voice');
  });

  botInstance.callbackQuery('voice_reject', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    pendingVoiceCommands.delete(chatId);

    await ctx.answerCallbackQuery({ text: '❌ İptal edildi.' });

    try {
      await ctx.editMessageText(
        `❌ <b>İPTAL EDİLDİ</b>\n\nSesli komut reddedildi.\nLütfen tekrar deneyin veya yazılı gönderin.`,
        { parse_mode: 'HTML' }
      );
    } catch { /* mesaj düzenleme hatası — kritik değil */ }

    await logAudit({
      operation_type: 'REJECT',
      action_description: `Sesli komut reddedildi — kullanıcı onaylamadı (Chat: ${chatId})`,
      metadata: {
        action_code: 'VOICE_COMMAND_REJECTED',
        chat_id: chatId,
        reason: 'USER_REJECTED_TRANSCRIPTION',
      }
    }).catch(() => {});
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
