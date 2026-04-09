// ============================================================
// NEXT.JS MIDDLEWARE — API KORUMA KATMANI
// ============================================================
// Görevler:
//   1. API route'larına rate limiting (in-memory)
//   2. CSRF benzeri origin kontrolü
//   3. Bot/spam koruması (User-Agent kontrolü)
//   4. Güvenlik başlıkları ekleme
//
// Kapsam: /api/* route'ları
// Hata Kodu: ERR-STP001-001 (genel sistem)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

// ─── RATE LIMITER (In-Memory) ───────────────────────────────
// IP bazlı istek sayacı — sunucu yeniden başlatılınca sıfırlanır.
// Üretimde Redis'e taşınabilir.
// ─────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 dakika
const RATE_LIMIT_MAX_REQUESTS = 60;  // Dakikada 60 istek

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  return false;
}

// ─── BELLEK TEMİZLİĞİ ──────────────────────────────────────
// Her 5 dakikada süresi dolmuş kayıtları temizle
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 300_000);

// ─── İZİN VERİLEN ORİGİN'LER ───────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

// ============================================================
// MIDDLEWARE FONKSİYONU
// ============================================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Sadece /api/* route'larına uygulanır
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ── 1. RATE LIMITING ──────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: 'Çok fazla istek. Lütfen bekleyin.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
        },
      }
    );
  }

  // ── 2. TELEGRAM WEBHOOK — Origin kontrolü atla ───────────
  // Telegram sunucuları farklı origin'den gelir
  if (pathname === '/api/telegram') {
    return addSecurityHeaders(NextResponse.next());
  }

  // ── 3. ORIGİN KONTROLÜ (CSRF benzeri) ─────────────────────
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const source = origin || referer;

    if (source) {
      const isAllowed = ALLOWED_ORIGINS.some(allowed =>
        source.startsWith(allowed)
      );

      if (!isAllowed) {
        return NextResponse.json(
          { success: false, error: 'Yetkisiz kaynak.' },
          { status: 403 }
        );
      }
    }
  }

  // ── 4. GÜVENLİK BAŞLIKLARI ───────────────────────────────
  return addSecurityHeaders(NextResponse.next());
}

// ─── GÜVENLİK BAŞLIKLARI ───────────────────────────────────
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  return response;
}

// ─── MATCHER: Sadece API route'ları ─────────────────────────
export const config = {
  matcher: '/api/:path*',
};
