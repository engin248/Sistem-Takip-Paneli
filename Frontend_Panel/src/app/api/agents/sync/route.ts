// ============================================================
// /api/agents/sync — Supabase Arşiv Senkronizasyon Endpoint
// ============================================================
// Bu endpoint SADECE kullanıcı istediğinde çağrılır.
// Yerel data/agents.json → Supabase arşiv
//
// GET  → Sync durumunu göster (kaç kayıt bekliyor)
// POST → Supabase'e gönder (belirtilen tablo veya hepsi)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSyncStatus, syncToSupabase } from '@/lib/localStore';

export async function GET() {
  try {
    const status = getSyncStatus();
    const total = Object.values(status.pending).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      pending: status.pending,
      total_pending: total,
      last_sync: status.lastSync,
      message: total === 0
        ? 'Tüm veriler Supabase ile senkronize'
        : `${total} kayıt Supabase\'e gönderilmeyi bekliyor`,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const table = body.table as 'agents' | 'tasks' | 'audit_logs' | undefined;

    console.log(`[SYNC] Supabase arşivleme başladı${table ? ` — tablo: ${table}` : ' — tüm tablolar'}...`);

    const result = await syncToSupabase(table);

    return NextResponse.json({
      success: result.failed === 0,
      synced: result.synced,
      failed: result.failed,
      details: result.details,
      message: result.failed === 0
        ? `✅ ${result.synced} kayıt Supabase\'e arşivlendi`
        : `⚠️ ${result.synced} başarılı, ${result.failed} başarısız`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[SYNC] Hata:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
