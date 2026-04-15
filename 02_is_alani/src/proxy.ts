// ============================================================
// NEXT.JS 16+ PROXY — BİRLEŞİK GÜVENLİK KATMANI
// ============================================================
// Next.js 16'dan itibaren middleware convention KALDIRILDI.
// Bu dosya TEK güvenlik katmanı olarak çalışır.
//
// ⚠️ KRİTİK KURAL:
//   middleware.ts DOSYASI OLUŞTURULAMAZ!
//   Next.js 16+ middleware.ts + proxy.ts birlikte YASAKLADI.
//   Tüm güvenlik mantığı BU DOSYADA toplanmalıdır.
//
// Görevler:
//   1. PUBLIC_PATHS — rate limit ve auth bypass listesi
//   2. MUHAFIZ — Localhost guard (dev modda dış ağ erişimini engeller)
//   3. API rate limiting (Map + TTL)
//   4. CSRF benzeri origin kontrolü
//   5. Auth kontrolü — page route'larını korur (K-4 fix)
//   6. Güvenlik başlıkları ekleme
//
// Hata Kodları:
//   ERR-STP001-MUHAFIZ-001 — Dış ağ erişim engeli
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

// ── PUBLIC PATHS — Auth ve rate limit bypass ──────────────────
// Bu path'ler tüm güvenlik kontrollerinden muaf tutulur.
const PUBLIC_PATHS = [
  '/api/telegram/webhook',
  '/api/telegram',
  '/api/health',
  '/api/health-check',
  '/api/bootstrap',
  '/api/agents',
];

// ─── MUHAFIZ: Localhost Guard ────────────────────────────────
const ALLOWED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
]);

// ─── RATE LIMITER (In-Memory Map + TTL) ─────────────────────
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW_MS    = 60_000; // 1 dakika
const RATE_LIMIT_MAX_REQUESTS = 60;     // Dakikada 60 istek
const CLEANUP_THRESHOLD       = 500;    // 500+ kayıtta otomatik temizlik

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  if (rateLimitMap.size > CLEANUP_THRESHOLD) {
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

// ─── İZİN VERİLEN ORİGİN'LER ───────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

// ============================================================
// PROXY FONKSİYONU — Next.js 16+ Convention
// ============================================================

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 0. PUBLIC PATHS — Tüm kontrollerden muaf ─────────────
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return addSecurityHeaders(NextResponse.next());
  }

  // ── 1. MUHAFIZ: LOCALHOST GUARD (Dev Only) ─────────────────
  if (process.env.NODE_ENV !== 'production') {
    const host         = request.headers.get('host')?.split(':')[0] ?? '';
    const forwardedFor = request.headers.get('x-forwarded-for');

    if (!ALLOWED_HOSTS.has(host)) {
      return new NextResponse(
        JSON.stringify({
          hata:      'Erişim engellendi. Bu sistem yalnızca localhost üzerinden çalışır.',
          hata_kodu: 'ERR-STP001-MUHAFIZ-001',
          mod:       'GÜVENLİ MOD',
          timestamp: new Date().toISOString(),
          debug:     { host, forwardedFor, pathname },
        }),
        {
          status: 403,
          headers: {
            'Content-Type':    'application/json',
            'X-Muhafiz-Status': 'BLOCKED',
          },
        }
      );
    }
  }

  // ── 2. AUTH KONTROLÜ — Sayfa route'larını korur (K-4) ────
  if (!pathname.startsWith('/api/')) {
    const authEnabled = process.env.NEXT_PUBLIC_SUPABASE_AUTH_ENABLED === 'true';
    if (authEnabled) {
      const token = request.cookies.get('sb-access-token')?.value
                 ?? request.cookies.get('sb-tesxmqhkegotxenoljzl-auth-token')?.value;
      if (!token && pathname !== '/login' && !pathname.startsWith('/_next')) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
    return addSecurityHeaders(NextResponse.next());
  }

  // ── 3. RATE LIMITING (Sadece /api/* ) ──────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: 'ERR-RATE-001: Çok fazla istek — 60s bekleyin.' },
      {
        status: 429,
        headers: {
          'Retry-After':           '60',
          'X-RateLimit-Limit':     String(RATE_LIMIT_MAX_REQUESTS),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // ── 4. ORİGİN KONTROLÜ (CSRF benzeri) ─────────────────────
  if (request.method !== 'GET') {
    const origin  = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const source  = origin || referer;

    if (source) {
      const isAllowed = ALLOWED_ORIGINS.some(allowed => source.startsWith(allowed));
      if (!isAllowed) {
        return NextResponse.json(
          { success: false, error: 'CSRF: Yetkisiz kaynak.' },
          { status: 403 }
        );
      }
    }
  }

  // ── 5. GÜVENLİK BAŞLIKLARI ───────────────────────────────
  return addSecurityHeaders(NextResponse.next());
}

// ─── GÜVENLİK BAŞLIKLARI ───────────────────────────────────
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Muhafiz-Status', 'PASSED');
  return response;
}

// ─── MATCHER: Tüm route'lar (statik dosyalar hariç) ────────
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
