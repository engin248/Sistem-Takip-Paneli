// ============================================================
// /api/agents/[id] — Ajan PATCH/DELETE
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status !== undefined) updateData.status = body.status;
    if (body.codename !== undefined) updateData.codename = body.codename;
    if (body.tier !== undefined) updateData.tier = body.tier;
    if (body.specialty !== undefined) updateData.specialty = body.specialty;
    if (body.role !== undefined) updateData.role = body.role;
    if (body.rules !== undefined) updateData.rules = body.rules;
    if (body.directives !== undefined) updateData.directives = body.directives;
    if (body.memory !== undefined) updateData.memory = body.memory;
    if (body.last_action !== undefined) updateData.last_action = body.last_action;
    if (body.health !== undefined) updateData.health = body.health;
    if (body.tasks_completed !== undefined) updateData.tasks_completed = body.tasks_completed;

    const { data, error } = await supabase
      .from('agents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ agent: data, message: 'Güncellendi' });
  } catch (err: any) {
    console.error('[API/agents PATCH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ message: 'Ajan silindi' });
  } catch (err: any) {
    console.error('[API/agents DELETE]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
