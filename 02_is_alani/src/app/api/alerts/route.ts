// src/app/api/alerts/route.ts
// GET  /api/alerts?limit=20         — aktif alarmlar listesi
// PATCH /api/alerts { alertId }     — alarm çözme

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET — aktif alarmları getir
export async function GET(req: NextRequest) {
    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 20), 100);

    try {
        const { data, error } = await supabase
            .from('alerts')
            .select('id, severity, rule_triggered, fail_level, module, details, created_at, resolved')
            .order('severity', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            return NextResponse.json({ error: error.message, alerts: [] }, { status: 500 });
        }

        return NextResponse.json({ alerts: data ?? [], total: data?.length ?? 0 });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
        return NextResponse.json({ error: msg, alerts: [] }, { status: 500 });
    }
}

// PATCH — alarm çöz
export async function PATCH(req: NextRequest) {
    try {
        const { alertId } = await req.json();

        if (!alertId) {
            return NextResponse.json({ error: 'alertId zorunlu' }, { status: 400 });
        }

        const { error } = await supabase
            .from('alerts')
            .update({ resolved: true, resolved_at: new Date().toISOString() })
            .eq('id', alertId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, alertId });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
