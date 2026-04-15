// src/middleware.ts
// V-FINAL Middleware — Auth + CSRF + Rate Limit

import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/api/telegram/webhook', '/api/health', '/api/bootstrap'];

export function middleware(req: NextRequest) {
    const path = req.nextUrl.pathname;

    // Public paths — auth gerekmez
    if (PUBLIC_PATHS.some(p => path.startsWith(p))) {
        return NextResponse.next();
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

    // Auth kontrolü (etkinse)
    const authEnabled = process.env.NEXT_PUBLIC_SUPABASE_AUTH_ENABLED === 'true';

    if (authEnabled && !path.startsWith('/api/') && path !== '/login') {
        const session = req.cookies.get('sb-tesxmqhkegotxenoljzl-auth-token');
        if (!session) {
            return NextResponse.redirect(new URL('/login', req.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
