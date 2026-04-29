// src/services/webSearch.ts
// ============================================================
// WEB ARAMA SERVİSİ — DuckDuckGo Instant Answer API (Ücretsiz)
// ============================================================
// API key gerektirmez. 
// ============================================================

export interface WebSearchSonuc {
  baslik  : string;
  ozet    : string;
  url     : string;
}

export interface WebSearchYaniti {
  sorgu   : string;
  sonuclar: WebSearchSonuc[];
  ozet    : string;
}

// ── DuckDuckGo Instant Answer API ────────────────────────────
export async function webSearch(sorgu: string, maxSonuc = 5): Promise<WebSearchYaniti> {
  const encoded = encodeURIComponent(sorgu);
  const url     = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_redirect=1&skip_disambig=1`;

  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json() as {
      AbstractText?: string;
      AbstractURL?:  string;
      RelatedTopics?: Array<{
        Text?:       string;
        FirstURL?:   string;
        Topics?:     Array<{ Text?: string; FirstURL?: string }>;
      }>;
    };

    const sonuclar: WebSearchSonuc[] = [];

    // Ana özet
    if (data.AbstractText) {
      sonuclar.push({
        baslik : sorgu,
        ozet   : data.AbstractText,
        url    : data.AbstractURL || '',
      });
    }

    // İlgili konular
    for (const topic of (data.RelatedTopics || []).slice(0, maxSonuc - 1)) {
      if (topic.Text && topic.FirstURL) {
        sonuclar.push({
          baslik : topic.Text.split(' - ')[0] || topic.Text.slice(0, 60),
          ozet   : topic.Text,
          url    : topic.FirstURL,
        });
      }
      // Alt konular
      for (const sub of (topic.Topics || []).slice(0, 2)) {
        if (sub.Text && sub.FirstURL && sonuclar.length < maxSonuc) {
          sonuclar.push({
            baslik : sub.Text.slice(0, 60),
            ozet   : sub.Text,
            url    : sub.FirstURL,
          });
        }
      }
      if (sonuclar.length >= maxSonuc) break;
    }

    return {
      sorgu,
      sonuclar: sonuclar.slice(0, maxSonuc),
      ozet    : data.AbstractText || (sonuclar[0]?.ozet ?? 'Sonuç bulunamadı'),
    };

  } catch (err) {
    return {
      sorgu,
      sonuclar: [],
      ozet    : `Web arama hatası: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ── WEB ARAMA PROMPT BAĞLAMI ──────────────────────────────────
export async function webContext(sorgu: string): Promise<string> {
  const yanit = await webSearch(sorgu, 3);
  if (yanit.sonuclar.length === 0) return '';

  const parcalar = yanit.sonuclar
    .map((s, i) => `[${i + 1}] ${s.baslik}\n${s.ozet}`)
    .join('\n\n');

  return `\n\nWEB ARAMA SONUÇLARI ("${sorgu}"):\n${parcalar}\n\nBu güncel bilgileri yanıtında kullan.`;
}
