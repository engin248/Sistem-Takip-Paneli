// src/lib/rateLimiter.ts
// ============================================================
// BOT RATE LIMITER � In-Memory, Sunucu-Tarafl�
// ============================================================
// Her chat_id i�in: 10 saniyede 5 istek limit
// A��l�rsa: cooldown mesaj� + istek i�lenmez
// ============================================================

interface RateEntry {
  count    : number;
  resetAt  : number; // ms timestamp
  warned   : boolean;
}

const store = new Map<string, RateEntry>();

const WINDOW_MS  = 10_000; // 10 saniye
const MAX_CALLS  = 5;      // pencere ba��na max istek
const CLEANUP_INTERVAL = 60_000; // 60 saniyede bir temizle

// Eski kay�tlar� temizle (memleak �nleme)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}, CLEANUP_INTERVAL);

export interface RateLimitResult {
  allowed  : boolean;
  remaining: number;
  resetIn  : number; // saniye
}

export function checkRateLimit(chatId: number | string): RateLimitResult {
  const key = String(chatId);
  const now = Date.now();

  let entry = store.get(key);

  // Pencere dolmu�sa s�f�rla
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + WINDOW_MS, warned: false };
    store.set(key, entry);
  }

  entry.count++;
  const remaining = Math.max(0, MAX_CALLS - entry.count);
  const resetIn   = Math.ceil((entry.resetAt - now) / 1000);

  if (entry.count > MAX_CALLS) {
    return { allowed: false, remaining: 0, resetIn };
  }

  return { allowed: true, remaining, resetIn };
}

