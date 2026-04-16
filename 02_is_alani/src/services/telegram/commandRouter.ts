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
import { webSearch } from '@/services/webSearch';
import { supabase, validateSupabaseConnection } from '@/lib/supabase';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from '@/services/auditService';
import { analyzeTaskPriority, getPriorityLabel, getPriorityEmoji } from '@/services/aiManager';
import { L0_GATEKEEPER, type L0Result } from '@/core/control_engine';
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
  // message_id: replay koruması için nonce tabanı
  const messageId = ctx.message?.message_id
    ?? (ctx as { callbackQuery?: { message?: { message_id?: number } } }).callbackQuery?.message?.message_id
    ?? Date.now();

  // ── FAZ 0+1: L0 GATEKEEPER ────────────────────────────────
  // Null, yetki, replay, sanitization, DB arşivi tek adımda.
  // Referans: src/core/control_engine.ts
  let l0Result: L0Result;
  try {
    l0Result = await L0_GATEKEEPER(text, {
      userId: String(chatId),
      channel: source === 'voice' ? 'voice' : 'telegram',
      isAuthorized: isAuthorized(chatId),
      role: 'operator',
      scope: ['task:create', 'task:read', 'task:update'],
      nonce: `tg-${chatId}-${messageId}`,
      isVoice: source === 'voice',        // ses/yazı ayrımı DB'ye doğru yansır
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await sendReply(ctx, `⚠️ ${errMsg}`);
    await logAudit({
      operation_type: 'REJECT',
      action_description: `L0 GATEKEEPER RED: ${errMsg}`,
      metadata: { action_code: 'L0_GATEKEEPER_REJECTED', chat_id: chatId, sender: senderName }
    }).catch(() => {});
    return;
  }

  if (l0Result.status !== 'PROCEED') {
    await sendReply(ctx, `⚠️ Komut işleme alınamadı [${l0Result.status}].`);
    return;
  }

  // Komut alındı bildirimi
  await sendReply(ctx, [
    `📥 <b>Komut alındı.</b>`,
    ``,
    `💬 <b>Anladığım:</b> ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`,
    `🔑 <b>ID:</b> <code>${l0Result.commandId}</code>`,
    ``,
    `🔄 Analiz başlıyor...`,
  ].join('\n'));

  // ── FAZ 2: AI ÖNCELİK ANALİZİ ───────────────────────────
  const analysis = await analyzeTaskPriority(text, null, { useAI: true, timeoutMs: 15000 });

  // ── FAZ 3: HERMAİ 92 KRİTER + PROOF (AI sonrası tam analiz) ──
  const fullIntent: IntentAnalysis = {
    why: `${analysis.reasoning} için bu görev analiz edildi ve işlemek amacıyla sıraya alındı.`,
    how: `Görev oluşturma sonucu tamamlanacak — öncelik: ${analysis.priority}, güven: %${Math.round(analysis.confidence * 100)}. Çıktı: Supabase görev tablosuna kaydedilecek.`,
    risks: analysis.confidence < 0.7
      ? ['Düşük AI güven skoru — orta seviyede risk']
      : [],
    alternatives: analysis.source === 'ai'
      ? ['Lokal kural analizi', 'Manuel operatör onayı']
      : ['AI (Ollama) analizi', 'Manuel operatör onayı'],
    conditions: [
      'yazılı komut',
      `AI kaynağı: ${analysis.source}`,
      `telegram operatör yetki dahilinde`,
    ],
    refutation: `AI güven skoru %${Math.round(analysis.confidence * 100)} — çünkü ${analysis.source === 'ai' ? 'Ollama' : 'Lokal motor'} tarafından doğrulandı. Eğer skor düşükse alternatif analiz yoluna geçilecektir.`,
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
      `📡 <b>Kaynak:</b> 💬 Yazılı Komut`,
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

  // ── /ara <kelime> — RAG: Supabase'den canlı görev/log araması ──
  botInstance.command('ara', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    if (!isAuthorized(chatId)) { await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM.'); return; }
    const query = ctx.match?.trim();
    if (!query) { await sendReply(ctx, '⚠️ Kullanım: /ara <aranacak kelime>'); return; }

    await sendReply(ctx, `🔍 <b>"${query}"</b> aranıyor...`);

    try {
      // Görevlerde ara
      const { data: tasks } = await supabase
        .from('tasks')
        .select('task_code, title, status, priority, created_at')
        .or(`title.ilike.%${query}%,task_code.ilike.%${query}%`)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(8);

      // Audit log'larda ara
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('action_description, timestamp')
        .ilike('action_description', `%${query}%`)
        .order('timestamp', { ascending: false })
        .limit(5);

      const pe: Record<string, string> = { kritik: '🔴', yuksek: '🟠', normal: '🟡', dusuk: '🟢' };

      const lines: string[] = [`🔎 <b>ARAMA SONUÇLARI — "${query}"</b>`, ''];

      if (tasks && tasks.length > 0) {
        lines.push(`<b>📋 Görevler (${tasks.length}):</b>`);
        tasks.forEach((t, i) => {
          lines.push(`${i + 1}. ${pe[t.priority] ?? '🟡'} <code>${t.task_code}</code> — ${t.title} [${t.status}]`);
        });
      } else {
        lines.push('📋 Görevlerde eşleşme bulunamadı.');
      }

      if (logs && logs.length > 0) {
        lines.push('', `<b>📜 Log Kayıtları (${logs.length}):</b>`);
        logs.forEach((l, i) => {
          const ts = new Date(l.timestamp).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
          lines.push(`${i + 1}. [${ts}] ${l.action_description.substring(0, 80)}`);
        });
      }

      if ((!tasks || tasks.length === 0) && (!logs || logs.length === 0)) {
        lines.push('❌ Hiçbir kayıtta eşleşme bulunamadı.');
      }

      await sendReply(ctx, lines.join('\n'));
    } catch (err) {
      processError(ERR.TASK_FETCH, err, { kaynak: 'commandRouter.ts', islem: 'ARA_CMD' });
      await sendReply(ctx, '❌ Arama sırasında hata oluştu.');
    }
  });

  // ── /rapor — RAG: Canlı sistem özet raporu ───────────────────
  botInstance.command('rapor', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    if (!isAuthorized(chatId)) { await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM.'); return; }

    await sendReply(ctx, '📊 Rapor hazırlanıyor...');

    try {
      const [tasksRes, logsRes] = await Promise.all([
        supabase.from('tasks').select('status, priority').eq('is_archived', false),
        supabase.from('audit_logs').select('timestamp').order('timestamp', { ascending: false }).limit(1),
      ]);

      const tasks = tasksRes.data ?? [];
      const byStatus: Record<string, number> = {};
      const byPriority: Record<string, number> = {};

      tasks.forEach(t => {
        byStatus[t.status]     = (byStatus[t.status]     || 0) + 1;
        byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      });

      const lastLog = logsRes.data?.[0]?.timestamp
        ? new Date(logsRes.data[0].timestamp).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
        : 'Bilinmiyor';

      await sendReply(ctx, [
        `📊 <b>SİSTEM RAPORU</b>`,
        `🕐 ${new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`,
        ``,
        `<b>📋 Görev Durumu (${tasks.length} aktif):</b>`,
        `⏳ Beklemede: ${byStatus['beklemede'] ?? 0}`,
        `⚡ Devam: ${byStatus['devam_ediyor'] ?? 0}`,
        `🔍 Doğrulama: ${byStatus['dogrulama'] ?? 0}`,
        `✅ Tamamlanan: ${byStatus['tamamlandi'] ?? 0}`,
        `🚫 İptal: ${byStatus['iptal'] ?? 0}`,
        ``,
        `<b>🎯 Öncelik Dağılımı:</b>`,
        `🔴 Kritik: ${byPriority['kritik'] ?? 0}`,
        `🟠 Yüksek: ${byPriority['yuksek'] ?? 0}`,
        `🟡 Normal: ${byPriority['normal'] ?? 0}`,
        `🟢 Düşük: ${byPriority['dusuk'] ?? 0}`,
        ``,
        `📜 Son Log: ${lastLog}`,
      ].join('\n'));
    } catch (err) {
      processError(ERR.TASK_FETCH, err, { kaynak: 'commandRouter.ts', islem: 'RAPOR_CMD' });
      await sendReply(ctx, '❌ Rapor alınırken hata oluştu.');
    }
  });

  // ── /ajanlst — Ajan kadrosu listesi ─────────────────────────
  botInstance.command('ajanlst', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    if (!isAuthorized(chatId)) { await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM.'); return; }

    const { agentRegistry } = await import('@/services/agentRegistry');
    const stats = agentRegistry.getStats();
    const all   = agentRegistry.getAll();

    const komuta = all.filter(a => a.katman === 'KOMUTA');
    const l1     = all.filter(a => a.katman === 'L1');
    const aktif  = all.filter(a => a.durum === 'aktif');

    const lines = [
      `🤖 <b>AJAN KADROSU</b>`,
      ``,
      `📊 Toplam: ${stats.toplam} | Aktif: ${aktif.length} | Komuta: ${komuta.length} | L1: ${l1.length}`,
      `✅ Tamamlanan Görev: ${stats.toplamGorev} | ❌ Hata: ${stats.toplamHata}`,
      ``,
      `<b>KOMUTA:</b>`,
      ...komuta.map(a => `  • ${a.id} — ${a.kod_adi} [${a.durum}]`),
      ``,
      `<b>L1 İcra:</b>`,
      ...l1.slice(0, 8).map(a => `  • ${a.id} — ${a.kod_adi} [${a.durum}]`),
      l1.length > 8 ? `  ...ve ${l1.length - 8} ajan daha` : '',
    ].filter(l => l !== '');

    await sendReply(ctx, lines.join('\n'));
  });

  // ── /calistir <komut> — Tool: Sistem aksiyon tetikleme ───────
  botInstance.command('calistir', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    if (!isAuthorized(chatId)) { await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM.'); return; }
    const arg = ctx.match?.trim().toLowerCase();
    if (!arg) {
      await sendReply(ctx, [
        `🔧 <b>ARAÇ KOMUTLARI</b>`,
        ``,
        `/calistir bootstrap — Sistem sağlık kontrolü`,
        `/calistir webhook — Telegram webhook durumu`,
        `/calistir temizle — Eski tamamlanan görevleri arşivle`,
      ].join('\n'));
      return;
    }

    if (arg === 'bootstrap') {
      await sendReply(ctx, '⚙️ Bootstrap çalıştırılıyor...');
      try {
        const { runBootstrap } = await import('@/core/bootstrap');
        const result = await runBootstrap();
        const lines = [
          `⚙️ <b>BOOTSTRAP SONUCU: ${result.status}</b>`,
          '',
          ...result.checks.map(c => `${c.passed ? '✅' : '❌'} ${c.name}: ${c.message}`),
        ];
        await sendReply(ctx, lines.join('\n'));
      } catch (err) {
        await sendReply(ctx, `❌ Bootstrap hatası: ${String(err)}`);
      }
      return;
    }

    if (arg === 'webhook') {
      await sendReply(ctx, '📡 Webhook kontrol ediliyor...');
      try {
        const { getWebhookInfo } = await import('./botSetup');
        const info = await getWebhookInfo();
        if (info.ok && info.info) {
          await sendReply(ctx, [
            `📡 <b>WEBHOOK DURUMU</b>`,
            ``,
            `URL: <code>${info.info.url || 'BOŞ'}</code>`,
            `Bekleyen: ${info.info.pending_update_count}`,
            `Son hata: ${info.info.last_error_message ?? 'YOK'}`,
          ].join('\n'));
        } else {
          await sendReply(ctx, `❌ Webhook sorgu hatası: ${info.error}`);
        }
      } catch (err) {
        await sendReply(ctx, `❌ Webhook hatası: ${String(err)}`);
      }
      return;
    }

    if (arg === 'temizle') {
      await sendReply(ctx, '🧹 Tamamlanan görevler arşivleniyor...');
      try {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 gün önce
        const { data, error } = await supabase
          .from('tasks')
          .update({ is_archived: true, updated_at: new Date().toISOString() })
          .in('status', ['tamamlandi', 'iptal'])
          .lt('updated_at', cutoff)
          .select('id');

        if (error) { await sendReply(ctx, `❌ Arşivleme hatası: ${error.message}`); return; }
        await sendReply(ctx, `✅ ${data?.length ?? 0} görev arşivlendi.`);
      } catch (err) {
        await sendReply(ctx, `❌ Arşivleme hatası: ${String(err)}`);
      }
      return;
    }

    await sendReply(ctx, `❓ Bilinmeyen komut: <code>${arg}</code>\n\n/calistir yazarak komut listesini gör.`);
  });

  // ── /web <sorgu> — İnternet Araması (DuckDuckGo, ücretsiz) ──
  botInstance.command('web', async (ctx) => {
    const chatId = ctx.chat?.id ?? 0;
    if (!isAuthorized(chatId)) { await sendReply(ctx, '⛔ YETKİSİZ ERİŞİM.'); return; }
    const sorgu = ctx.match?.trim();
    if (!sorgu) { await sendReply(ctx, '⚠️ Kullanım: /web <arama terimi>\n\nÖrnek: /web Bitcoin güncel fiyat'); return; }

    await sendReply(ctx, `🌐 <b>"${sorgu}"</b> internette aranıyor...`);

    try {
      const yanit = await webSearch(sorgu, 5);

      if (yanit.sonuclar.length === 0) {
        await sendReply(ctx, `🔍 <b>"${sorgu}"</b> için internet sonucu bulunamadı.`);
        return;
      }

      const lines: string[] = [
        `🌐 <b>WEB ARAMA — "${sorgu}"</b>`,
        '',
      ];

      if (yanit.ozet && yanit.ozet !== yanit.sonuclar[0]?.ozet) {
        lines.push(`📌 <b>Özet:</b> ${yanit.ozet.substring(0, 200)}`, '');
      }

      yanit.sonuclar.forEach((s, i) => {
        lines.push(`${i + 1}. <b>${s.baslik.substring(0, 60)}</b>`);
        if (s.ozet && s.ozet !== s.baslik) {
          lines.push(`   ${s.ozet.substring(0, 120)}`);
        }
        if (s.url) lines.push(`   🔗 ${s.url}`);
        lines.push('');
      });

      await sendReply(ctx, lines.join('\n'));
    } catch (err) {
      await sendReply(ctx, `❌ Web arama hatası: ${String(err)}`);
    }
  });
}

