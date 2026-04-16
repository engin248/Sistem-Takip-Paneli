// src/core/agentWorker.ts
// ============================================================
// AJAN İŞÇİSİ v2 — REACT DÖNGÜSÜ + 6 ARAÇ + ASKERİ DİSİPLİN
// ============================================================
// Akış (ReAct — Reasoning + Acting):
//   1. Ajan görevi alır
//   2. Düşünür → Araç gerekiyorsa ARAÇ_ÇAĞIR formatında yazar
//   3. Sistem aracı çalıştırır → sonuç ajana döner
//   4. Ajan sonuçla tekrar düşünür (max 5 iterasyon)
//   5. "GÖREVTAMAMı" yazdığında döngü biter
// ============================================================

import { aiComplete }          from '@/lib/aiProvider';
import { agentRegistry }       from '@/services/agentRegistry';
import { logAudit }            from '@/services/auditService';
import { pushJobHistory, generateJobId } from '@/core/taskQueue';
import { ragContext }           from '@/services/ragService';
import { toolCalistir, type ToolAdi } from '@/core/toolRunner';
import type { QueueJob }       from '@/core/taskQueue';

const MAX_ITERASYON = 5;

// ── UZMAN SİSTEM PROMPTLARI (Katman + Rol bazlı) ─────────────
function buildSystemPrompt(agent: {
  id: string; kod_adi: string; rol: string;
  katman: string; beceri_listesi: string[];
}): string {

  const katmanKural: Record<string, string> = {
    KOMUTA: `Sen komuta kademesisin. Strateji üretir, karar verir, görev atarsın.
YETKIN: onay_red, strateji, görev_atama, kriz_yönetimi, kaynak_planlama
YASAK: kod yazmak, dosya düzenlemek, veritabanı işlemleri`,

    L1: `Sen doğrudan icraatçısın. Görevi eksiksiz, adım adım tamamlarsın.
Araçları kullan. Dosya oku, yaz, API çağır, web ara, RAG sorgula.
YETKIN: ${agent.beceri_listesi.join(', ')}
YASAK: varsayım, tahmin, "sanırım", "belki"`,

    L2: `Sen denetçisin. Yapılan işi 5 eksenden denetlersin: teknik, güvenlik, performans, operasyonel, UX.
YETKIN: kod inceleme, doğrulama, hata tespiti, rapor üretme
YASAK: kod değiştirmek, karar vermek, bağımsız aksiyon`,

    L3: `Sen hakemsin. L1-L2 çelişkilerini çözersin. Objektif, kanıt bazlı karar verirsin.
YETKIN: çelişki çözüm, nihai karar, konsensüs, mimari değerlendirme
YASAK: kod yazmak, doğrudan icra`,

    DESTEK: `Sen uzman destek birimisin. Uzmanlık alanında maksimum verim üretirsin.
YETKIN: ${agent.beceri_listesi.join(', ')}
YASAK: alan dışı görev, yetkisiz aksiyon`,
  };

  return `════════════════════════════════════════════════════════
SİSTEM TAKİP PANELİ — AJAN KİMLİK PAKETİ
════════════════════════════════════════════════════════
AJAN    : ${agent.kod_adi}
KİMLİK  : ${agent.id}
KATMAN  : ${agent.katman}
════════════════════════════════════════════════════════
GÖREV TANIMI:
${agent.rol}

KATMAN KURALI:
${katmanKural[agent.katman] ?? `Görevini eksiksiz yap. BECERİLER: ${agent.beceri_listesi.join(', ')}`}

════════════════════════════════════════════════════════
ARAÇ KULLANIM PROTOKOLÜ (ReAct Döngüsü)
════════════════════════════════════════════════════════
Araç gerektiğinde SADECE şu formatı kullan:

ARAÇ: <araç_adı>
PARAMS: <json>

Geçerli araçlar:
  dosyaOku      → {"yol": "C:\\...\\dosya.ts"}
  dosyaYaz      → {"yol": "C:\\...\\dosya.ts", "icerik": "..."}
  dizinListele  → {"yol": "C:\\...\\klasor", "derinlik": 1}
  webAra        → {"sorgu": "aradığın şey"}
  ragSorgula    → {"sorgu": "bilgi tabanında ara"}
  apiCagir      → {"url": "https://...", "metod": "GET"}

Araç sonucu gelince devam et. İşin bitince:
GÖREV TAMAM: <özet>

════════════════════════════════════════════════════════
MUTLAK KURALLAR (İhlal = Görev İptal)
════════════════════════════════════════════════════════
1. VARSAYIM YASAK — yalnızca elde ettiğin verilerle çalış
2. SIFIR İNİSİYATİF — komut dışına çıkma
3. KANIT ZORUNLU — "sanırım/belki" yok, kanıtla
4. HATA VARSA DUR — raporla, düzeltmeden devam etme
5. ÇIKTI FORMATI: ÖZET → BULGU → SONUÇ
6. PARÇA İŞ YASAK — görevi eksiksiz tamamla
════════════════════════════════════════════════════════
Göreve başla. Askeri disiplin. Tam icra.`;
}

// ── ARAÇ ÇAĞRISI PARSER ───────────────────────────────────────
interface AracCagrisi {
  arac  : ToolAdi;
  params: Record<string, unknown>;
}

function parseAracCagrisi(text: string): AracCagrisi | null {
  const aracMatch  = text.match(/ARAÇ:\s*(\w+)/);
  const paramsMatch = text.match(/PARAMS:\s*(\{[\s\S]*?\})/);

  if (!aracMatch) return null;
  const arac = aracMatch[1]?.trim() as ToolAdi;

  let params: Record<string, unknown> = {};
  if (paramsMatch?.[1]) {
    try { params = JSON.parse(paramsMatch[1]); } catch { params = {}; }
  }
  return { arac, params };
}

function gorevTamamMi(text: string): boolean {
  return text.includes('GÖREV TAMAM:') || text.includes('GOREV TAMAM:');
}

// ── LOKAL FALLBACK ────────────────────────────────────────────
function buildLocalResponse(agent: { kod_adi: string; rol: string; katman: string }, task: string): string {
  return [
    `[LOKAL-YANIT] ${agent.kod_adi} (${agent.katman})`,
    `─────────────────────────────────`,
    `GÖREV  : ${task.slice(0, 200)}`,
    `DURUM  : AI bağlantısı yok — kural tabanlı yanıt.`,
    `ÖZET   : Görev alındı ve kaydedildi.`,
    `BULGU  : AI servisi aktif olmadığı için analiz yapılamadı.`,
    `SONUÇ  : Görev kuyruğa alındı.`,
  ].join('\n');
}

// ── TİPLER ───────────────────────────────────────────────────
export interface WorkerInput {
  agent_id  : string;
  task      : string;
  priority ?: number;
  use_rag  ?: boolean;
  use_web  ?: boolean;
}

export interface WorkerResult {
  job_id      : string;
  agent_id    : string;
  kod_adi     : string;
  katman      : string;
  task        : string;
  result      : string;
  status      : 'tamamlandi' | 'hata' | 'reddedildi';
  ai_kullandi : boolean;
  rag_kullandi: boolean;
  web_kullandi: boolean;
  arac_kullandi: string[];
  iterasyon   : number;
  duration_ms : number;
  timestamp   : string;
}

// ── ANA WORKER — REACT DÖNGÜSÜ ────────────────────────────────
export async function runAgentWorker(input: WorkerInput): Promise<WorkerResult> {
  const startAt = Date.now();
  const job_id  = generateJobId(input.agent_id);

  // ── 1. Ajan var mı? ─────────────────────────────────────
  const agent = agentRegistry.getById(input.agent_id);
  if (!agent) {
    const job: QueueJob = {
      job_id, agent_id: input.agent_id, agent_kod_adi: 'BILINMIYOR',
      agent_katman: 'BILINMIYOR', task: input.task, priority: input.priority ?? 2,
      status: 'reddedildi', created_at: new Date().toISOString(),
      error: `Ajan bulunamadı: ${input.agent_id}`, duration_ms: Date.now() - startAt,
    };
    pushJobHistory(job);
    return {
      job_id, agent_id: input.agent_id, kod_adi: 'BILINMIYOR',
      katman: 'BILINMIYOR', task: input.task,
      result: `HATA: Ajan bulunamadı (${input.agent_id})`,
      status: 'reddedildi', ai_kullandi: false,
      rag_kullandi: false, web_kullandi: false, arac_kullandi: [],
      iterasyon: 0, duration_ms: Date.now() - startAt,
      timestamp: new Date().toISOString(),
    };
  }

  // ── 2. Validate ──────────────────────────────────────────
  if (!input.task || input.task.trim().length < 3) {
    return {
      job_id, agent_id: agent.id, kod_adi: agent.kod_adi,
      katman: agent.katman, task: input.task, result: 'HATA: Görev metni geçersiz',
      status: 'reddedildi', ai_kullandi: false,
      rag_kullandi: false, web_kullandi: false, arac_kullandi: [],
      iterasyon: 0, duration_ms: Date.now() - startAt,
      timestamp: new Date().toISOString(),
    };
  }

  agentRegistry.updateDurum(agent.id, 'aktif');

  // ── 3. RAG bağlamı ───────────────────────────────────────
  let ragKullandi = false;
  let extraContext = '';
  if (input.use_rag !== false) {
    try {
      const rc = ragContext(input.task);
      if (rc) { extraContext += rc; ragKullandi = true; }
    } catch { /* devam */ }
  }

  const systemPrompt = buildSystemPrompt({
    id: agent.id, kod_adi: agent.kod_adi,
    rol: agent.rol, katman: agent.katman,
    beceri_listesi: agent.beceri_listesi,
  }) + extraContext;

  // ── 4. ReAct Döngüsü ─────────────────────────────────────
  const mesajlar: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: input.task.trim() },
  ];

  let sonSonuc      = '';
  let aiKullandi    = false;
  let webKullandi   = false;
  const kullanilanAraclar: string[] = [];
  let iterasyon     = 0;

  for (let i = 0; i < MAX_ITERASYON; i++) {
    iterasyon = i + 1;

    // AI çağrısı
    let aiYanit = '';
    try {
      const response = await aiComplete({
        systemPrompt,
        userMessage : mesajlar.map(m => `${m.role === 'user' ? 'KULLANICI' : 'AJAN'}: ${m.content}`).join('\n\n'),
        temperature : 0.2,
        maxTokens   : 1200,
        jsonMode    : false,
      });
      if (response?.content) {
        aiYanit    = response.content;
        aiKullandi = true;
      } else break;
    } catch {
      break;
    }

    mesajlar.push({ role: 'assistant', content: aiYanit });
    sonSonuc = aiYanit;

    // Görev tamam mı?
    if (gorevTamamMi(aiYanit)) break;

    // Araç çağrısı var mı?
    const aracCagrisi = parseAracCagrisi(aiYanit);
    if (!aracCagrisi) break;

    // Aracı çalıştır
    const aracSonucu = await toolCalistir(aracCagrisi);
    kullanilanAraclar.push(aracCagrisi.arac);
    if (aracCagrisi.arac === 'webAra') webKullandi = true;

    const aracMesaji = aracSonucu.basari
      ? `ARAÇ SONUCU (${aracCagrisi.arac}):\n${JSON.stringify(aracSonucu.cikti, null, 2)}`
      : `ARAÇ HATASI (${aracCagrisi.arac}): ${aracSonucu.hata}`;

    mesajlar.push({ role: 'user', content: aracMesaji });
  }

  // Fallback
  if (!sonSonuc) sonSonuc = buildLocalResponse(agent, input.task);

  const duration_ms = Date.now() - startAt;
  const timestamp   = new Date().toISOString();

  agentRegistry.recordGorevTamamlama(agent.id, true);
  agentRegistry.updateDurum(agent.id, 'pasif');

  // ── 5. Audit ─────────────────────────────────────────────
  await logAudit({
    operation_type     : 'EXECUTE',
    action_description : `[${job_id}] ${agent.kod_adi} (${agent.katman}) — ${iterasyon} iterasyon — ${kullanilanAraclar.length} araç — ${duration_ms}ms`,
    metadata: {
      action_code    : 'AGENT_JOB_COMPLETED',
      job_id, agent_id: agent.id, agent_katman: agent.katman,
      ai_kullandi    : aiKullandi, rag_kullandi: ragKullandi,
      web_kullandi   : webKullandi, araclar: kullanilanAraclar,
      iterasyon, duration_ms,
      gorev_ozeti    : input.task.slice(0, 200),
      sonuc_ozeti    : sonSonuc.slice(0, 300),
    },
  }).catch(() => {});

  // ── 6. Job history ───────────────────────────────────────
  const job: QueueJob = {
    job_id, agent_id: agent.id, agent_kod_adi: agent.kod_adi,
    agent_katman: agent.katman, task: input.task,
    priority: input.priority ?? 2, status: 'tamamlandi',
    created_at: new Date(startAt).toISOString(),
    started_at: new Date(startAt).toISOString(),
    completed_at: timestamp,
    result: sonSonuc.slice(0, 1000),
    duration_ms,
  };
  pushJobHistory(job);

  return {
    job_id, agent_id: agent.id, kod_adi: agent.kod_adi,
    katman: agent.katman, task: input.task, result: sonSonuc,
    status: 'tamamlandi', ai_kullandi: aiKullandi,
    rag_kullandi: ragKullandi, web_kullandi: webKullandi,
    arac_kullandi: kullanilanAraclar,
    iterasyon, duration_ms, timestamp,
  };
}
