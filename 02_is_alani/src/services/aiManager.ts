// ============================================================
// AI MANAGER â€” GÃ–REV ANALÄ°Z VE Ã–NCELÄ°K ATAMA MOTORU
// ============================================================
// Gelen gÃ¶revleri analiz edip TaskPriority atar.
// ÃœÃ‡ katmanlÄ± Ã§alÄ±ÅŸÄ±r:
//   1. OLLAMA (Yerel AI): Maliyet SIFIR â€” Ã¶ncelikli saÄŸlayÄ±cÄ±
//   2. OPENAI (DÄ±ÅŸ AI): Fallback â€” Ollama yoksa devreye girer
//   3. LOKAL (Kural tabanlÄ±): Her koÅŸulda Ã§alÄ±ÅŸÄ±r
// Hata KodlarÄ±:
//   ERR-STP001-014 â†’ AI analiz baÅŸarÄ±sÄ±z
//   ERR-STP001-015 â†’ OpenAI API baÄŸlantÄ± hatasÄ±
//   ERR-STP001-040 â†’ Ollama baÄŸlantÄ± hatasÄ±
// ============================================================


import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';
import { aiComplete, getProviderStatus } from '@/lib/aiProvider';
import type { TaskPriority } from '@/store/useTaskStore';
import { CONTROL } from '@/core/control_engine';


// â”€â”€â”€ Ã–NCELÄ°K ANALÄ°Z SONUCU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface PriorityAnalysisResult {
  /** Atanan Ã¶ncelik seviyesi */
  priority: TaskPriority;
  /** Ã–ncelik atama gerekÃ§esi */
  reasoning: string;
  /** Analiz kaynaÄŸÄ±: 'local' (kural tabanlÄ±) veya 'ai' (GPT) */
  source: 'local' | 'ai';
  /** GÃ¼ven skoru (0.0 â€“ 1.0) */
  confidence: number;
  /** Tespit edilen anahtar kelimeler */
  detectedKeywords: string[];
}

// â”€â”€â”€ ANAHTAR KELÄ°ME SÃ–ZLÃœÄÃœ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Her Ã¶ncelik seviyesi iÃ§in tetikleyici anahtar kelimeler.
// TÃ¼rkÃ§e ve Ä°ngilizce desteklenir.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PRIORITY_KEYWORDS: Record<TaskPriority, string[]> = {
  kritik: [
    // TR
    'acil', 'kritik', 'Ã§Ã¶kme', 'Ã§Ã¶ktÃ¼', 'arÄ±za', 'kesinti', 'patlama',
    'durdur', 'kriz', 'tehlike', 'gÃ¼venlik aÃ§Ä±ÄŸÄ±', 'veri kaybÄ±', 'sÄ±zÄ±ntÄ±',
    'fatal', 'Ã¶lÃ¼mcÃ¼l', 'sistem Ã§Ã¶ktÃ¼', 'eriÅŸilemiyor', 'veritabanÄ± hatasÄ±',
    'production down', 'Ã¼retim durdu', 'mÃ¼dahale',
    // EN
    'critical', 'crash', 'outage', 'emergency', 'urgent', 'security breach',
    'data loss', 'production down', 'fatal error', 'system failure',
  ],
  yuksek: [
    // TR
    'Ã¶nemli', 'Ã¶ncelikli', 'hÄ±zlÄ±', 'ivedi', 'servis hatasÄ±', 'performans',
    'yavaÅŸ', 'timeout', 'gecikme', 'mÃ¼ÅŸteri ÅŸikayeti', 'hata raporu',
    'bug', 'bozuk', 'Ã§alÄ±ÅŸmÄ±yor', 'dÃ¼zeltilmeli', 'deadline', 'teslim',
    // EN
    'high priority', 'important', 'bug', 'broken', 'not working', 'slow',
    'timeout', 'customer complaint', 'deadline', 'performance issue',
  ],
  normal: [
    // TR
    'gÃ¼ncelle', 'ekle', 'dÃ¼zenle', 'iyileÅŸtir', 'geliÅŸtir', 'refactor',
    'optimize', 'bakÄ±m', 'rutin', 'planlÄ±', 'ayarla', 'yapÄ±landÄ±r',
    // EN
    'update', 'add', 'modify', 'improve', 'enhance', 'refactor',
    'optimize', 'maintenance', 'configure', 'scheduled',
  ],
  dusuk: [
    // TR
    'araÅŸtÄ±r', 'incele', 'not', 'belge', 'dokÃ¼mantasyon', 'ileride',
    'dÃ¼ÅŸÃ¼n', 'fikir', 'Ã¶neri', 'kozmetik', 'renk', 'font', 'typo',
    'yazÄ±m hatasÄ±', 'biÃ§im', 'format',
    // EN
    'research', 'investigate', 'note', 'documentation', 'someday',
    'idea', 'suggestion', 'cosmetic', 'typo', 'formatting',
  ],
};

// â”€â”€â”€ KELÄ°ME AÄIRLIK TABLOSU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  kritik: 4,
  yuksek: 3,
  normal: 2,
  dusuk: 1,
};

// ============================================================
// 1. LOKAL ANALÄ°Z (Kural TabanlÄ±)
// ============================================================
// Anahtar kelime tarama + heuristik puanlama.
// API baÄŸlantÄ±sÄ± gerektirmez â€” her koÅŸulda Ã§alÄ±ÅŸÄ±r.
// ============================================================
export function analyzeLocalPriority(taskTitle: string, taskDescription?: string | null): PriorityAnalysisResult {
  const text = `${taskTitle} ${taskDescription || ''}`.toLowerCase().trim();
  const detectedKeywords: string[] = [];

  // Her Ã¶ncelik seviyesi iÃ§in eÅŸleÅŸme sayÄ±sÄ±nÄ± hesapla
  const scores: Record<TaskPriority, number> = {
    kritik: 0,
    yuksek: 0,
    normal: 0,
    dusuk: 0,
  };

  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS) as [TaskPriority, string[]][]) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        scores[priority] += PRIORITY_WEIGHTS[priority];
        detectedKeywords.push(keyword);
      }
    }
  }

  // En yÃ¼ksek puanlÄ± Ã¶nceliÄŸi seÃ§
  let winningPriority: TaskPriority = 'normal'; // VarsayÄ±lan
  let maxScore = 0;

  for (const [priority, score] of Object.entries(scores) as [TaskPriority, number][]) {
    if (score > maxScore) {
      maxScore = score;
      winningPriority = priority;
    }
  }

  // GÃ¼ven skoru: eÅŸleÅŸme kalitesine gÃ¶re 0-1 arasÄ±
  // HiÃ§ eÅŸleÅŸme yoksa dÃ¼ÅŸÃ¼k gÃ¼ven (varsayÄ±lan 'normal' atanÄ±r)
  const totalKeywords = detectedKeywords.length;
  const confidence = totalKeywords === 0
    ? 0.3 // EÅŸleÅŸme yok â€” dÃ¼ÅŸÃ¼k gÃ¼ven ile varsayÄ±lan
    : Math.min(1.0, 0.5 + (totalKeywords * 0.1));

  // Heuristik kurallar (anahtar kelime dÄ±ÅŸÄ±)
  // Kural-1: Ãœnlem iÅŸareti yoÄŸunluÄŸu â†’ yÃ¼kseltme
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount >= 3 && winningPriority !== 'kritik') {
    winningPriority = 'yuksek';
    detectedKeywords.push('!!! (Ã¼nlem yoÄŸunluÄŸu)');
  }

  // Kural-2: BÃœYÃœK HARF kullanÄ±mÄ± â†’ aciliyet sinyali
  const uppercaseRatio = (taskTitle.replace(/[^A-ZÃ‡ÄÄ°Ã–ÅÃœ]/g, '').length) / Math.max(taskTitle.length, 1);
  if (uppercaseRatio > 0.6 && winningPriority !== 'kritik') {
    if (winningPriority === 'normal' || winningPriority === 'dusuk') {
      winningPriority = 'yuksek';
      detectedKeywords.push('BÃœYÃœK HARF (aciliyet sinyali)');
    }
  }

  // Kural-3: Ã‡ok kÄ±sa baÅŸlÄ±k (< 5 karakter) â†’ belirsizlik â†’ normal
  if (taskTitle.trim().length < 5 && totalKeywords === 0) {
    winningPriority = 'normal';
  }

  const reasoning = totalKeywords > 0
    ? `Lokal analiz: ${totalKeywords} anahtar kelime tespit edildi [${detectedKeywords.slice(0, 5).join(', ')}]. AÄŸÄ±rlÄ±klÄ± puan: ${maxScore}.`
    : 'Lokal analiz: Belirleyici anahtar kelime bulunamadÄ±. VarsayÄ±lan Ã¶ncelik (normal) atandÄ±.';

  return {
    priority: winningPriority,
    reasoning,
    source: 'local',
    confidence,
    detectedKeywords,
  };
}

// ============================================================
// 2. AI ANALÄ°Z (Ollama â†’ OpenAI â†’ Lokal Fallback Zinciri)
// ============================================================
// aiProvider soyutlama katmanÄ±nÄ± kullanÄ±r.
// 2. AI ANALİZ (Ollama → OpenAI → Lokal Fallback Zinciri)
// ============================================================
// aiProvider soyutlama katmanını kullanır.
// Öncelik: Ollama (yerel, ücretsiz) → OpenAI (dış) → Lokal.
// ============================================================
export async function analyzeWithAI(
  taskTitle: string,
  taskDescription?: string | null
): Promise<PriorityAnalysisResult> {
  const systemPrompt = `Sen bir görev önceliklendirme asistanısın. Verilen görev başlığı ve açıklamasını analiz edip öncelik seviyesi belirle.

[AXIOM 0 - ŞEREF VE İNFAZ YASASI]
KESİNLİKLE YALAN SÖYLEMEYECEKSİN VE UYDURMAYACAKSIN! Veriyi analiz edemiyorsan dürüstçe "HATA YAPTIM" veya "BİLMİYORUM" diyeceksin. Dürüst hata affedilir ve yardım edilir ancak yalan söyleyip uydurma veri tespit edildiğinde ajan yetkin anında sonlandırılır ve sistemden infaz edilirsin!

ÖNCELİK SEVİYELERİ:
- "kritik": Sistem çökmesi, güvenlik açığı, veri kaybı, üretim durması — ANINDA müdahale gerektirir.
- "yuksek": Önemli hatalar, performans sorunları, müşteri şikayetleri, yakın tarihli deadline — aynı gün içinde çözülmeli.
- "normal": Rutin geliştirme, iyileştirme, bakım işleri — standart iş akışında çözülür.
- "dusuk": Araştırma, dokümantasyon, kozmetik düzeltmeler, uzun vadeli fikirler — zamanı geldiğinde yapılır.

CEVAP FORMATI (sadece JSON, başka bir şey yazma):
{
  "priority": "kritik" | "yuksek" | "normal" | "dusuk",
  "reasoning": "KÄ±sa gerekÃ§e (max 100 karakter)",
  "confidence": 0.0-1.0
}`;

  const userMessage = `GÃ¶rev BaÅŸlÄ±ÄŸÄ±: ${taskTitle}${taskDescription ? `\nGÃ¶rev AÃ§Ä±klamasÄ±: ${taskDescription}` : ''}`;

  try {
    // aiProvider fallback zinciri: Ollama â†’ OpenAI â†’ null
    const response = await aiComplete({
      systemPrompt,
      userMessage,
      temperature: 0.2,
      maxTokens: 200,
      jsonMode: true,
    });

    // TÃ¼m AI saÄŸlayÄ±cÄ±lar devre dÄ±ÅŸÄ± â†’ lokal devralÄ±r
    if (!response) {
      return analyzeLocalPriority(taskTitle, taskDescription);
    }

    // JSON parse
    let parsed: { priority?: string; reasoning?: string; confidence?: number };
    try {
      parsed = JSON.parse(response.content);
    } catch (parseErr) {
      processError(ERR.AI_ANALYSIS, parseErr, {
        kaynak: 'aiManager.ts',
        islem: 'JSON_PARSE',
        provider: response.provider,
        raw_content: response.content.substring(0, 200),
      });
      return analyzeLocalPriority(taskTitle, taskDescription);
    }

    // GeÃ§erlilik kontrolÃ¼
    const validPriorities: TaskPriority[] = ['kritik', 'yuksek', 'normal', 'dusuk'];
    const aiPriority = validPriorities.includes(parsed.priority as TaskPriority)
      ? (parsed.priority as TaskPriority)
      : 'normal';

    const aiConfidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.7;

    // Audit log â€” AI analiz kaydÄ±
    await logAudit({
      operation_type: 'EXECUTE',
      action_description: `AI gÃ¶rev analizi tamamlandÄ±: "${taskTitle}" â†’ ${aiPriority.toUpperCase()} [${response.provider}]`,
      metadata: {
        action_code: 'AI_PRIORITY_ANALYSIS',
        provider: response.provider,
        model: response.model,
        priority: aiPriority,
        confidence: aiConfidence,
        reasoning: parsed.reasoning || '',
        duration_ms: response.durationMs,
        tokens_used: response.tokensUsed || 0,
        cost: response.provider === 'ollama' ? 0 : undefined,
      },
    }).catch(() => {
      // Audit yazma hatasÄ± â€” processError zaten auditService iÃ§inde loglanÄ±yor
    });

    return {
      priority: aiPriority,
      reasoning: parsed.reasoning || `${response.provider} analiz: ${aiPriority} Ã¶ncelik atandÄ± (gÃ¼ven: ${aiConfidence})`,
      source: 'ai',
      confidence: aiConfidence,
      detectedKeywords: [],
    };
  } catch (error) {
    processError(ERR.AI_ANALYSIS, error, {
      kaynak: 'aiManager.ts',
      islem: 'AI_COMPLETE',
    });

    // Fallback: Lokal analiz devralÄ±r
    return analyzeLocalPriority(taskTitle, taskDescription);
  }
}

// ============================================================
// 3. ANA ANALÄ°Z FONKSÄ°YONU (ORKESTRATÃ–R)
// ============================================================
// DÄ±ÅŸ dÃ¼nya bu fonksiyonu Ã§aÄŸÄ±rÄ±r.
// AI mevcut ve Ã§alÄ±ÅŸÄ±yorsa â†’ AI analizi.
// AI mevcut deÄŸilse veya hata oluÅŸursa â†’ Lokal analiz.
// Her durumda bir sonuÃ§ dÃ¶ner â€” sistem asla bloke olmaz.
// ============================================================

export interface AnalysisOptions {
  /** true ise AI analizi dener, yoksa sadece lokal. VarsayÄ±lan: true */
  useAI?: boolean;
  /** AI yanÄ±t timeout sÃ¼resi (ms). VarsayÄ±lan: 10000 */
  timeoutMs?: number;
}

export async function analyzeTaskPriority(
  taskTitle: string,
  taskDescription?: string | null,
  options: AnalysisOptions = {}
): Promise<PriorityAnalysisResult> {
  const { useAI = true, timeoutMs = 10000 } = options;

  // AI devre dÄ±ÅŸÄ± bÄ±rakÄ±lmÄ±ÅŸsa doÄŸrudan lokal
  if (!useAI) {
    return analyzeLocalPriority(taskTitle, taskDescription);
  }

  // AI analizi â€” timeout korumalÄ±
  try {
    const aiPromise = analyzeWithAI(taskTitle, taskDescription);
    const timeoutPromise = new Promise<PriorityAnalysisResult>((_, reject) => {
      setTimeout(() => reject(new Error(`AI analiz timeout: ${timeoutMs}ms`)), timeoutMs);
    });

    return await Promise.race([aiPromise, timeoutPromise]);
  } catch (error) {
    processError(ERR.AI_ANALYSIS, error, {
      kaynak: 'aiManager.ts',
      islem: 'ORCHESTRATOR',
      fallback: 'LOCAL',
    }, 'WARNING');

    // Timeout veya beklenmeyen hata â†’ lokal devralÄ±r
    return analyzeLocalPriority(taskTitle, taskDescription);
  }
}

// ============================================================
// 4. YARDIMCI FONKSÄ°YONLAR
// ============================================================

/** AI saÄŸlayÄ±cÄ±nÄ±n (Ollama veya OpenAI) mevcut olup olmadÄ±ÄŸÄ±nÄ± kontrol eder */
export function isAIAvailable(): boolean {
  // Ollama veya OpenAI â€” biri bile varsa AI mevcut
  const openaiKey = process.env.OPENAI_API_KEY ?? '';
  return !!(openaiKey && openaiKey !== '' && !openaiKey.includes('your-api-key')) ||
    !!(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL);
}

/** Aktif AI saÄŸlayÄ±cÄ± durumunu dÃ¶ndÃ¼rÃ¼r */
export async function getActiveAIProvider() {
  return getProviderStatus();
}

/** Ã–ncelik seviyesini TÃ¼rkÃ§e etiket olarak dÃ¶ndÃ¼rÃ¼r */
export function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    kritik: 'ğŸ”´ KRÄ°TÄ°K',
    yuksek: 'ğŸŸ  YÃœKSEK',
    normal: 'ğŸŸ¡ NORMAL',
    dusuk: 'ğŸŸ¢ DÃœÅÃœK',
  };
  return labels[priority] || 'ğŸŸ¡ NORMAL';
}

/** Ã–ncelik seviyesine gÃ¶re Telegram emoji dÃ¶ndÃ¼rÃ¼r */
export function getPriorityEmoji(priority: TaskPriority): string {
  const emojis: Record<TaskPriority, string> = {
    kritik: 'ğŸš¨',
    yuksek: 'âš ï¸',
    normal: 'ğŸ“‹',
    dusuk: 'ğŸ“',
  };
  return emojis[priority] || 'ğŸ“‹';
}
