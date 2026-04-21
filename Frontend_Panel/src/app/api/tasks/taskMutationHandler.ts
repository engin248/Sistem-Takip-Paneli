// ============================================================
// TASK MUTATION HANDLER - POST, PUT, DELETE Handlers
// ============================================================
// CLEAN STUB VERSION
// Frontend only inserts tasks to Supabase.
// Heavy AI analysis and distribution will be done by external
// Planlama_Departmani reading from Supabase.
// ============================================================

import { type NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CreateTaskSchema, UpdateTaskSchema, DeleteTaskSchema, validateInput } from '@/lib/validation';
import { ERR, processError } from '@/lib/errorCore';
import { gorevOnKontrol } from '@/core/ruleGuard';
import { verifyApiAuth } from '@/lib/apiAuth';


export async function handleTaskCreate(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyApiAuth(request);
    if (authError || !user) return NextResponse.json({ success: false, error: authError }, { status: 401 });

    const body = await request.json();
    const { data: payload, errors: valError } = validateInput(CreateTaskSchema, body, { kaynak: 'taskMutationHandler', islem: 'POST_TASK' });
    if (!payload || valError) return NextResponse.json({ success: false, error: 'Validation Error', details: valError }, { status: 400 });

    const task_code = 'TSK-' + Math.floor(Math.random() * 9000 + 1000);

    // ── SİSTEM KURALLARI: Giriş Kontrolü ─────────────────────
    const kuralKontrol = gorevOnKontrol('API_CREATE', 'L1', payload.title);
    if (!kuralKontrol.gecti) {
      return NextResponse.json({
        success: false,
        error: 'Sistem Kuralları İhlali',
        kural_no: kuralKontrol.kural_no,
        aciklama: kuralKontrol.aciklama,
      }, { status: 403 });
    }

    const { data: newTask, error: dbError } = await supabase.from('tasks').insert([{
      task_code,
      title: payload.title,
      description: payload.description,
      priority: payload.priority || 'medium',
      parent_task_id: (payload as any).parent_task_id || null,
      assigned_to: payload.assigned_to || null,
      due_date: payload.due_date || null,
      status: 'beklemede', 
      created_by: user.id
    }]).select().single();

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      message: 'Task added successfully, forwarded to Planning Department.',
      task: newTask,
    });
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, { kaynak: 'taskMutationHandler', islem: 'POST' });
    return NextResponse.json({ success: false, error: 'Error adding task' }, { status: 500 });
  }
}

export async function handleTaskUpdate(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyApiAuth(request);
    if (authError || !user) return NextResponse.json({ success: false, error: authError }, { status: 401 });

    const body = await request.json();
    const { data: payload, errors: valError } = validateInput(UpdateTaskSchema, body, { kaynak: 'taskMutationHandler', islem: 'PUT_TASK' });
    if (!payload || valError) return NextResponse.json({ success: false, error: 'Validation Error' }, { status: 400 });

    // ── SİSTEM KURALLARI: Güncelleme Kontrolü ────────────────
    if ((payload as any).title) {
      const kuralKontrol = gorevOnKontrol('API_UPDATE', 'L1', (payload as any).title);
      if (!kuralKontrol.gecti) {
        return NextResponse.json({
          success: false,
          error: 'Sistem Kuralları İhlali',
          kural_no: kuralKontrol.kural_no,
          aciklama: kuralKontrol.aciklama,
        }, { status: 403 });
      }
    }

    const { id, task_code, ...updateData } = payload as any;
    
    let query = supabase.from('tasks').update({
      ...updateData,
      updated_at: new Date().toISOString()
    });

    if (id) {
      query = query.eq('id', id);
    } else if (task_code) {
      query = query.eq('task_code', task_code.toUpperCase());
    } else {
      return NextResponse.json({ success: false, error: 'Missing ID or task_code' }, { status: 400 });
    }

    const { data: updatedTask, error: dbError } = await query.select().single();

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, { kaynak: 'taskMutationHandler', islem: 'PUT' });
    return NextResponse.json({ success: false, error: 'Update error' }, { status: 500 });
  }
}

export async function handleTaskDelete(request: NextRequest) {
  try {
    const { user, error: authError } = await verifyApiAuth(request);
    if (authError || !user) return NextResponse.json({ success: false, error: authError }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });

    const { data: payload, errors: valError } = validateInput(DeleteTaskSchema, { taskId: id }, { kaynak: 'taskMutationHandler', islem: 'DELETE_TASK' });
    if (!payload || valError) return NextResponse.json({ success: false, error: 'Validation Error', details: valError }, { status: 400 });

    const { error: dbError } = await supabase.from('tasks').delete().eq('id', id);
    if (dbError) throw dbError;
    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, { kaynak: 'taskMutationHandler', islem: 'DELETE' });
    return NextResponse.json({ success: false, error: 'Delete error' }, { status: 500 });
  }
}
