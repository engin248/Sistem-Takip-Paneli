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
//   Bkz: https://nextjs.org/docs/messages/middleware-to-proxy
//
// Görevler:
//   1. MUHAFIZ — Localhost guard (dev modda dış ağ erişimini engeller)
//   2. API rate limiting (Map + TTL)
//   3. CSRF benzeri origin kontrolü
//   4. Güvenlik başlıkları ekleme
//
// Hata Kodları:
//   ERR-STP001-MUHAFIZ-001 — Dış ağ erişim engeli
//   ERR-STP001-001         — Genel sistem hatası
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

// ─── MUHAFIZ: Localhost Guard ────────────────────────────────
// Dev modda sadece localhost (127.0.0.1) kaynaklı isteklere
// izin verir. Dış ağ isteklerini 403 ile reddeder.
// Production'da Vercel platformu kendi güvenliğini sağlar.
// ─────────────────────────────────────────────────────────────

const ALLOWED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
]);

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

  // ── 0. MUHAFIZ: LOCALHOST GUARD (Dev Only) ─────────────────
  // Production'da devre dışı — Vercel platformu korur
  if (process.env.NODE_ENV !== 'production') {
    const host = request.headers.get('host')?.split(':')[0] ?? '';
    const forwardedFor = request.headers.get('x-forwarded-for');

    if (!ALLOWED_HOSTS.has(host)) {
      console.error(
        `[ERR-STP001-MUHAFIZ-001] 🛡️ DIŞ AĞ ERİŞİMİ ENGELLENDİ!\n` +
        `  Host: ${host}\n` +
        `  X-Forwarded-For: ${forwardedFor ?? 'yok'}\n` +
        `  URL: ${pathname}\n` +
        `  Method: ${request.method}\n` +
        `  ⚠️ GÜVENLİ MOD AKTİF — İstek reddedildi.`
      );

      return new NextResponse(
        JSON.stringify({
          hata: 'Erişim engellendi. Bu sistem yalnızca localhost üzerinden çalışır.',
          hata_kodu: 'ERR-STP001-MUHAFIZ-001',
          mod: 'GÜVENLİ MOD',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'X-Muhafiz-Status': 'BLOCKED',
          },
        }
      );
    }
  }

  // Statik dosyalar için güvenlik başlığı ekleyip geç
  if (!pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('X-Muhafiz-Status', 'PASSED');
    return response;
  }

  // ── 1. RATE LIMITING (Sadece /api/* ) ──────────────────────
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
  response.headers.set('X-Muhafiz-Status', 'PASSED');
  return response;
}

// ─── MATCHER: Tüm route'lar (statik dosyalar hariç) ────────
// ⚠️ middleware.ts'den taşınan geniş matcher:
//   Hem sayfa hem API route'larını kapsar
//   Statik dosyalar (_next/static, _next/image, favicon.ico) hariç
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
