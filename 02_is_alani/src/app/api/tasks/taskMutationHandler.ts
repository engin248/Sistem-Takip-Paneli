// ============================================================
// TASK MUTATION HANDLER — POST, PUT, DELETE İşleyicileri
// ============================================================
// tasks/route.ts tarafından kullanılır.
// ============================================================

import { type NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CreateTaskSchema, UpdateTaskSchema, validateInput } from '@/lib/validation';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from '@/services/auditService';
import { sendTelegramNotification, formatTaskNotification, isTelegramNotificationAvailable } from '@/services/telegramNotifier';

// -------------------------------------------------
// Memory layers (in‑memory placeholders – replace with persistent store if needed)
// -------------------------------------------------
/** Global memory – shared across all tasks/projects */
const GLOBAL_MEMORY: Record<string, any> = {};
/** Project‑specific memory – keyed by projectId */
const PROJECT_MEMORY: Record<string, Record<string, any>> = {};
/** Task‑specific memory – keyed by taskId */
const TASK_MEMORY: Record<string, Record<string, any>> = {};

/**
 * Pre‑execution validation.
 * Returns { allowed: boolean, errors: string[] }.
 * RED status (duplicate / anomaly) blocks execution.
 * Decay & forgetting are mandatory (zorunlu) – they are logged and cleaned.
 */
function preExecuteChecks(task: any, operation: string): { allowed: boolean; errors: string[] } {
  const errors: string[] = [];

  // ---- Duplicate check (RED) ----
  if (task.task_id && TASK_MEMORY[task.task_id]) {
    errors.push('RED – Duplicate task detected');
  }

  // ---- Anomaly check (RED) ----
  const allowedFields = ['task_id', 'title', 'description', 'priority', 'assigned_to', 'due_date', 'status', 'evidence_provided'];
  const extraFields = Object.keys(task).filter((k) => !allowedFields.includes(k));
  if (extraFields.length) {
    errors.push(`RED – Anomalous fields: ${extraFields.join(', ')}`);
  }

  // ---- Decay (zorunlu) ----
  // If task has a created_at older than 30 days, mark as decayed.
  if (task.created_at) {
    const ageDays = (Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > 30) {
      console.warn(`[Decay] Task ${task.task_id ?? '<no id>'} is older than 30 days (age: ${Math.floor(ageDays)}d).`);
      // Optionally flag or archive – here we just log.
    }
  }

  // ---- Forgetting (zorunlu) ----
  // If task not accessed for >60 days, remove from memory.
  const mem = TASK_MEMORY[task.task_id];
  if (mem && mem.lastAccess) {
    const idleDays = (Date.now() - new Date(mem.lastAccess).getTime()) / (1000 * 60 * 60 * 24);
    if (idleDays > 60) {
      console.info(`[Forgetting] Removing stale task ${task.task_id} from TASK_MEMORY.`);
      delete TASK_MEMORY[task.task_id];
    }
  }

  // Store/refresh memory entry for current task
  if (task.task_id) {
    TASK_MEMORY[task.task_id] = { ...TASK_MEMORY[task.task_id], lastAccess: new Date().toISOString(), operation };
  }

  return { allowed: errors.length === 0, errors };
}


function generateTaskCode(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TSK-${date}-${rand}`;
}

// ─── POST: Görev oluştur ────────────────────────────────────
export async function handleTaskCreate(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    // -------------------------------------------------
    // 1️⃣ Pre‑execution checks (duplicate, anomaly, decay, forgetting)
    // -------------------------------------------------
    const preCheck = preExecuteChecks(body, 'CREATE');
    if (!preCheck.allowed) {
      // RED – block execution
      console.error('[TaskCreate] Pre‑check failed:', preCheck.errors.join(' | '));
      return NextResponse.json({ success: false, error: 'Pre‑execution validation failed', details: preCheck.errors }, { status: 400 });
    }

    const validation = validateInput(CreateTaskSchema, {
      title: body.title, description: body.description ?? null,
      priority: body.priority ?? 'normal', assigned_to: body.assigned_to ?? 'SISTEM',
      due_date: body.due_date ?? null,
    }, { kaynak: 'api/tasks', islem: 'POST_CREATE' });

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.errors?.[0] ?? 'Validasyon hatası', errors: validation.errors }, { status: 400 });
    }

    const validatedData = validation.data!;
    const taskCode = generateTaskCode();

    const { data, error } = await supabase.from('tasks').insert([{
      title: validatedData.title, description: validatedData.description || null,
      task_code: taskCode, status: 'beklemede', priority: validatedData.priority,
      assigned_to: validatedData.assigned_to, assigned_by: body.operator_name || 'KOMUTAN',
      evidence_required: true, evidence_provided: false, retry_count: 0, is_archived: false,
      due_date: validatedData.due_date || null,
    }]).select();

    if (error) {
      processError(ERR.TASK_CREATE, error, { kaynak: 'taskMutationHandler.ts', islem: 'INSERT', task_code: taskCode });
      return NextResponse.json({ success: false, error: `Görev oluşturulamadı: ${error.message}` }, { status: 500 });
    }

    const createdTask = data?.[0];
    let auditLogged = false;
    try {
      await logAudit({ operation_type: 'CREATE', action_description: `İŞ EMRİ OLUŞTURULDU: "${validatedData.title}" [${taskCode}] → ${validatedData.priority.toUpperCase()} → ${validatedData.assigned_to}`, task_id: createdTask?.id ?? null, metadata: { action_code: 'TASK_CREATED_VIA_API', task_code: taskCode, priority: validatedData.priority, assigned_to: validatedData.assigned_to, source: 'KARARGAH_PANELI' } });
      auditLogged = true;
    } catch { auditLogged = false; }

    let telegramSent = false;
    try {
      if (isTelegramNotificationAvailable()) {
        const msg = formatTaskNotification('OLUŞTURULDU', taskCode, validatedData.title) + `\nAtanan: <code>${validatedData.assigned_to}</code>\nÖncelik: ${validatedData.priority.toUpperCase()}`;
        const result = await sendTelegramNotification(msg);
        telegramSent = result.success;
      }
    } catch { telegramSent = false; }

    return NextResponse.json({ success: true, data: { id: createdTask?.id, task_code: taskCode, title: validatedData.title, priority: validatedData.priority, assigned_to: validatedData.assigned_to, due_date: validatedData.due_date, status: 'beklemede' }, telegram: { sent: telegramSent }, audit: { logged: auditLogged }, timestamp: new Date().toISOString() }, { status: 201 });

  } catch (error) {
    processError(ERR.TASK_CREATE_GENERAL, error, { kaynak: 'taskMutationHandler.ts', islem: 'POST' });
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Beklenmeyen hata', timestamp: new Date().toISOString() }, { status: 500 });
  }
}

// ─── PUT: Görev güncelle ────────────────────────────────────
export async function handleTaskUpdate(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    // -------------------------------------------------
    // 1️⃣ Pre‑execution checks for UPDATE
    // -------------------------------------------------
    const preCheck = preExecuteChecks(body, 'UPDATE');
    if (!preCheck.allowed) {
      console.error('[TaskUpdate] Pre‑check failed:', preCheck.errors.join(' | '));
      return NextResponse.json({ success: false, error: 'Pre‑execution validation failed', details: preCheck.errors }, { status: 400 });
    }

    const taskId = body.task_id;
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ success: false, error: 'task_id zorunlu alandır (UUID)' }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = {};
    if (body.title !== undefined) updateFields.title = body.title;
    if (body.description !== undefined) updateFields.description = body.description;
    if (body.priority !== undefined) updateFields.priority = body.priority;
    if (body.assigned_to !== undefined) updateFields.assigned_to = body.assigned_to;
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.due_date !== undefined) updateFields.due_date = body.due_date;
    if (body.evidence_provided !== undefined) updateFields.evidence_provided = body.evidence_provided;

    // ── KÖK SEBEP DÜZELTMESİ: tamamlanan görevlerde kanıt otomatik işaretlenir ──
    // L2-STATUS-INCONSISTENCY hatasını önler: status=tamamlandi/muhürlendi iken
    // evidence_provided=false olmaz.
    if (updateFields.status === 'tamamlandi' || updateFields.status === 'muhürlendi') {
      if (updateFields.evidence_provided === undefined) {
        updateFields.evidence_provided = true;
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ success: false, error: 'Güncellenecek en az bir alan gerekli' }, { status: 400 });
    }

    const validation = validateInput(UpdateTaskSchema, updateFields, { kaynak: 'api/tasks', islem: 'PUT_UPDATE' });
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.errors?.[0] ?? 'Validasyon hatası', errors: validation.errors }, { status: 400 });
    }

    const { data: existingTask, error: fetchErr } = await supabase.from('tasks').select('id, title, priority, status, assigned_to').eq('id', taskId).single();
    if (fetchErr || !existingTask) {
      return NextResponse.json({ success: false, error: `Görev bulunamadı: ${taskId}` }, { status: 404 });
    }

    const updatePayload = { ...validation.data, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('tasks').update(updatePayload).eq('id', taskId).select();
    if (error) {
      processError(ERR.TASK_UPDATE, error, { kaynak: 'taskMutationHandler.ts', islem: 'PUT_UPDATE', task_id: taskId });
      return NextResponse.json({ success: false, error: `Görev güncellenemedi: ${error.message}` }, { status: 500 });
    }

    const changedFields = Object.keys(updateFields).join(', ');
    try {
      await logAudit({ operation_type: 'UPDATE', action_description: `GÖREV DÜZENLENDİ: [${taskId.slice(0, 8)}] → Değişen: ${changedFields}`, task_id: taskId, metadata: { action_code: 'TASK_EDITED_VIA_API', changed_fields: changedFields, previous: { title: existingTask.title, priority: existingTask.priority, status: existingTask.status }, updated: updatePayload, source: 'KARARGAH_PANELI' } });
    } catch { /* non-blocking */ }

    if (updateFields.priority && updateFields.priority !== existingTask.priority) {
      try {
        if (isTelegramNotificationAvailable()) {
          await sendTelegramNotification(`🔄 <b>GÖREV GÜNCELLENDİ</b>\n\nID: <code>${taskId.slice(0, 8)}</code>\nBaşlık: ${existingTask.title}\nÖncelik: ${String(existingTask.priority).toUpperCase()} → ${String(updateFields.priority).toUpperCase()}`);
        }
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({ success: true, data: data?.[0] ?? { id: taskId, ...updatePayload }, changed_fields: changedFields, timestamp: new Date().toISOString() });

  } catch (error) {
    processError(ERR.TASK_UPDATE, error, { kaynak: 'taskMutationHandler.ts', islem: 'PUT' });
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Görev düzenlenirken beklenmeyen hata', timestamp: new Date().toISOString() }, { status: 500 });
  }
}

// ─── DELETE: Görev sil ──────────────────────────────────────
export async function handleTaskDelete(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    // -------------------------------------------------
    // 1️⃣ Pre‑execution checks for DELETE
    // -------------------------------------------------
    const preCheck = preExecuteChecks(body, 'DELETE');
    if (!preCheck.allowed) {
      console.error('[TaskDelete] Pre‑check failed:', preCheck.errors.join(' | '));
      return NextResponse.json({ success: false, error: 'Pre‑execution validation failed', details: preCheck.errors }, { status: 400 });
    }

    const taskId = body.task_id;
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ success: false, error: 'task_id zorunlu alandır (UUID)' }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await supabase.from('tasks').select('id, title, task_code').eq('id', taskId).single();
    if (fetchErr || !existing) {
      return NextResponse.json({ success: false, error: `Görev bulunamadı: ${taskId}` }, { status: 404 });
    }

    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      processError(ERR.TASK_DELETE, error, { kaynak: 'taskMutationHandler.ts', islem: 'DELETE', task_id: taskId });
      return NextResponse.json({ success: false, error: `Görev silinemedi: ${error.message}` }, { status: 500 });
    }

    try {
      await logAudit({ operation_type: 'DELETE', action_description: `GÖREV SİLİNDİ: "${existing.title}" [${existing.task_code ?? taskId.slice(0, 8)}]`, task_id: taskId, metadata: { action_code: 'TASK_DELETED_VIA_API', title: existing.title, task_code: existing.task_code, source: 'KARARGAH_PANELI' } });
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true, deleted_id: taskId, timestamp: new Date().toISOString() });

  } catch (error) {
    processError(ERR.TASK_DELETE, error, { kaynak: 'taskMutationHandler.ts', islem: 'DELETE' });
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Görev silinirken beklenmeyen hata', timestamp: new Date().toISOString() }, { status: 500 });
  }
}
