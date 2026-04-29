// ============================================================
// NEXT.JS 16+ PROXY — BIRLESIK GUVENLIK KATMANI
// ============================================================
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/api/telegram/webhook',
  '/api/telegram',
  '/api/health',
  '/api/health-check',
  '/api/bootstrap',
  '/api/agents',
];

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1',
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 300;
const CLEANUP_THRESHOLD = 500;

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return addSecurityHeaders(NextResponse.next());
  }

  if (process.env.NODE_ENV !== 'production') {
    const host = request.headers.get('host')?.split(':')[0] ?? '';

    if (!ALLOWED_HOSTS.has(host)) {
      return new NextResponse(
        JSON.stringify({
          hata: 'Erisim engellendi. Bu sistem yalnizca localhost uzerinden calisir.',
          hata_kodu: 'ERR-STP001-MUHAFIZ-001',
          mod: 'GUVENLI MOD',
          timestamp: new Date().toISOString(),
          debug: { host, pathname },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', 'X-Muhafiz-Status': 'BLOCKED' },
        }
      );
    }
  }

  if (!pathname.startsWith('/api/')) {
    return addSecurityHeaders(NextResponse.next());
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: 'ERR-RATE-001: Cok fazla istek — 60s bekleyin.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const source = origin || referer;

    if (source) {
      const isAllowed = ALLOWED_ORIGINS.some((allowed) => source.startsWith(allowed));
      if (!isAllowed) {
        return NextResponse.json({ success: false, error: 'CSRF: Yetkisiz kaynak.' }, { status: 403 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: 'CSRF: Origin header eksik.' }, { status: 403 });
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Muhafiz-Status', 'PASSED');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico).*)'],
};
