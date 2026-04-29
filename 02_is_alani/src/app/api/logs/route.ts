// src/app/api/logs/route.ts
// GET /api/logs — immutable_logs tablosunu sorgular
// Query params: module, severity, limit, offset

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const module   = searchParams.get('module')   || '';
    const severity = searchParams.get('severity') || '';
    const limit    = Math.min(Number(searchParams.get('limit')  || 50), 200);
    const offset   = Math.max(Number(searchParams.get('offset') || 0),  0);

    try {
        let query = supabase
            .from('immutable_logs')
            .select('id, module, event_type, severity, payload, hash, created_at', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (module)   query = query.eq('module', module);
        if (severity) query = query.eq('severity', severity);

        const { data, count, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ logs: data ?? [], total: count ?? 0 });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
        return NextResponse.json({ error: msg, logs: [], total: 0 }, { status: 500 });
    }
}
