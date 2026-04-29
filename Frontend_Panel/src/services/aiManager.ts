// ============================================================
// AI MANAGER — Gerçek Öncelik Analizi
// KÖK NEDEN: analyzeTaskPriority hiç AI çağrısı yapmıyordu,
//            her zaman 'normal' döndürüyordu.
// ÇÖZÜM: Gerçek kural tabanlı + AI destekli öncelik analizi.
// ============================================================

export type TaskPriority = 'kritik' | 'yuksek' | 'normal' | 'dusuk';

export interface PriorityResult {
  priority: TaskPriority;
  reasoning: string;
  score: number; // 1-5
  kaynak: 'kural' | 'ai' | 'fallback';
}

// KURAL TABANLI ÖNCE — AI maliyeti gerektirmeyen kategoriler
const KURAL_HARITASI: { kelimeler: string[]; oncelik: TaskPriority; skor: number }[] = [
  {
    kelimeler: ['acil', 'kritik', 'çöktü', 'down', 'crash', 'güvenlik', 'hack', 'saldırı', 'veri kaybı', 'felaket'],
    oncelik: 'kritik', skor: 5
  },
  {
    kelimeler: ['önemli', 'hızlı', 'deploy', 'production', 'canlı', 'müşteri', 'bug', 'hata', 'sorun'],
    oncelik: 'yuksek', skor: 4
  },
  {
    kelimeler: ['test', 'ar-ge', 'araştır', 'incele', 'analiz', 'dokümantasyon', 'readme'],
    oncelik: 'dusuk', skor: 2
  },
];

/**
 * analyzeTaskPriority — Kural tabanlı + AI destekli öncelik tespiti
 * KÖK NEDEN DÜZELTİLDİ: Artık gerçek analiz yapılıyor.
 * 1. Kural motoru — anlık, sıfır maliyet
 * 2. AI (Ollama) — kural belirsizse devreye girer
 * 3. Fallback — AI de çevrimdışıysa 'normal'
 */
export async function analyzeTaskPriority(gorev: string): Promise<PriorityResult> {
  if (!gorev || gorev.trim().length < 3) {
    return { priority: 'normal', reasoning: 'Görev metni çok kısa — F-016 GIGO', score: 3, kaynak: 'kural' };
  }

  const lower = gorev.toLowerCase();

  // ADIM 1: Kural motoru — hızlı ve kesin
  for (const kural of KURAL_HARITASI) {
    const eslesen = kural.kelimeler.find(k => lower.includes(k));
    if (eslesen) {
      return {
        priority: kural.oncelik,
        reasoning: `Kural eşleşmesi: "${eslesen}" → ${kural.oncelik.toUpperCase()}`,
        score: kural.skor,
        kaynak: 'kural'
      };
    }
  }

  // ADIM 2: AI analizi (Ollama — sıfır maliyet)
  try {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model     = process.env.OLLAMA_MODEL    || 'llama3:latest';

    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000); // 5sn timeout

    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        options: { temperature: 0, num_predict: 50 },
        messages: [
          {
            role: 'system',
            content: 'Sen görev öncelik analizcisisin. Verilen görevi değerlendir ve SADECE şu JSON formatında yanıt ver: {"priority":"kritik|yuksek|normal|dusuk","gerekce":"kısa açıklama","skor":1-5}'
          },
          { role: 'user', content: `Görev: ${gorev.slice(0, 200)}` }
        ],
        format: 'json'
      })
    });

    clearTimeout(tid);

    if (res.ok) {
      const data = await res.json() as { message?: { content?: string } };
      const content = data.message?.content || '';
      const parsed = JSON.parse(content) as { priority: TaskPriority; gerekce: string; skor: number };

      if (['kritik', 'yuksek', 'normal', 'dusuk'].includes(parsed.priority)) {
        return {
          priority: parsed.priority,
          reasoning: parsed.gerekce || 'AI analizi',
          score: Math.min(5, Math.max(1, parsed.skor || 3)),
          kaynak: 'ai'
        };
      }
    }
  } catch {
    // AI çevrimdışı — fallback'e geç (sessiz)
  }

  // ADIM 3: Fallback
  return { priority: 'normal', reasoning: 'Kural eşleşmedi, AI çevrimdışı — normal atandı', score: 3, kaynak: 'fallback' };
}

export const getAiManager = () => ({ analyzeTaskPriority });
