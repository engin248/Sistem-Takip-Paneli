// ============================================================
// TELEGRAM VOICE HANDLER — Sesli Komut + HERMAIA Doğrulama
// ============================================================
// Whisper ile ses → metin çevirme + HERMAIA kalite denetimi.
// Kullanıcı onay vermeden görev oluşturulmaz.
// ============================================================

import { InlineKeyboard, type Context } from 'grammy';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from '@/services/auditService';
import { sendReply, TELEGRAM_BOT_TOKEN } from './botSetup';

// ─── TİP TANIMLARI ──────────────────────────────────────────
type HermaiaReport = {
  durum: 'Doğru' | 'Eksik/Yetersiz' | 'Hatalı';
  wer_tahmini: number;
  neden: string[];
};

export type TranscribeResult = {
  success: boolean;
  text?: string;
  errorMsg?: string;
  hermaia?: HermaiaReport;
};

// ─── SES ONAY BEKLEYENLER (In-Memory) ──────────────────────
// chatId → { text, timestamp }
export const pendingVoiceCommands = new Map<number, { text: string; timestamp: number }>();

// ─── LOKAL WHISPER — SES → METİN ───────────────────────────
// Sıfır maliyet politikası: OpenAI Whisper API kullanılmaz.
// Masaüstündeki lokal Whisper Docker (http://127.0.0.1:8000) kullanılır.
export async function transcribeVoice(fileUrl: string): Promise<TranscribeResult> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error('Telegram ses dosyası indirilemedi');

    const fileBlob = await response.blob();
    const formData = new FormData();
    formData.append('file', fileBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');

    const whisperRes = await fetch('http://127.0.0.1:8000/v1/audio/transcriptions', {
      method: 'POST',
      body: formData,
    });

    if (!whisperRes.ok) {
      throw new Error(`Lokal API Hatası (HTTP ${whisperRes.status})`);
    }

    const json = await whisperRes.json();

    // ── HERMAIA DOĞRULAMA MOTORU ─────────────────────────────
    let errRate = 0;
    const reasons: string[] = [];

    if (json.segments && json.segments.length > 0) {
      let totalLogProb = 0;
      let maxNoSpeech = 0;

      json.segments.forEach((seg: { avg_logprob?: number; no_speech_prob?: number }) => {
        totalLogProb += seg.avg_logprob || 0;
        if ((seg.no_speech_prob ?? 0) > maxNoSpeech) maxNoSpeech = seg.no_speech_prob ?? 0;
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

    return {
      success: true,
      text: json.text || '',
      hermaia: { durum, wer_tahmini: errRate, neden: reasons },
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Bilinmeyen bağlantı hatası';
    processError(ERR.AI_ANALYSIS, error, {
      kaynak: 'voiceHandler.ts',
      islem: 'WHISPER_TRANSCRIBE',
    }, 'WARNING');
    return { success: false, errorMsg: errMsg };
  }
}

// ─── SESLE MESAJ HANDLER ────────────────────────────────────
export async function handleVoiceMessage(
  ctx: Context,
  isAuthorizedFn: (chatId: number) => boolean,
  onConfirm: (ctx: Context, text: string) => Promise<void>
): Promise<void> {
  const chatId = ctx.chat?.id ?? 0;

  if (!isAuthorizedFn(chatId)) {
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
        ? `❌ <b>SİSTEM UYARISI</b>\n\nLokal Yapay Zeka Sunucusuna ulaşılamadı.\n\n<code>Hata: ${result.errorMsg}</code>\n\n📌 <i>Çözüm: STP_LOCAL_AI/baslat.bat çalıştırın.</i>\n\nŞimdilik yazılı mesaj gönderin.`
        : '❌ Ses tanıma başarısız. Lütfen yazılı mesaj gönderin.';
      await sendReply(ctx, fallbackMsg);
      return;
    }

    const transcription = result.text;

    // Onay bekleyenlere ekle — 5 dk timeout
    pendingVoiceCommands.set(chatId, { text: transcription, timestamp: Date.now() });
    setTimeout(() => { pendingVoiceCommands.delete(chatId); }, 5 * 60 * 1000);

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
        `Durum: ${result.hermaia?.durum === 'Doğru' ? '🟢' : result.hermaia?.durum === 'Eksik/Yetersiz' ? '🟡' : '🔴'} <b>${result.hermaia?.durum}</b> (WER: %${Math.round((result.hermaia?.wer_tahmini || 0) * 100)})`,
        `Gerekçe: <i>${result.hermaia?.neden.length ? result.hermaia.neden.join(' / ') : 'Kusursuz Tanındı'}</i>`,
        ``,
        `⚠️ <b>Bu metin işleme alınsın mı?</b>`,
        `Doğruysa ✅ DOĞRU butonuna basın.`,
        `Yanlışsa ❌ YANLIŞ butonuna basın veya yazılı gönderin.`,
      ].join('\n'),
      { parse_mode: 'HTML', reply_markup: keyboard }
    );
  } catch (error) {
    processError(ERR.AI_ANALYSIS, error, {
      kaynak: 'voiceHandler.ts',
      islem: 'VOICE_PROCESS',
      chat_id: chatId,
    });
    await sendReply(ctx, '❌ Sesli mesaj işlenemedi. Lütfen yazılı mesaj gönderin.');
  }
}

// ─── ONAY CALLBACK'LERİ ─────────────────────────────────────
export async function handleVoiceConfirm(
  ctx: Context,
  onConfirm: (ctx: Context, text: string) => Promise<void>
): Promise<void> {
  const chatId = ctx.chat?.id ?? 0;
  const pending = pendingVoiceCommands.get(chatId);

  if (!pending) {
    await ctx.answerCallbackQuery({ text: '⏰ Süre doldu — yeni sesli mesaj gönderin.' });
    return;
  }

  pendingVoiceCommands.delete(chatId);
  await ctx.answerCallbackQuery({ text: '✅ Onaylandı — görev oluşturuluyor...' });

  try {
    await ctx.editMessageText(
      `✅ <b>ONAYLANDI</b>\n\n📝 "${pending.text}"\n\n⏳ Görev oluşturuluyor...`,
      { parse_mode: 'HTML' }
    );
  } catch { /* mesaj düzenleme hatası — kritik değil */ }

  await onConfirm(ctx, pending.text);
}

export async function handleVoiceReject(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id ?? 0;
  pendingVoiceCommands.delete(chatId);

  await ctx.answerCallbackQuery({ text: '❌ İptal edildi.' });

  try {
    await ctx.editMessageText(
      `❌ <b>İPTAL EDİLDİ</b>\n\nSesli komut reddedildi.\nLütfen tekrar deneyin veya yazılı gönderin.`,
      { parse_mode: 'HTML' }
    );
  } catch { /* kritik değil */ }
}
