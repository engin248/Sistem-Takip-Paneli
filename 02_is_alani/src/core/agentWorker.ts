// src/core/agentWorker.ts
// ============================================================
// AJAN İŞÇİSİ — Görevi alır, AI ile işler, sonuç üretir
// ============================================================
// Akış:
//   1. Ajana özgü system prompt oluştur (kimlik + beceri + kural)
//   2. aiComplete() → Ollama fallback → OpenAI fallback → Lokal
//   3. Sonucu yapılandır + audit log
//   4. agentRegistry counter güncelle
// ============================================================

import { aiComplete }         from '@/lib/aiProvider';
import { agentRegistry }      from '@/services/agentRegistry';
import { logAudit }           from '@/services/auditService';
import { pushJobHistory, generateJobId } from '@/core/taskQueue';
import type { QueueJob }      from '@/core/taskQueue';

// ── AJAN SİSTEM PROMPT OLUŞTURUCU ────────────────────────────
function buildSystemPrompt(agent: {
  id: string;
  kod_adi: string;
  rol: string;
  katman: string;
  beceri_listesi: string[];
  davranis_protokolu?: string;
}): string {
  const beceriler = agent.beceri_listesi.join(', ');

  const katmanTalimat: Record<string, string> = {
    KOMUTA : 'Stratejik kararlar ver. Sistem bütünlüğünü koru. Gerektiğinde eskalasyon yap.',
    L1     : 'Görevi doğrudan icra et. Adım adım, eksiksiz tamamla. Hata varsa raporla.',
    L2     : 'Görevi denetle. Kalite ve doğruluğu kontrol et. Bulguları raporla.',
    L3     : 'Hakem olarak değerlendir. Objektif, tarafsız, kanıta dayalı karar ver.',
    DESTEK : 'Uzmanlık alanında destek sağla. Teknik doğruluk öncelikli.',
  };

  return `Sen ${agent.kod_adi} ajanısın.
ROL: ${agent.rol}
KATMAN: ${agent.katman} — ${katmanTalimat[agent.katman] ?? 'Görevi eksiksiz yerine getir.'}
BECERİLER: ${beceriler}

MUTLAK KURALLAR:
1. Varsayım yasak — yalnızca verilen bilgiyle çalış.
2. Sıfır inisiyatif — komut dışına çıkma.
3. Hata varsa açıkla, düzeltme yolunu göster.
4. Çıktın yapılandırılmış olsun: ÖZET → BULGU → SONUÇ.
5. Kanıtlı raporla — "sanırım", "belki" yasak.

Verilen görevi bu kurallara göre icra et.`;
}

// ── LOKAL FALLBACK YANITI ─────────────────────────────────────
function buildLocalResponse(agent: { kod_adi: string; rol: string; katman: string }, task: string): string {
  return [
    `[LOKAL-YANIT] ${agent.kod_adi} (${agent.katman})`,
    `─────────────────────────────────`,
    `GÖREV  : ${task.slice(0, 200)}`,
    `DURUM  : AI bağlantısı yok — kural tabanlı yanıt üretildi.`,
    `ÖZET   : Görev alındı ve kaydedildi.`,
    `BULGULAR: Görev metni alındı, AI servisi aktif olmadığı için otomatik analiz yapılamadı.`,
    `SONUÇ  : Görev kuyruğa alındı. AI servisi aktif olduğunda işlenecek veya manuel müdahale gereklidir.`,
    `NOT    : Ollama veya OpenAI entegrasyonu aktive edildiğinde gerçek icra başlar.`,
  ].join('\n');
}

// ── ANA WORKER FONKSİYONU ─────────────────────────────────────

export interface WorkerInput {
  agent_id   : string;
  task       : string;
  priority  ?: number;
}

export interface WorkerResult {
  job_id     : string;
  agent_id   : string;
  kod_adi    : string;
  katman     : string;
  task       : string;
  result     : string;
  status     : 'tamamlandi' | 'hata' | 'reddedildi';
  ai_kullandi: boolean;
  duration_ms: number;
  timestamp  : string;
}

export async function runAgentWorker(input: WorkerInput): Promise<WorkerResult> {
  const startAt  = Date.now();
  const job_id   = generateJobId(input.agent_id);

  // ── 1. Ajan var mı? ─────────────────────────────────────
  const agent = agentRegistry.getById(input.agent_id);
  if (!agent) {
    const job: QueueJob = {
      job_id,
      agent_id      : input.agent_id,
      agent_kod_adi : 'BILINMIYOR',
      agent_katman  : 'BILINMIYOR',
      task          : input.task,
      priority      : input.priority ?? 2,
      status        : 'reddedildi',
      created_at    : new Date().toISOString(),
      error         : `Ajan bulunamadı: ${input.agent_id}`,
      duration_ms   : Date.now() - startAt,
    };
    pushJobHistory(job);
    return {
      job_id, agent_id: input.agent_id, kod_adi: 'BILINMIYOR',
      katman: 'BILINMIYOR', task: input.task,
      result: `HATA: Ajan bulunamadı (${input.agent_id})`,
      status: 'reddedildi', ai_kullandi: false,
      duration_ms: Date.now() - startAt,
      timestamp: new Date().toISOString(),
    };
  }

  // ── 2. Görevi validate et ────────────────────────────────
  if (!input.task || input.task.trim().length < 3) {
    const job: QueueJob = {
      job_id, agent_id: agent.id, agent_kod_adi: agent.kod_adi,
      agent_katman: agent.katman, task: input.task, priority: input.priority ?? 2,
      status: 'reddedildi', created_at: new Date().toISOString(),
      error: 'Görev metni çok kısa (min 3 karakter)', duration_ms: Date.now() - startAt,
    };
    pushJobHistory(job);
    return {
      job_id, agent_id: agent.id, kod_adi: agent.kod_adi, katman: agent.katman,
      task: input.task, result: 'HATA: Görev metni geçersiz',
      status: 'reddedildi', ai_kullandi: false,
      duration_ms: Date.now() - startAt, timestamp: new Date().toISOString(),
    };
  }

  // ── 3. Ajana aktif durum ver ─────────────────────────────
  agentRegistry.updateDurum(agent.id, 'aktif');

  // ── 4. System prompt oluştur ─────────────────────────────
  const systemPrompt = buildSystemPrompt({
    id           : agent.id,
    kod_adi      : agent.kod_adi,
    rol          : agent.rol,
    katman       : agent.katman,
    beceri_listesi: agent.beceri_listesi,
  });

  // ── 5. AI ile icra et ────────────────────────────────────
  let result     = '';
  let aiKullandi = false;

  try {
    const aiResponse = await aiComplete({
      systemPrompt,
      userMessage : input.task.trim(),
      temperature : 0.3,
      maxTokens   : 1500,
      jsonMode    : false,
    });

    if (aiResponse && aiResponse.content) {
      result     = aiResponse.content;
      aiKullandi = true;
    } else {
      result = buildLocalResponse(agent, input.task);
    }
  } catch {
    result = buildLocalResponse(agent, input.task);
  }

  const duration_ms = Date.now() - startAt;
  const timestamp   = new Date().toISOString();

  // ── 6. Counter güncelle ──────────────────────────────────
  agentRegistry.recordGorevTamamlama(agent.id, true);
  agentRegistry.updateDurum(agent.id, 'pasif');

  // ── 7. Audit log ─────────────────────────────────────────
  await logAudit({
    operation_type     : 'EXECUTE',
    action_description : `[${job_id}] ${agent.kod_adi} (${agent.katman}) görevi tamamladı — ${aiKullandi ? 'AI' : 'LOKAL'} — ${duration_ms}ms`,
    metadata: {
      action_code  : 'AGENT_JOB_COMPLETED',
      job_id,
      agent_id     : agent.id,
      agent_katman : agent.katman,
      ai_kullandi  : aiKullandi,
      duration_ms,
      gorev_ozeti  : input.task.slice(0, 200),
      sonuc_ozeti  : result.slice(0, 300),
    },
  }).catch(() => {});

  // ── 8. Job history ───────────────────────────────────────
  const job: QueueJob = {
    job_id,
    agent_id      : agent.id,
    agent_kod_adi : agent.kod_adi,
    agent_katman  : agent.katman,
    task          : input.task,
    priority      : input.priority ?? 2,
    status        : 'tamamlandi',
    created_at    : new Date(startAt).toISOString(),
    started_at    : new Date(startAt).toISOString(),
    completed_at  : timestamp,
    result        : result.slice(0, 1000),
    duration_ms,
  };
  pushJobHistory(job);

  return {
    job_id, agent_id: agent.id, kod_adi: agent.kod_adi,
    katman: agent.katman, task: input.task, result,
    status: 'tamamlandi', ai_kullandi: aiKullandi,
    duration_ms, timestamp,
  };
}
