// src/lib/fetchWithTimeout.ts
// ============================================================
// MERKEZI FETCH YARDIMCISI — Timeout + AbortController
// ============================================================
// Tüm client-side panel fetch çağrıları buradan geçer.
// Varsayılan timeout: 10 saniye.
// Timeout sonrası AbortError fırlatılır ve panel fallback UI gösterir.
// ============================================================

/**
 * Timeout destekli fetch wrapper.
 * @param url - API endpoint
 * @param options - fetch options (opsiyonel)
 * @param timeoutMs - Timeout süresi ms (varsayılan: 10000)
 * @returns fetch Response
 * @throws AbortError veya network hatası
 */
export async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
  timeoutMs = 10_000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * JSON dönen API endpoint'leri için kısa yol.
 * Timeout + JSON parse + hata kontrolü tek satırda.
 */
export async function fetchJSON<T>(
  url: string,
  timeoutMs = 10_000,
): Promise<T> {
  const res = await fetchWithTimeout(url, undefined, timeoutMs);
  if (!res.ok) {
    // 502 Cloudflare HTML döndüğünde JSON.parse crash'ini engelle
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`HTTP ${res.status}: Beklenen JSON, gelen ${contentType.split(';')[0] || 'bilinmiyor'}`);
    }
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  // JSON parse güvenliği — HTML/text gelirse crash etme
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`JSON parse hatasi: Yanit JSON degil (${text.substring(0, 100)}...)`);
  }
}
