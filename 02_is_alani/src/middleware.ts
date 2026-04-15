// src/middleware.ts
// V-FINAL Middleware — CSRF + Rate Limit (in-memory)

import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/api/telegram/webhook', '/api/health', '/api/bootstrap'];

// ── In-memory Rate Limiter ───────────────────────────────────
// 60 saniyede max 30 istek / IP
const RATE_LIMIT   = 30;
const WINDOW_MS    = 60_000;
const rateMap      = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
    const now  = Date.now();
    const entry = rateMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return true; // OK
    }

    entry.count++;
    if (entry.count > RATE_LIMIT) return false; // Limit aşıldı

    return true;
}

// Bellek temizliği — 5 dakikada bir eski kayıtları sil
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

    // Public paths — auth ve rate limit gerekmez
    if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
        return NextResponse.next();
    }

    // Rate limiting — sadece API rotalarına
    if (path.startsWith('/api/')) {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                ?? req.headers.get('x-real-ip')
                ?? 'unknown';

        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { error: 'ERR-RATE-001: Çok fazla istek — 60s bekleyin' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': '60',
                        'X-RateLimit-Limit':     String(RATE_LIMIT),
                        'X-RateLimit-Remaining': '0',
                    },
                }
            );
        }
    }

    // CSRF Origin kontrolü (write API routes)
    if (path.startsWith('/api/') && req.method !== 'GET') {
        const origin = req.headers.get('origin');
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        if (origin && !origin.startsWith(appUrl) && !origin.includes('localhost')) {
            return NextResponse.json(
                { error: 'CSRF: Origin mismatch' },
                { status: 403 }
            );
        }
    }

    // Auth kontrolü — login sayfası oluşturulana kadar devre dışı
    // const authEnabled = process.env.NEXT_PUBLIC_SUPABASE_AUTH_ENABLED === 'true';

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
