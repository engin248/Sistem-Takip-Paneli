// ============================================================
// NEXT.JS 16+ PROXY — API KORUMA KATMANI
// ============================================================
// Next.js 16'dan itibaren middleware convention deprecated oldu.
// Bu dosya proxy convention'ı olarak çalışır.
//
// Görevler:
//   1. API route'larına rate limiting (Map + TTL)
//   2. CSRF benzeri origin kontrolü
//   3. Güvenlik başlıkları ekleme
//
// Kapsam: /api/* route'ları
// Hata Kodu: ERR-STP001-001 (genel sistem)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

// ─── RATE LIMITER (In-Memory Map + TTL) ─────────────────────
// IP bazlı istek sayacı — sunucu yeniden başlatılınca sıfırlanır.
// Üretimde Redis/Upstash'e taşınabilir.
// Map TTL: Her istek sırasında süresi dolmuş kayıtlar temizlenir.
// setInterval kullanılmaz — Edge runtime uyumlu.
// ─────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 dakika
const RATE_LIMIT_MAX_REQUESTS = 60;  // Dakikada 60 istek
const CLEANUP_THRESHOLD = 500;       // 500+ kayıtta otomatik temizlik

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  // Lazy cleanup — Map çok büyürse süresi dolmuşları temizle
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
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

// ─── MATCHER: Sadece API route'ları ─────────────────────────
export const config = {
  matcher: '/api/:path*',
};
