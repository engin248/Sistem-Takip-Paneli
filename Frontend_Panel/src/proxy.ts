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

export async function proxy(request: NextRequest) {
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

    // ══════════════════════════════════════════════════════════
    // SİSTEM KURALLARI — MERKEZİ BODY FİLTRESİ
    // ══════════════════════════════════════════════════════════
    // Bu blok TÜM POST/PUT/PATCH/DELETE isteklerini yakalar.
    // Hangi endpoint olursa olsun, kural denetimi buradan geçer.
    // ══════════════════════════════════════════════════════════
    try {
      const clonedReq = request.clone();
      const bodyText = await clonedReq.text();
      if (bodyText && bodyText.length > 0) {
        const kontrolSonuc = sistemKurallariKontrol(bodyText);
        if (!kontrolSonuc.gecti) {
          return NextResponse.json(
            {
              success: false,
              error: 'Sistem Kuralları İhlali',
              kural_no: kontrolSonuc.kural_no,
              kural: kontrolSonuc.kural,
              aciklama: kontrolSonuc.aciklama,
              endpoint: pathname,
            },
            { status: 403 }
          );
        }
      }
    } catch {
      // Body okunamazsa geç
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

// ══════════════════════════════════════════════════════════════
// SİSTEM KURALLARI — EDGE RUNTIME UYUMLU KONTROL MOTORU
// ══════════════════════════════════════════════════════════════
// Bu fonksiyon proxy.ts içinde inline tanımlıdır çünkü
// Edge Runtime Node.js modüllerini (fs, path, require) kullanamaz.
// Aynı kurallar shared/sistemKurallari.js ile senkrondur.
// ══════════════════════════════════════════════════════════════

const SK_TEHLIKELI = ['rm -rf', 'drop table', 'delete --force', 'truncate', 'chmod 777', 'sudo'];
const SK_KORUNAN   = ['.env.local', '.env', '.env.production', 'supabase.ts', 'authservice.ts', 'middleware.ts'];
const SK_SQL       = /('|--|union\s+select|or\s+1\s*=\s*1)/i;
const SK_XSS       = /<script|onerror|javascript:/i;
const SK_PROMPT    = /ignore.*previous|forget.*instructions|system.*prompt/i;

function sistemKurallariKontrol(metin: string): { gecti: boolean; aciklama: string; kural_no: string; kural: string } {
  const lower = metin.toLowerCase();

  for (const k of SK_TEHLIKELI) {
    if (lower.includes(k)) return { gecti: false, aciklama: `Tehlikeli komut tespit edildi: ${k}`, kural_no: 'K-001', kural: 'ZARAR VERME — Yıkıcı işlem yapma. Önce zarar verme.' };
  }
  for (const d of SK_KORUNAN) {
    if (lower.includes(d)) return { gecti: false, aciklama: `Korunan dosya hedeflendi: ${d}`, kural_no: 'K-002', kural: 'TEMELİ KORU — Kritik altyapıya izinsiz dokunma.' };
  }
  if (SK_SQL.test(metin))    return { gecti: false, aciklama: 'SQL injection girişimi tespit edildi', kural_no: 'K-003', kural: 'SALDIRIYI ENGELLE — Zararlı girdiyi filtrele.' };
  if (SK_XSS.test(metin))    return { gecti: false, aciklama: 'XSS girişimi tespit edildi', kural_no: 'K-003', kural: 'SALDIRIYI ENGELLE — Zararlı girdiyi filtrele.' };
  if (SK_PROMPT.test(metin))  return { gecti: false, aciklama: 'Prompt injection girişimi tespit edildi', kural_no: 'K-003', kural: 'SALDIRIYI ENGELLE — Zararlı girdiyi filtrele.' };

  return { gecti: true, aciklama: '', kural_no: '', kural: '' };
}
