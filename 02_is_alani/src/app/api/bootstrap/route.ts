// src/app/api/bootstrap/route.ts
// GET /api/bootstrap — Sistem sağlık kontrolü

import { NextResponse } from 'next/server';
import { runBootstrap } from '@/core/bootstrap';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const result = await runBootstrap();

        const statusCode = result.status === 'READY'    ? 200 :
                           result.status === 'DEGRADED' ? 206 : 503;

        return NextResponse.json(result, { status: statusCode });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bootstrap hatası';
        return NextResponse.json(
            { status: 'FATAL', error: msg },
            { status: 500 }
        );
    }
}
