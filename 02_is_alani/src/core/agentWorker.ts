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
import { auditLog }            from '@/core/localAudit';
import { pushJobHistory, generateJobId } from '@/core/taskQueue';
import { ragContext }           from '@/services/ragService';
import { toolCalistir, type ToolAdi } from '@/core/toolRunner';
import { queryMemory, ogrenimKaydet } from '@/core/agentMemory';
import { gorevOnKontrol, aracKontrol, yanitKontrol } from '@/core/ruleGuard';
import type { QueueJob }       from '@/core/taskQueue';

const MAX_ITERASYON  = 5;
const TIMEOUT_MS     = Number(process.env.AI_TIMEOUT_MS) || 30_000;
const MAX_RETRY      = 2; // AI call max retry
const RETRY_BASE_MS  = 1_000;

// ── IDEMPOTENCY CACHE ───────────────────────────────────────────────
// Aynı ajan+görev kombinasyonu 30sn içinde tekrar çalışmaz
const recentJobs = new Map<string, { ts: number; result: string }>();
const IDEMPOTENCY_TTL = 30_000;

function idempotencyKey(agent_id: string, task: string): string {
  return `${agent_id}::${task.slice(0, 100).toLowerCase().trim()}`;
}

function checkIdempotency(key: string): string | null {
  const cached = recentJobs.get(key);
  if (!cached) return null;
  if (Date.now() - cached.ts > IDEMPOTENCY_TTL) { recentJobs.delete(key); return null; }
  return cached.result;
}

function setIdempotency(key: string, result: string): void {
  recentJobs.set(key, { ts: Date.now(), result });
  // 30sn sonra temizle
  setTimeout(() => recentJobs.delete(key), IDEMPOTENCY_TTL + 500);
}

// ── EXPO BACKOFF AI RETRY ──────────────────────────────────────────
async function aiCompleteWithRetry(params: Parameters<typeof aiComplete>[0]): Promise<Awaited<ReturnType<typeof aiComplete>>> {
  let son_hata: unknown;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    try {
      return await aiComplete(params);
    } catch (err) {
      son_hata = err;
      if (attempt < MAX_RETRY) {
        const bekleme = RETRY_BASE_MS * Math.pow(3, attempt); // 1s, 3s
        await new Promise(r => setTimeout(r, bekleme));
      }
    }
  }
  throw son_hata;
}

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

  // Kurallar kod tarafında zorlanıyor (ruleGuard.ts) — prompt'a eklenmez, TOKEN TASARRUFU
  return `════════════════════════════════════════════════════════
SİSTEM TAKİP PANELİ — AJAN KİMLİK
════════════════════════════════════════════════════════
AJAN: ${agent.kod_adi} | KATMAN: ${agent.katman}
GÖREV: ${agent.rol}
KATMAN KURALI: ${katmanKural[agent.katman] ?? `BECERİLER: ${agent.beceri_listesi.join(', ')}`}
════════════════════════════════════════════════════════
ARAÇ FORMAT (gerekirse kullan):
ARAÇ: <ad>
PARAMS: <json>
Araçlar: dosyaOku, dosyaYaz, dizinListele, webAra, ragSorgula, apiCagir
İş bitince: GÖREV TAMAM: <özet>
Göreve başla.`;
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

export interface L2DenetimOzet {
  ajan_id     : string;
  kod_adi     : string;
  durum       : 'ONAYLANDI' | 'HATA_VAR' | 'ATLANAMAZ';
  ozet        : string;
  duration_ms : number;
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
  l2_denetim ?: L2DenetimOzet;  // L2 otomatik denetim sonucu
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

  // ── RULE GUARD — GÖREV ÖN KONTROL (token harcamaz) ─────────
  const onKontrol = gorevOnKontrol(agent.id, agent.katman, input.task);
  if (!onKontrol.gecti) {
    agentRegistry.updateDurum(agent.id, 'pasif');
    return {
      job_id, agent_id: agent.id, kod_adi: agent.kod_adi,
      katman: agent.katman, task: input.task,
      result: `RULE GUARD [${onKontrol.kural_no}]: ${onKontrol.aciklama}`,
      status: 'reddedildi', ai_kullandi: false,
      rag_kullandi: false, web_kullandi: false, arac_kullandi: [],
      iterasyon: 0, duration_ms: Date.now() - startAt,
      timestamp: new Date().toISOString(),
    };
  }

  // ── IDEMPOTENCY ─────────────────────────────────────────────────
  const iKey = idempotencyKey(agent.id, input.task);
  const cachedResult = checkIdempotency(iKey);
  if (cachedResult) {
    auditLog(agent.id, 'IDEMPOTENCY_HIT', { task: input.task.slice(0, 100) });
    return {
      job_id, agent_id: agent.id, kod_adi: agent.kod_adi,
      katman: agent.katman, task: input.task, result: cachedResult,
      status: 'tamamlandi', ai_kullandi: false,
      rag_kullandi: false, web_kullandi: false, arac_kullandi: [],
      iterasyon: 0, duration_ms: 0, timestamp: new Date().toISOString(),
    };
  }

  // ── 3. RAG + HAFIZA bağlamı ───────────────────────────────────
  let ragKullandi = false;
  let extraContext = '';
  if (input.use_rag !== false) {
    try {
      const rc = ragContext(input.task);
      if (rc) { extraContext += rc; ragKullandi = true; }
    } catch { /* devam */ }
  }

  // LTM hafıza sorgusu — geçmiş deneyim enjekte et
  try {
    const mem = queryMemory(agent.id, input.task, 3);
    if (mem.baglam) {
      extraContext += mem.baglam;
      auditLog(agent.id, 'MEMORY_HIT', { bulunan: mem.bulunan.length, gorev: input.task.slice(0, 80) });
    }
  } catch { /* hafıza okuma hatası → devam */ }

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

    // AI çağrısı (retry + timeout)
    let aiYanit = '';
    try {
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error(`AI timeout ${TIMEOUT_MS}ms aşıldı`)), TIMEOUT_MS)
      );
      const response = await Promise.race([
        aiCompleteWithRetry({
          systemPrompt,
          userMessage : mesajlar.map(m => `${m.role === 'user' ? 'KULLANICI' : 'AJAN'}: ${m.content}`).join('\n\n'),
          temperature : 0.2,
          maxTokens   : 1200,
          jsonMode    : false,
        }),
        timeoutPromise,
      ]);
      if (response?.content) {
        aiYanit    = response.content;
        aiKullandi = true;
      } else {
        auditLog(agent.id, 'AI_EMPTY_RESPONSE', { iterasyon });
        break;
      }
    } catch (err) {
      auditLog(agent.id, 'AI_CALL_FAILED', {
        iterasyon,
        hata: err instanceof Error ? err.message : String(err),
      });
      break;
    }

    mesajlar.push({ role: 'assistant', content: aiYanit });
    sonSonuc = aiYanit;

    // ── RULE GUARD — YANIT KONTROL (token harcamaz) ──────────
    const yanitG = yanitKontrol(agent.id, agent.katman, aiYanit);
    if (!yanitG.gecti && yanitG.eylem === 'ENGELLE') {
      agentRegistry.updateDurum(agent.id, 'pasif');
      return {
        job_id, agent_id: agent.id, kod_adi: agent.kod_adi,
        katman: agent.katman, task: input.task,
        result: `RULE GUARD [${yanitG.kural_no}]: ${yanitG.aciklama}`,
        status: 'reddedildi', ai_kullandi: aiKullandi,
        rag_kullandi: ragKullandi, web_kullandi: webKullandi,
        arac_kullandi: kullanilanAraclar,
        iterasyon, duration_ms: Date.now() - startAt,
        timestamp: new Date().toISOString(),
      };
    }

    // Görev tamam mı?
    if (gorevTamamMi(aiYanit)) break;

    // Araç çağrısı var mı?
    const aracCagrisi = parseAracCagrisi(aiYanit);
    if (!aracCagrisi) break;

    // ── RULE GUARD — ARAÇ KONTROL (token harcamaz) ──────────
    const aracG = aracKontrol(agent.id, agent.katman, aracCagrisi.arac, aracCagrisi.params);
    if (!aracG.gecti) {
      mesajlar.push({ role: 'user', content: `ARAÇ ENGELLENDİ [${aracG.kural_no}]: ${aracG.aciklama}. Farklı yöntem dene.` });
      continue;
    }

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

  // ── LTM — Başarılı görev kalıbını kaydet ──────────────────────
  if (aiKullandi && sonSonuc.length > 50) {
    try {
      ogrenimKaydet(
        agent.id,
        input.task,
        sonSonuc.slice(0, 500),
        'KALIP',
        Math.min(95, 70 + iterasyon * 5), // daha az iterasyon = daha güvenilir
      );
    } catch { /* hafıza yazma hatası sessizce geçilir */ }
  }

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

  // Son sonucu idempotency cache'e yaz
  if (sonSonuc && sonSonuc !== buildLocalResponse(agent, input.task)) {
    setIdempotency(iKey, sonSonuc);
  }

  // ── L1 → L2 OTOMATİK DENETİM ─────────────────────────────────
  // Kural: L1 katmanı tamamlanınca B-01 (DENETÇİ-KOD) otomatik devreye girer
  // L2 bloklayıcı değil — fire-and-forget sonucu WorkerResult'a eklenir
  let l2DenetimOzet: import('./agentWorker').L2DenetimOzet | undefined;

  if (agent.katman === 'L1' && aiKullandi && sonSonuc.length > 30) {
    const l2Ajan = agentRegistry.getById('B-01');
    if (l2Ajan) {
      const l2Start = Date.now();
      try {
        agentRegistry.updateDurum('B-01', 'aktif');
        const l2Prompt = [
          `[L2 OTOMATİK DENETİM] L1 Ajan: ${agent.kod_adi}`,
          `Görev: ${input.task.slice(0, 150)}`,
          `Sonuç Özeti: ${sonSonuc.slice(0, 400)}`,
          '',
          `5 eksenden denetle: teknik, güvenlik, performans, operasyonel, UX.`,
          `Çıktı: ONAYLANDI veya HATA_VAR + kısa gerekçe.`,
        ].join('\n');

        const l2Yanit = await aiComplete({
          systemPrompt : `Sen L2 DENETÇİ-KOD ajanısın. Sadece denetle, kod değiştirme, karar verme.`,
          userMessage  : l2Prompt,
          temperature  : 0.1,
          maxTokens    : 400,
          jsonMode     : false,
        });

        const l2Metin = l2Yanit?.content ?? '';
        const denetimDurum: L2DenetimOzet['durum'] =
          l2Metin.toUpperCase().includes('HATA_VAR') ? 'HATA_VAR' : 'ONAYLANDI';

        l2DenetimOzet = {
          ajan_id    : 'B-01',
          kod_adi    : l2Ajan.kod_adi,
          durum      : denetimDurum,
          ozet       : l2Metin.slice(0, 300),
          duration_ms: Date.now() - l2Start,
        };

        agentRegistry.updateDurum('B-01', 'pasif');

        // L2 sonucunu audit'e kaydet
        void logAudit({
          operation_type    : 'EXECUTE',
          action_description: `[L2-AUTO] ${l2Ajan.kod_adi} → ${denetimDurum} — ${agent.kod_adi} denetlendi (${Date.now() - l2Start}ms)`,
          metadata: {
            action_code : 'L2_AUTO_REVIEW',
            l1_job_id   : job_id,
            l1_ajan     : agent.kod_adi,
            l2_ajan     : l2Ajan.kod_adi,
            durum       : denetimDurum,
          },
        }).catch(() => {});

      } catch {
        agentRegistry.updateDurum('B-01', 'pasif');
        l2DenetimOzet = {
          ajan_id: 'B-01', kod_adi: l2Ajan.kod_adi,
          durum: 'ATLANAMAZ', ozet: 'L2 AI çağrısı başarısız',
          duration_ms: Date.now() - l2Start,
        };
      }
    }
  }

  return {
    job_id, agent_id: agent.id, kod_adi: agent.kod_adi,
    katman: agent.katman, task: input.task, result: sonSonuc,
    status: 'tamamlandi', ai_kullandi: aiKullandi,
    rag_kullandi: ragKullandi, web_kullandi: webKullandi,
    arac_kullandi: kullanilanAraclar,
    iterasyon, duration_ms, timestamp,
    l2_denetim: l2DenetimOzet,
  };
}
