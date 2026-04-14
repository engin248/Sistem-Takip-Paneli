// ============================================================
// TELEGRAM COMMAND ROUTER — Bot Komut Handler Kaydı
// ============================================================
// Tüm /komut handler'ları burada kayıtlıdır.
// bot.ts (telegramService) tarafından registerHandlers() ile çağrılır.
//
// Komutlar:
//   /start | /durum | /yardim | /gorevler | /gorev | /tamamla | /iptal
//   message:text | message:voice | callback voice_confirm | voice_reject
// ============================================================

import { type Bot, type Context } from 'grammy';
import { supabase, validateSupabaseConnection } from '@/lib/supabase';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from '@/services/auditService';
import { analyzeTaskPriority, getPriorityLabel, getPriorityEmoji } from '@/services/aiManager';
import { CONTROL } from '@/core/control_engine';
import type { TaskPriority } from '@/store/useTaskStore';
import { CriteriaEngine, type IntentAnalysis } from '@/core/hermAI/criteriaEngine';
import { Verifier, type ProofSpec } from '@/core/proof/verifier';
import { ProofChain } from '@/core/storage/proofChain';
import {
  isAuthorized,
  sendReply,
  generateTaskCode,
  getSystemStatusMessage,
} from './botSetup';
import {
  handleVoiceMessage,
  handleVoiceConfirm,
  handleVoiceReject,
} from './voiceHandler';

// ─── HERMAİ SINGLETON'LAR ───────────────────────────────────
const _criteriaEngine = new CriteriaEngine();
const _verifier = new Verifier();
const _proofChain = new ProofChain();

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
        tablo: 'tasks', islem: 'INSERT', task_code: taskCode, kaynak: 'telegram'
      });
      return { success: false, taskCode, error: error.message };
    }

    await logAudit({
      operation_type: 'CREATE',
      action_description: `Telegram'dan görev oluşturuldu: "${title}" [${taskCode}] → ${priority.toUpperCase()}`,
      task_id: data?.[0]?.id ?? null,
      metadata: {
        action_code: 'TELEGRAM_TASK_CREATED',
        task_code: taskCode, title, priority, source,
        sender: senderName, chat_id: chatId,
        ai_source: aiSource, ai_confidence: aiConfidence, ai_reasoning: aiReasoning
      }
    }).catch(() => {});

    return { success: true, taskCode };
  } catch (err) {
    processError(ERR.TASK_CREATE_GENERAL, err, {
      tablo: 'tasks', islem: 'INSERT', kaynak: 'telegram'
    });
    return { success: false, taskCode, error: String(err) };
  }
}

// ─── ANA MESAJ İŞLEYİCİ ────────────────────────────────────
export async function handleTaskMessage(ctx: Context, text: string, source: 'text' | 'voice'): Promise<void> {
  const chatId = ctx.chat?.id ?? 0;
  const senderName = ctx.from?.first_name
    ? `${ctx.from.first_name}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}`
    : 'Bilinmeyen';

  // ── FAZ 0: L0 GATEKEEPER (CONTROL) ───────────────────────
  const ctrl = CONTROL('TELEGRAM_MESSAGE_TEXT', text);
  if (!ctrl.pass) {
    await sendReply(ctx, `⚠️ Geçersiz komut içeriği [${ctrl.reason}]. Lütfen geçerli bir metin gönderin.`);
    await logAudit({
      operation_type: 'REJECT',
      action_description: `CONTROL L0 RED: ${ctrl.proof}`,
      metadata: { action_code: 'L0_CONTROL_REJECTED', chat_id: chatId, sender: senderName, reason: ctrl.reason }
    }).catch(() => {});
    return;
  }

  // Komut alındı kaydı
  await logAudit({
    operation_type: 'SYSTEM',
    action_description: `Telegram komut alındı: "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}" [${source.toUpperCase()}]`,
    metadata: {
      action_code: 'IA_COMMAND_RECEIVED',
      message_type: source, chat_id: chatId, sender: senderName,
      message_length: text.length, received_at: new Date().toISOString(),
    }
  }).catch(() => {});

  // Yetki
  if (!isAuthorized(chatId)) {
    await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM. Bu bot yalnızca yetkilendirilmiş operatörler tarafından kullanılabilir.');
    await logAudit({
      operation_type: 'REJECT',
      action_description: `Yetkisiz Telegram erişim: ${senderName} (${chatId})`,
      metadata: { action_code: 'TELEGRAM_UNAUTHORIZED', chat_id: chatId, sender: senderName }
    }).catch(() => {});
    return;
  }

  if (!text || text.trim().length < 3) {
    await sendReply(ctx, '⚠️ Görev metni çok kısa. En az 3 karakter gereklidir.');
    return;
  }

  // ── FAZ 1: HERMAİ TEMEL KRİTER KONTROLÜ (92 kriter) ─────
  const basicIntent: IntentAnalysis = {
    why: text,
    how: `Telegram ${source} komutu`,
    risks: [],
    alternatives: [],
    conditions: [source === 'voice' ? 'HERMAIA doğrulandı' : 'yazılı komut'],
    refutation: text.length > 10 ? text : 'Girdi yeterli uzunlukta',
  };
  const basicCriteria = _criteriaEngine.check(text, basicIntent);
  if (!basicCriteria.isPassing) {
    await sendReply(ctx, [
      `⚠️ <b>HermAI Kriter Kontrolü Başarısız</b>`,
      ``,
      `📊 Skor: %${basicCriteria.score} (${basicCriteria.passed}/${basicCriteria.total})`,
      `❌ Başarısız: ${basicCriteria.failed.slice(0, 3).join(', ')}`,
      ``,
      `💡 Lütfen görev açıklamasını daha net ve eksiksiz yazın.`,
    ].join('\n'));
    return;
  }

  // ── FAZ 2: AI ÖNCELİK ANALİZİ ───────────────────────────
  await sendReply(ctx, '🔄 Görev analiz ediliyor...');
  const analysis = await analyzeTaskPriority(text, null, { useAI: true, timeoutMs: 15000 });

  // ── FAZ 3: HERMAİ TAM NİYET ANALİZİ + PROOF ─────────────
  const fullIntent: IntentAnalysis = {
    why: analysis.reasoning,
    how: `Görev oluşturma — öncelik: ${analysis.priority} (güven: %${Math.round(analysis.confidence * 100)})`,
    risks: analysis.confidence < 0.7 ? ['Düşük AI güven skoru'] : [],
    alternatives: analysis.source === 'ai' ? ['Lokal kural analizi'] : ['AI (Ollama) analizi'],
    conditions: [
      source === 'voice' ? 'HERMAIA ses doğrulaması yapıldı' : 'yazılı komut',
      `AI kaynağı: ${analysis.source}`,
    ],
    refutation: `AI güven skoru %${Math.round(analysis.confidence * 100)} — ${analysis.source === 'ai' ? 'Ollama' : 'Lokal motor'} tarafından doğrulandı`,
  };

  const fullCriteria = _criteriaEngine.check(text, fullIntent);

  const spec: ProofSpec = {
    logicHash: ProofChain.hashInput(text + analysis.priority + String(chatId)).slice(0, 16),
    preCondition: `Telegram ${source} komutu: "${text.substring(0, 100)}"`,
    postCondition: `Görev oluşturulacak: priority=${analysis.priority}, assigned=${senderName}`,
    input: text,
    context: { chatId, senderName, source, ai_source: analysis.source },
  };

  const verifyResult = await _verifier.doubleVerify(spec);

  // Proof zinciri kaydı (onay durumundan bağımsız — her işlem kaydedilir)
  const proofEntry = ProofChain.createEntry(
    'TELEGRAM_TASK_CREATE',
    text,
    fullIntent as unknown as Record<string, unknown>,
    fullCriteria.score,
    verifyResult.verified,
    verifyResult.proof,
    { chatId, senderName, source }
  );
  await _proofChain.addToChain(proofEntry).catch(() => {});

  if (!verifyResult.verified) {
    await sendReply(ctx, [
      `🔴 <b>PROOF DOĞRULAMA BAŞARISIZ</b>`,
      ``,
      `📊 Kriter Skoru: %${fullCriteria.score}`,
      `🔍 Kural Motoru: ${verifyResult.v1_rule ? '✅' : '❌'}`,
      `🤖 AI Doğrulama: ${verifyResult.v2_ai ? '✅' : '❌'}`,
      ``,
      `💬 Görev daha açık bir şekilde yeniden yazılabilir mi?`,
    ].join('\n'));
    return;
  }

  // ── FAZ 4: GÖREV OLUŞTUR ─────────────────────────────────
  const result = await createTaskFromTelegram(
    text, analysis.priority, source, senderName, chatId,
    analysis.reasoning, analysis.confidence, analysis.source
  );

  if (result.success) {
    const emoji = getPriorityEmoji(analysis.priority);
    const label = getPriorityLabel(analysis.priority);
    const motorIcon = analysis.source === 'ai' ? '🤖' : '📐';
    await sendReply(ctx, [
      `✅ <b>GÖREV OLUŞTURULDU</b>`,
      ``,
      `📋 <b>Kod:</b> ${result.taskCode}`,
      `📝 <b>Başlık:</b> ${text}`,
      `${emoji} <b>Öncelik:</b> ${label}`,
      `${motorIcon} <b>Motor:</b> ${analysis.source === 'ai' ? 'AI (Ollama)' : 'Lokal Analiz'}`,
      `📊 <b>Güven:</b> %${Math.round(analysis.confidence * 100)}`,
      `💬 <b>Gerekçe:</b> ${analysis.reasoning}`,
      ``,
      `📌 <b>Durum:</b> Beklemede`,
      `👤 <b>Atanan:</b> ${senderName}`,
      `📡 <b>Kaynak:</b> ${source === 'voice' ? '🎤 Sesli Komut' : '💬 Yazılı Komut'}`,
    ].join('\n'));
  } else {
    await sendReply(ctx, `❌ <b>HATA:</b> Görev oluşturulamadı.\n\n<code>${result.error || 'Bilinmeyen hata'}</code>`);
  }
}

// ─── TÜM HANDLER'LARI KAYDET ───────────────────────────────
export function registerHandlers(botInstance: Bot): void {
  // /start
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
      `• /durum → Sistem durumu | /yardim → Komut listesi`,
      ``,
      `📡 Chat ID: <code>${chatId}</code>`,
    ].join('\n'));
  });

  // /durum
  botInstance.command('durum', async (ctx) => {
    await sendReply(ctx, getSystemStatusMessage());
  });

  // /yardim
  botInstance.command('yardim', async (ctx) => {
    await sendReply(ctx, [
      `📖 <b>KOMUT LİSTESİ</b>`,
      ``,
      `💬 <b>Metin mesaj:</b> Doğrudan görev olarak kaydedilir`,
      `🎤 <b>Sesli mesaj:</b> Whisper ile metne çevrilip görev olarak kaydedilir`,
      ``,
      `<b>Komutlar:</b>`,
      `/start | /durum | /yardim`,
      `/gorevler — Aktif görev listesi`,
      `/gorev TSK-xxx — Görev detayı`,
      `/tamamla TSK-xxx — Görevi tamamla`,
      `/iptal TSK-xxx — Görevi iptal et`,
      ``,
      `<b>Öncelik Seviyeleri (AI atar):</b>`,
      `🚨 KRİTİK | ⚠️ YÜKSEK | 📋 NORMAL | 📝 DÜŞÜK`,
    ].join('\n'));
  });

  // /gorevler
  botInstance.command('gorevler', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    if (!isAuthorized(chatId)) { await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM.'); return; }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('task_code, title, status, priority, assigned_to, created_at')
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) { await sendReply(ctx, `❌ Görevler yüklenemedi: ${error.message}`); return; }
      if (!data || data.length === 0) { await sendReply(ctx, '📭 Aktif görev bulunamadı.'); return; }

      const pe: Record<string, string> = { kritik: '🔴', yuksek: '🟠', normal: '🟡', dusuk: '🟢' };
      const se: Record<string, string> = { beklemede: '⏳', devam_ediyor: '⚡', dogrulama: '🔍', tamamlandi: '✅', reddedildi: '❌', iptal: '🚫' };
      const lines = data.map((t, i) =>
        `${i + 1}. ${pe[t.priority] ?? '🟡'}${se[t.status] ?? '⏳'} <code>${t.task_code}</code>\n   ${t.title}\n   → ${t.assigned_to} | ${t.status}`
      );

      await sendReply(ctx, [`📋 <b>AKTİF GÖREVLER</b> (${data.length})`, ``, ...lines, ``, `📌 Detay: /gorev TSK-xxx`].join('\n'));
    } catch (err) {
      processError(ERR.TASK_FETCH, err, { kaynak: 'commandRouter.ts', islem: 'GOREVLER_CMD' });
      await sendReply(ctx, '❌ Görev listesi alınırken hata oluştu.');
    }
  });

  // /gorev TSK-xxx
  botInstance.command('gorev', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    if (!isAuthorized(chatId)) { await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM.'); return; }
    const taskCode = ctx.match?.trim();
    if (!taskCode) { await sendReply(ctx, '⚠️ Kullanım: /gorev TSK-20260413-XXXX'); return; }

    try {
      const { data, error } = await supabase.from('tasks').select('*').eq('task_code', taskCode.toUpperCase()).single();
      if (error || !data) { await sendReply(ctx, `❌ Görev bulunamadı: <code>${taskCode}</code>`); return; }

      const pe: Record<string, string> = { kritik: '🔴', yuksek: '🟠', normal: '🟡', dusuk: '🟢' };
      const createdAt = new Date(data.created_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

      await sendReply(ctx, [
        `📋 <b>GÖREV DETAYI</b>`, ``,
        `<b>Kod:</b> <code>${data.task_code}</code>`,
        `<b>Başlık:</b> ${data.title}`,
        data.description ? `<b>Açıklama:</b> ${data.description}` : '',
        `${pe[data.priority] ?? '🟡'} <b>Öncelik:</b> ${data.priority.toUpperCase()}`,
        `<b>Durum:</b> ${data.status}`,
        `<b>Atanan:</b> ${data.assigned_to}`,
        `<b>Oluşturulma:</b> ${createdAt}`,
        data.due_date ? `<b>Son Tarih:</b> ${new Date(data.due_date).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}` : '',
        ``, `✅ /tamamla ${data.task_code}`, `🚫 /iptal ${data.task_code}`,
      ].filter(Boolean).join('\n'));
    } catch (err) {
      processError(ERR.TASK_FETCH, err, { kaynak: 'commandRouter.ts', islem: 'GOREV_DETAIL_CMD' });
      await sendReply(ctx, '❌ Görev detayı alınırken hata oluştu.');
    }
  });

  // /tamamla TSK-xxx
  botInstance.command('tamamla', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    if (!isAuthorized(chatId)) { await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM.'); return; }
    const taskCode = ctx.match?.trim();
    if (!taskCode) { await sendReply(ctx, '⚠️ Kullanım: /tamamla TSK-20260413-XXXX'); return; }

    try {
      const { data, error } = await supabase.from('tasks').update({ status: 'tamamlandi', updated_at: new Date().toISOString() }).eq('task_code', taskCode.toUpperCase()).select();
      if (error || !data || data.length === 0) { await sendReply(ctx, `❌ Görev bulunamadı: <code>${taskCode}</code>`); return; }

      await logAudit({ operation_type: 'UPDATE', action_description: `Telegram'dan görev tamamlandı: ${taskCode}`, task_id: data[0]?.id ?? null, metadata: { action_code: 'TASK_COMPLETED_VIA_TELEGRAM', task_code: taskCode, chat_id: chatId } }).catch(() => {});
      await sendReply(ctx, `✅ <b>GÖREV TAMAMLANDI</b>\n\nKod: <code>${taskCode}</code>\nBaşlık: ${data[0]?.title ?? ''}`);
    } catch (err) {
      processError(ERR.TASK_UPDATE, err, { kaynak: 'commandRouter.ts', islem: 'TAMAMLA_CMD' });
      await sendReply(ctx, '❌ Görev tamamlanırken hata oluştu.');
    }
  });

  // /iptal TSK-xxx
  botInstance.command('iptal', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    if (!isAuthorized(chatId)) { await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM.'); return; }
    const taskCode = ctx.match?.trim();
    if (!taskCode) { await sendReply(ctx, '⚠️ Kullanım: /iptal TSK-20260413-XXXX'); return; }

    try {
      const { data, error } = await supabase.from('tasks').update({ status: 'iptal', updated_at: new Date().toISOString() }).eq('task_code', taskCode.toUpperCase()).select();
      if (error || !data || data.length === 0) { await sendReply(ctx, `❌ Görev bulunamadı: <code>${taskCode}</code>`); return; }

      await logAudit({ operation_type: 'UPDATE', action_description: `Telegram'dan görev iptal edildi: ${taskCode}`, task_id: data[0]?.id ?? null, metadata: { action_code: 'TASK_CANCELLED_VIA_TELEGRAM', task_code: taskCode, chat_id: chatId } }).catch(() => {});
      await sendReply(ctx, `🚫 <b>GÖREV İPTAL EDİLDİ</b>\n\nKod: <code>${taskCode}</code>\nBaşlık: ${data[0]?.title ?? ''}`);
    } catch (err) {
      processError(ERR.TASK_UPDATE, err, { kaynak: 'commandRouter.ts', islem: 'IPTAL_CMD' });
      await sendReply(ctx, '❌ Görev iptal edilirken hata oluştu.');
    }
  });

  // Yazılı mesaj → görev
  botInstance.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;
    await handleTaskMessage(ctx, text, 'text');
  });

  // Sesli mesaj → voiceHandler
  botInstance.on('message:voice', async (ctx) => {
    await handleVoiceMessage(ctx, isAuthorized, (c, t) => handleTaskMessage(c, t, 'voice'));
  });

  // Ses onay callback'leri
  botInstance.callbackQuery('voice_confirm', async (ctx) => {
    await handleVoiceConfirm(ctx, (c, t) => handleTaskMessage(c, t, 'voice'));
  });

  botInstance.callbackQuery('voice_reject', async (ctx) => {
    await handleVoiceReject(ctx);
  });
}
