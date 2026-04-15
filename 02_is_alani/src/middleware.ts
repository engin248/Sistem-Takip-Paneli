// src/middleware.ts
// V-FINAL Middleware — Rate Limit + CSRF + Telegram İzolasyonu
// ============================================================
// Auth kontrolü MIDDLEWARE'DE YAPILMIYOR.
// Uygulama kendi auth sistemini (Supabase client-side) kullanır.
// Middleware'de auth redirect → /login sayfası olmadığı için 404.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

// ── Public Paths — rate limit muaf ──────────────────────────
// /api/telegram : Telegram sunucuları — token koruması yeterli
// /api/health   : Monitoring probe'ları
// /api/bootstrap: İlk kurulum
const PUBLIC_PATHS = [
  '/api/telegram',
  '/api/health',
  '/api/health-check',
  '/api/bootstrap',
];

// ── In-memory Rate Limiter ───────────────────────────────────
// 60 saniyede max 30 istek / IP — sadece /api/ rotalarına
const RATE_LIMIT = 30;
const WINDOW_MS  = 60_000;
const rateMap    = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now   = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// Bellek temizliği — 5 dakikada bir
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateMap.entries()) {
      if (now > entry.resetAt) rateMap.delete(ip);
    }
  }, 5 * 60_000);
}

// ── Middleware ───────────────────────────────────────────────

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Public paths — tüm kontrollerden muaf, hızlı geçiş
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }

  // ── Rate Limiting — yalnızca /api/ rotaları ───────────────
  if (path.startsWith('/api/')) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'ERR-RATE-001: Çok fazla istek. 60 saniye bekleyin.' },
        {
          status: 429,
          headers: {
            'Retry-After':           '60',
            'X-RateLimit-Limit':     String(RATE_LIMIT),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
  }

  // ── CSRF Origin Kontrolü — yazma /api/ rotaları ───────────
  // /api/telegram MUAF: Telegram Origin header göndermez.
  if (
    path.startsWith('/api/') &&
    !path.startsWith('/api/telegram') &&
    req.method !== 'GET'
  ) {
    const origin = req.headers.get('origin');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    if (origin && !origin.startsWith(appUrl) && !origin.includes('localhost')) {
      return NextResponse.json(
        { error: 'CSRF: Origin mismatch' },
        { status: 403 }
      );
    }
  }

  // Auth kontrolü middleware'de YOKTUR.
  // Supabase session yönetimi client-side (layout.tsx / AuthProvider) içindedir.
  // Middleware'de /login yönlendirmesi → /login sayfası olmadığı için 404 oluşturur.

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.ico$).*)'],
};
