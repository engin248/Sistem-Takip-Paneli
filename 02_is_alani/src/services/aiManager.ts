// ============================================================
// AI MANAGER — GÖREV ANALİZ VE ÖNCELİK ATAMA MOTORU
// ============================================================
// Gelen görevleri analiz edip TaskPriority atar.
// ÜÇ katmanlı çalışır:
//   1. OLLAMA (Yerel AI): Maliyet SIFIR — öncelikli sağlayıcı
//   2. OPENAI (Dış AI): Fallback — Ollama yoksa devreye girer
//   3. LOKAL (Kural tabanlı): Her koşulda çalışır
// Hata Kodları:
//   ERR-STP001-014 → AI analiz başarısız
//   ERR-STP001-015 → OpenAI API bağlantı hatası
//   ERR-STP001-040 → Ollama bağlantı hatası
// ============================================================

import OpenAI from 'openai';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';
import { aiComplete, getProviderStatus } from '@/lib/aiProvider';
import type { TaskPriority } from '@/store/useTaskStore';

// ─── OPENAI CLIENT ──────────────────────────────────────────
// .env.local'dan OPENAI_API_KEY okunur.
// Key yoksa AI analizi devre dışı kalır, lokal analiz devralır.
// ─────────────────────────────────────────────────────────────
const apiKey = process.env.OPENAI_API_KEY ?? '';

let openai: OpenAI | null = null;

/**
 * OpenAI client'ı lazily başlatır.
 * API key yoksa null döner — AI analizi devre dışı kalır.
 */
function getOpenAIClient(): OpenAI | null {
  if (openai) return openai;

  if (!apiKey || apiKey === '' || apiKey.includes('your-api-key')) {
    processError(ERR.AI_CONNECTION, new Error('OPENAI_API_KEY tanımlı değil veya geçersiz'), {
      kaynak: 'aiManager.ts',
      islem: 'CLIENT_INIT'
    }, 'WARNING');
    return null;
  }

  try {
    openai = new OpenAI({ apiKey });
    return openai;
  } catch (error) {
    processError(ERR.AI_CONNECTION, error, {
      kaynak: 'aiManager.ts',
      islem: 'CLIENT_INIT'
    }, 'CRITICAL');
    return null;
  }
}

// ─── ÖNCELİK ANALİZ SONUCU ─────────────────────────────────
export interface PriorityAnalysisResult {
  /** Atanan öncelik seviyesi */
  priority: TaskPriority;
  /** Öncelik atama gerekçesi */
  reasoning: string;
  /** Analiz kaynağı: 'local' (kural tabanlı) veya 'ai' (GPT) */
  source: 'local' | 'ai';
  /** Güven skoru (0.0 – 1.0) */
  confidence: number;
  /** Tespit edilen anahtar kelimeler */
  detectedKeywords: string[];
  /** AI'ın Formal Verification Motoruna gönderdiği kurallar */
  formal_spec?: import('@/core/formal_verifier').FormalSpec;
}

// ─── ANAHTAR KELİME SÖZLÜĞÜ ────────────────────────────────
// Her öncelik seviyesi için tetikleyici anahtar kelimeler.
// Türkçe ve İngilizce desteklenir.
// ─────────────────────────────────────────────────────────────
const PRIORITY_KEYWORDS: Record<TaskPriority, string[]> = {
  kritik: [
    // TR
    'acil', 'kritik', 'çökme', 'çöktü', 'arıza', 'kesinti', 'patlama',
    'durdur', 'kriz', 'tehlike', 'güvenlik açığı', 'veri kaybı', 'sızıntı',
    'fatal', 'ölümcül', 'sistem çöktü', 'erişilemiyor', 'veritabanı hatası',
    'production down', 'üretim durdu', 'müdahale',
    // EN
    'critical', 'crash', 'outage', 'emergency', 'urgent', 'security breach',
    'data loss', 'production down', 'fatal error', 'system failure',
  ],
  yuksek: [
    // TR
    'önemli', 'öncelikli', 'hızlı', 'ivedi', 'servis hatası', 'performans',
    'yavaş', 'timeout', 'gecikme', 'müşteri şikayeti', 'hata raporu',
    'bug', 'bozuk', 'çalışmıyor', 'düzeltilmeli', 'deadline', 'teslim',
    // EN
    'high priority', 'important', 'bug', 'broken', 'not working', 'slow',
    'timeout', 'customer complaint', 'deadline', 'performance issue',
  ],
  normal: [
    // TR
    'güncelle', 'ekle', 'düzenle', 'iyileştir', 'geliştir', 'refactor',
    'optimize', 'bakım', 'rutin', 'planlı', 'ayarla', 'yapılandır',
    // EN
    'update', 'add', 'modify', 'improve', 'enhance', 'refactor',
    'optimize', 'maintenance', 'configure', 'scheduled',
  ],
  dusuk: [
    // TR
    'araştır', 'incele', 'not', 'belge', 'dokümantasyon', 'ileride',
    'düşün', 'fikir', 'öneri', 'kozmetik', 'renk', 'font', 'typo',
    'yazım hatası', 'biçim', 'format',
    // EN
    'research', 'investigate', 'note', 'documentation', 'someday',
    'idea', 'suggestion', 'cosmetic', 'typo', 'formatting',
  ],
};

// ─── KELİME AĞIRLIK TABLOSU ────────────────────────────────
const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  kritik: 4,
  yuksek: 3,
  normal: 2,
  dusuk: 1,
};

// ============================================================
// 1. LOKAL ANALİZ (Kural Tabanlı)
// ============================================================
// Anahtar kelime tarama + heuristik puanlama.
// API bağlantısı gerektirmez — her koşulda çalışır.
// ============================================================
export function analyzeLocalPriority(taskTitle: string, taskDescription?: string | null): PriorityAnalysisResult {
  const text = `${taskTitle} ${taskDescription || ''}`.toLowerCase().trim();
  const detectedKeywords: string[] = [];

  // Her öncelik seviyesi için eşleşme sayısını hesapla
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

  // En yüksek puanlı önceliği seç
  let winningPriority: TaskPriority = 'normal'; // Varsayılan
  let maxScore = 0;

  for (const [priority, score] of Object.entries(scores) as [TaskPriority, number][]) {
    if (score > maxScore) {
      maxScore = score;
      winningPriority = priority;
    }
  }

  // Güven skoru: eşleşme kalitesine göre 0-1 arası
  // Hiç eşleşme yoksa düşük güven (varsayılan 'normal' atanır)
  const totalKeywords = detectedKeywords.length;
  const confidence = totalKeywords === 0
    ? 0.3 // Eşleşme yok — düşük güven ile varsayılan
    : Math.min(1.0, 0.5 + (totalKeywords * 0.1));

  // Heuristik kurallar (anahtar kelime dışı)
  // Kural-1: Ünlem işareti yoğunluğu → yükseltme
  const exclamationCount = (text.match(/!/g) || []).length;
  if (exclamationCount >= 3 && winningPriority !== 'kritik') {
    winningPriority = 'yuksek';
    detectedKeywords.push('!!! (ünlem yoğunluğu)');
  }

  // Kural-2: BÜYÜK HARF kullanımı → aciliyet sinyali
  const uppercaseRatio = (taskTitle.replace(/[^A-ZÇĞİÖŞÜ]/g, '').length) / Math.max(taskTitle.length, 1);
  if (uppercaseRatio > 0.6 && winningPriority !== 'kritik') {
    if (winningPriority === 'normal' || winningPriority === 'dusuk') {
      winningPriority = 'yuksek';
      detectedKeywords.push('BÜYÜK HARF (aciliyet sinyali)');
    }
  }

  // Kural-3: Çok kısa başlık (< 5 karakter) → belirsizlik → normal
  if (taskTitle.trim().length < 5 && totalKeywords === 0) {
    winningPriority = 'normal';
  }

  const reasoning = totalKeywords > 0
    ? `Lokal analiz: ${totalKeywords} anahtar kelime tespit edildi [${detectedKeywords.slice(0, 5).join(', ')}]. Ağırlıklı puan: ${maxScore}.`
    : 'Lokal analiz: Belirleyici anahtar kelime bulunamadı. Varsayılan öncelik (normal) atandı.';

  return {
    priority: winningPriority,
    reasoning,
    source: 'local',
    confidence,
    detectedKeywords,
  };
}

// ============================================================
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

ÖNCELİK SEVİYELERİ:
- "kritik": Sistem çökmesi, güvenlik açığı, veri kaybı, üretim durması — ANINDA müdahale gerektirir.
- "yuksek": Önemli hatalar, performans sorunları, müşteri şikayetleri, yakın tarihli deadline — aynı gün içinde çözülmeli.
- "normal": Rutin geliştirme, iyileştirme, bakım işleri — standart iş akışında çözülür.
- "dusuk": Araştırma, dokümantasyon, kozmetik düzeltmeler, uzun vadeli fikirler — zamanı geldiğinde yapılır.

CEVAP FORMATI (sadece JSON, başka bir şey yazma):
{
  "priority": "kritik" | "yuksek" | "normal" | "dusuk",
  "reasoning": "Kısa gerekçe (max 100 karakter)",
  "confidence": 0.0-1.0,
  "formal_spec": {
    "goal": "işlemin amacı",
    "constraints": ["kısıt1", "kısıt2"],
    "rules": ["kural1"],
    "forbidden": ["yapılmaması gerekenler"]
  }
}`;

  const userMessage = `Görev Başlığı: ${taskTitle}${taskDescription ? `\nGörev Açıklaması: ${taskDescription}` : ''}`;

  try {
    // aiProvider fallback zinciri: Ollama → OpenAI → null
    const response = await aiComplete({
      systemPrompt,
      userMessage,
      temperature: 0.2,
      maxTokens: 200,
      jsonMode: true,
    });

    // Tüm AI sağlayıcılar devre dışı → lokal devralır
    if (!response) {
      return analyzeLocalPriority(taskTitle, taskDescription);
    }

    // JSON parse
    let parsed: { priority?: string; reasoning?: string; confidence?: number; formal_spec?: any };
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

    // Geçerlilik kontrolü
    const validPriorities: TaskPriority[] = ['kritik', 'yuksek', 'normal', 'dusuk'];
    const aiPriority = validPriorities.includes(parsed.priority as TaskPriority)
      ? (parsed.priority as TaskPriority)
      : 'normal';

    const aiConfidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.7;

    // Audit log — AI analiz kaydı
    await logAudit({
      operation_type: 'EXECUTE',
      action_description: `AI görev analizi tamamlandı: "${taskTitle}" → ${aiPriority.toUpperCase()} [${response.provider}]`,
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
      // Audit yazma hatası — processError zaten auditService içinde loglanıyor
    });

    return {
      priority: aiPriority,
      reasoning: parsed.reasoning || `${response.provider} analiz: ${aiPriority} öncelik atandı (güven: ${aiConfidence})`,
      source: 'ai',
      confidence: aiConfidence,
      detectedKeywords: [],
      formal_spec: parsed.formal_spec || {
        goal: "determine_priority",
        constraints: [],
        rules: [],
        forbidden: [],
        proposed_priority: aiPriority
      }
    };
  } catch (error) {
    processError(ERR.AI_ANALYSIS, error, {
      kaynak: 'aiManager.ts',
      islem: 'AI_COMPLETE',
    });

    // Fallback: Lokal analiz devralır
    return analyzeLocalPriority(taskTitle, taskDescription);
  }
}

// ============================================================
// 3. ANA ANALİZ FONKSİYONU (ORKESTRATÖR)
// ============================================================
// Dış dünya bu fonksiyonu çağırır.
// AI mevcut ve çalışıyorsa → AI analizi.
// AI mevcut değilse veya hata oluşursa → Lokal analiz.
// Her durumda bir sonuç döner — sistem asla bloke olmaz.
// ============================================================

export interface AnalysisOptions {
  /** true ise AI analizi dener, yoksa sadece lokal. Varsayılan: true */
  useAI?: boolean;
  /** AI yanıt timeout süresi (ms). Varsayılan: 10000 */
  timeoutMs?: number;
}

export async function analyzeTaskPriority(
  taskTitle: string,
  taskDescription?: string | null,
  options: AnalysisOptions = {}
): Promise<PriorityAnalysisResult> {
  const { useAI = true, timeoutMs = 10000 } = options;

  // AI devre dışı bırakılmışsa doğrudan lokal
  if (!useAI) {
    return analyzeLocalPriority(taskTitle, taskDescription);
  }

  // AI analizi — timeout korumalı
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

    // Timeout veya beklenmeyen hata → lokal devralır
    return analyzeLocalPriority(taskTitle, taskDescription);
  }
}

// ============================================================
// 4. YARDIMCI FONKSİYONLAR
// ============================================================

/** AI sağlayıcının (Ollama veya OpenAI) mevcut olup olmadığını kontrol eder */
export function isAIAvailable(): boolean {
  // Ollama veya OpenAI — biri bile varsa AI mevcut
  return !!(apiKey && apiKey !== '' && !apiKey.includes('your-api-key')) ||
    !!(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL);
}

/** Aktif AI sağlayıcı durumunu döndürür */
export async function getActiveAIProvider() {
  return getProviderStatus();
}

/** Öncelik seviyesini Türkçe etiket olarak döndürür */
export function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    kritik: '🔴 KRİTİK',
    yuksek: '🟠 YÜKSEK',
    normal: '🟡 NORMAL',
    dusuk: '🟢 DÜŞÜK',
  };
  return labels[priority] || '🟡 NORMAL';
}

/** Öncelik seviyesine göre Telegram emoji döndürür */
export function getPriorityEmoji(priority: TaskPriority): string {
  const emojis: Record<TaskPriority, string> = {
    kritik: '🚨',
    yuksek: '⚠️',
    normal: '📋',
    dusuk: '📝',
  };
  return emojis[priority] || '📋';
}
