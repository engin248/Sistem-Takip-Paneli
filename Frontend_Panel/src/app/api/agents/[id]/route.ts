// ============================================================
// /api/agents/[id] — Yerel-Önce PATCH / DELETE
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { localUpdate, localDelete } from '@/lib/localStore';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const changes: Record<string, unknown> = {};
    const fields = ['status', 'codename', 'tier', 'specialty', 'role', 'rules', 'directives', 'memory', 'last_action', 'health', 'tasks_completed'];
    for (const f of fields) {
      if (body[f] !== undefined) changes[f] = body[f];
    }

    const updated = localUpdate('agents', id, changes);
    if (!updated) {
      return NextResponse.json({ error: `Ajan bulunamadı: ${id}` }, { status: 404 });
    }

    return NextResponse.json({ agent: updated, message: 'Yerel arşiv güncellendi', synced: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = localDelete('agents', id);
    if (!ok) return NextResponse.json({ error: `Ajan bulunamadı: ${id}` }, { status: 404 });
    return NextResponse.json({ message: 'Yerel arşivden silindi' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
