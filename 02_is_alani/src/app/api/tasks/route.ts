// ============================================================
// TASKS API ROUTE — İş Emri Yönetim Endpoint'i
// ============================================================
// İş Emri: EM-ALFA-05
// GET  → Ajan listesi + AI öncelik önerisi
// POST → Yeni iş emri oluştur (validasyon + audit + telegram)
//
// CLIENT/SERVER SINIRI:
//   Bu dosya SERVER-SIDE'da çalışır.
//   Client (TaskForm.tsx) bu endpoint'e fetch() ile erişir.
//   Server-only modüller (agentRegistry, telegramNotifier,
//   aiManager) burada güvenle import edilir.
//
// Hata Kodları:
//   ERR-STP001-010 → Görev oluşturma hatası
//   ERR-STP001-011 → Görev oluşturma genel hatası
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CreateTaskSchema, UpdateTaskSchema, validateInput } from '@/lib/validation';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from '@/services/auditService';
import { analyzeLocalPriority } from '@/services/aiManager';
import { agentRegistry } from '@/services/agentRegistry';
import { analyzeKapasite } from '@/services/agentCloner';
import {
  sendTelegramNotification,
  formatTaskNotification,
  isTelegramNotificationAvailable,
} from '@/services/telegramNotifier';

// ─── GÖREV KODU ÜRETİCİ ────────────────────────────────────
function generateTaskCode(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TSK-${date}-${rand}`;
}

// ============================================================
// GET: Ajan listesi + AI öncelik önerisi
// ============================================================
// ?action=agents  → Aktif ajan kadrosu
// ?action=suggest&title=xxx → AI öncelik tahmini
// ============================================================

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      // ── GÖREV LİSTESİ (DB'DEN) ──────────────────────────────
      // ?action=list
      // ?action=list&priority=kritik
      // ?action=list&status=beklemede
      // ?action=list&limit=10
      case 'list': {
        const limitParam = url.searchParams.get('limit');
        const priorityParam = url.searchParams.get('priority');
        const statusParam = url.searchParams.get('status');
        const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50;

        let query = supabase
          .from('tasks')
          .select('id, task_code, title, description, status, priority, assigned_to, assigned_by, due_date, created_at, updated_at')
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (priorityParam) query = query.eq('priority', priorityParam);
        if (statusParam) query = query.eq('status', statusParam);

        const { data, error } = await query;

        if (error) {
          processError(ERR.TASK_FETCH, error, { kaynak: 'api/tasks/route.ts', islem: 'LIST' });
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          data: data ?? [],
          count: data?.length ?? 0,
          timestamp: new Date().toISOString(),
        });
      }

      // ── AJAN LİSTESİ ────────────────────────────────────────
      case 'agents': {
        const allAgents = agentRegistry.getAll();
        const agentList = allAgents.map(a => ({
          kod_adi: a.kod_adi,
          rol: a.rol,
          katman: a.katman,
          durum: a.durum,
          beceri_listesi: a.beceri_listesi,
        }));

        return NextResponse.json({
          success: true,
          data: agentList,
          count: agentList.length,
          timestamp: new Date().toISOString(),
        });
      }

      // ── AI ÖNCELİK ÖNERİSİ ─────────────────────────────────
      // ENTEGRASYON: AI — EKİP-CHARLIE buraya yazar
      case 'suggest': {
        const title = url.searchParams.get('title');
        if (!title || title.length < 3) {
          return NextResponse.json({
            success: false,
            error: 'title parametresi en az 3 karakter olmalı',
          }, { status: 400 });
        }

        const result = analyzeLocalPriority(title);
        return NextResponse.json({
          success: true,
          data: {
            priority: result.priority,
            confidence: result.confidence,
            reasoning: result.reasoning,
            detectedKeywords: result.detectedKeywords,
            source: result.source,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // ── OTOMATİK AJAN ATAMA ─────────────────────────────────
      // ?action=auto-assign&title=xxx → En uygun ajanı öner
      case 'auto-assign': {
        const taskTitle = url.searchParams.get('title');
        if (!taskTitle || taskTitle.length < 3) {
          return NextResponse.json({
            success: false,
            error: 'title parametresi en az 3 karakter olmalı',
          }, { status: 400 });
        }

        // Görev başlığından anahtar kelimeler çıkar
        const keywords = taskTitle.toLowerCase().split(/[\s,._-]+/).filter(k => k.length > 2);
        const gorevTipi = keywords.join('_');

        const analiz = analyzeKapasite(gorevTipi);

        if (analiz.kapasiteVar && analiz.uygunAjanlar.length > 0) {
          return NextResponse.json({
            success: true,
            data: {
              recommended_agent: analiz.uygunAjanlar[0]!.kod_adi,
              all_capable: analiz.uygunAjanlar.map(a => ({
                kod_adi: a.kod_adi,
                rol: a.rol,
              })),
              method: 'DIRECT_MATCH',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Kapasite yok — en yakın öner
        return NextResponse.json({
          success: true,
          data: {
            recommended_agent: analiz.klonKaynagi?.kod_adi ?? 'SISTEM',
            all_capable: [],
            method: analiz.onerilenYol ?? 'FALLBACK',
            gap_analysis: {
              gorev_tipi: gorevTipi,
              klon_kaynagi: analiz.klonKaynagi?.kod_adi ?? null,
            },
          },
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Geçerli action parametresi gerekli: list | agents | suggest | auto-assign',
        }, { status: 400 });
    }
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, {
      kaynak: 'api/tasks/route.ts',
      islem: 'GET',
      action,
    });

    return NextResponse.json({
      success: false,
      error: 'İstek işlenirken hata oluştu',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// ============================================================
// POST: Yeni iş emri oluştur
// ============================================================
// Request Body:
//   title       → string (zorunlu, min 3)
//   description → string | null
//   priority    → kritik | yuksek | normal | dusuk
//   assigned_to → string (ajan kodu veya kişi adı)
//   due_date    → ISO 8601 string | null
//
// Response:
//   success, data (id + task_code), telegram, audit
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── 1. ZOD VALİDASYON (G-0 Giriş Filtresi) ─────────────
    const validation = validateInput(CreateTaskSchema, {
      title: body.title,
      description: body.description ?? null,
      priority: body.priority ?? 'normal',
      assigned_to: body.assigned_to ?? 'SISTEM',
      due_date: body.due_date ?? null,
    }, { kaynak: 'api/tasks', islem: 'POST_CREATE' });

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: validation.errors?.[0] ?? 'Validasyon hatası',
        errors: validation.errors,
      }, { status: 400 });
    }

    const validatedData = validation.data!;
    const taskCode = generateTaskCode();

    // ── 2. SUPABASE INSERT ──────────────────────────────────
    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        title: validatedData.title,
        description: validatedData.description || null,
        task_code: taskCode,
        status: 'beklemede',
        priority: validatedData.priority,
        assigned_to: validatedData.assigned_to,
        assigned_by: body.operator_name || 'KOMUTAN',
        evidence_required: true,
        evidence_provided: false,
        retry_count: 0,
        is_archived: false,
        due_date: validatedData.due_date || null,
      }])
      .select();

    if (error) {
      processError(ERR.TASK_CREATE, error, {
        kaynak: 'api/tasks/route.ts',
        islem: 'INSERT',
        task_code: taskCode,
      });

      return NextResponse.json({
        success: false,
        error: `Görev oluşturulamadı: ${error.message}`,
      }, { status: 500 });
    }

    const createdTask = data?.[0];

    // ── 3. AUDİT LOG ────────────────────────────────────────
    let auditLogged = false;
    try {
      await logAudit({
        operation_type: 'CREATE',
        action_description: `İŞ EMRİ OLUŞTURULDU: "${validatedData.title}" [${taskCode}] → ${validatedData.priority.toUpperCase()} → ${validatedData.assigned_to}`,
        task_id: createdTask?.id ?? null,
        metadata: {
          action_code: 'TASK_CREATED_VIA_API',
          title: validatedData.title,
          task_code: taskCode,
          priority: validatedData.priority,
          assigned_to: validatedData.assigned_to,
          due_date: validatedData.due_date || null,
          source: 'KARARGAH_PANELI',
        },
      });
      auditLogged = true;
    } catch {
      auditLogged = false;
    }

    // ── 4. TELEGRAM BİLDİRİM ────────────────────────────────
    // ENTEGRASYON: TELEGRAM — EKİP-CHARLIE
    let telegramSent = false;
    try {
      if (isTelegramNotificationAvailable()) {
        const dueDateStr = validatedData.due_date
          ? `\nSon Tarih: ${new Date(validatedData.due_date).toLocaleDateString('tr-TR')}`
          : '';
        const msg = formatTaskNotification('OLUŞTURULDU', taskCode, validatedData.title)
          + `\nAtanan: <code>${validatedData.assigned_to}</code>`
          + `\nÖncelik: ${validatedData.priority.toUpperCase()}`
          + dueDateStr;
        const result = await sendTelegramNotification(msg);
        telegramSent = result.success;
      }
    } catch {
      telegramSent = false;
    }

    // ── 5. BAŞARILI YANIT ───────────────────────────────────
    return NextResponse.json({
      success: true,
      data: {
        id: createdTask?.id,
        task_code: taskCode,
        title: validatedData.title,
        priority: validatedData.priority,
        assigned_to: validatedData.assigned_to,
        due_date: validatedData.due_date,
        status: 'beklemede',
      },
      telegram: { sent: telegramSent },
      audit: { logged: auditLogged },
      timestamp: new Date().toISOString(),
    }, { status: 201 });

  } catch (error) {
    processError(ERR.TASK_CREATE_GENERAL, error, {
      kaynak: 'api/tasks/route.ts',
      islem: 'POST',
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'İş emri oluşturulurken beklenmeyen hata',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// ============================================================
// PUT: Görev düzenleme (kısmi güncelleme)
// ============================================================
// Request Body:
//   task_id     → UUID (zorunlu)
//   title       → string (opsiyonel)
//   description → string | null (opsiyonel)
//   priority    → kritik | yuksek | normal | dusuk (opsiyonel)
//   assigned_to → string (opsiyonel)
//   status      → beklemede | devam_ediyor | ... (opsiyonel)
//   due_date    → ISO 8601 | null (opsiyonel)
//
// Response:
//   success, data (güncellenen alanlar), audit
// ============================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // ── 1. task_id KONTROLÜ ─────────────────────────────────
    const taskId = body.task_id;
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'task_id zorunlu alandır (UUID)',
      }, { status: 400 });
    }

    // ── 2. ZOD VALİDASYON (G-0 Giriş Filtresi) ─────────────
    const updateFields: Record<string, unknown> = {};
    if (body.title !== undefined) updateFields.title = body.title;
    if (body.description !== undefined) updateFields.description = body.description;
    if (body.priority !== undefined) updateFields.priority = body.priority;
    if (body.assigned_to !== undefined) updateFields.assigned_to = body.assigned_to;
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.due_date !== undefined) updateFields.due_date = body.due_date;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Güncellenecek en az bir alan gerekli (title, description, priority, assigned_to, status, due_date)',
      }, { status: 400 });
    }

    const validation = validateInput(UpdateTaskSchema, updateFields, {
      kaynak: 'api/tasks',
      islem: 'PUT_UPDATE',
    });

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: validation.errors?.[0] ?? 'Validasyon hatası',
        errors: validation.errors,
      }, { status: 400 });
    }

    // ── 3. MEVCUT GÖREVİ DOĞRULA ───────────────────────────
    const { data: existingTask, error: fetchErr } = await supabase
      .from('tasks')
      .select('id, title, priority, status, assigned_to')
      .eq('id', taskId)
      .single();

    if (fetchErr || !existingTask) {
      return NextResponse.json({
        success: false,
        error: `Görev bulunamadı: ${taskId}`,
      }, { status: 404 });
    }

    // ── 4. SUPABASE UPDATE ──────────────────────────────────
    const updatePayload = {
      ...validation.data,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId)
      .select();

    if (error) {
      processError(ERR.TASK_UPDATE, error, {
        kaynak: 'api/tasks/route.ts',
        islem: 'PUT_UPDATE',
        task_id: taskId,
      });

      return NextResponse.json({
        success: false,
        error: `Görev güncellenemedi: ${error.message}`,
      }, { status: 500 });
    }

    // ── 5. AUDİT LOG ────────────────────────────────────────
    const changedFields = Object.keys(updateFields).join(', ');
    try {
      await logAudit({
        operation_type: 'UPDATE',
        action_description: `GÖREV DÜZENLENDİ: [${taskId.slice(0, 8)}] → Değişen: ${changedFields}`,
        task_id: taskId,
        metadata: {
          action_code: 'TASK_EDITED_VIA_API',
          changed_fields: changedFields,
          previous: {
            title: existingTask.title,
            priority: existingTask.priority,
            status: existingTask.status,
            assigned_to: existingTask.assigned_to,
          },
          updated: updatePayload,
          source: 'KARARGAH_PANELI',
        },
      });
    } catch {
      // Audit hatası — processError zaten logluyor
    }

    // ── 6. TELEGRAM BİLDİRİM (Öncelik değişikliğinde) ──────
    if (updateFields.priority && updateFields.priority !== existingTask.priority) {
      try {
        if (isTelegramNotificationAvailable()) {
          const msg = `🔄 <b>GÖREV GÜNCELLENDİ</b>\n\nID: <code>${taskId.slice(0, 8)}</code>\nBaşlık: ${existingTask.title}\nÖncelik: ${String(existingTask.priority).toUpperCase()} → ${String(updateFields.priority).toUpperCase()}`;
          await sendTelegramNotification(msg);
        }
      } catch {
        // Telegram hatası — kritik değil
      }
    }

    // ── 7. BAŞARILI YANIT ───────────────────────────────────
    return NextResponse.json({
      success: true,
      data: data?.[0] ?? { id: taskId, ...updatePayload },
      changed_fields: changedFields,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    processError(ERR.TASK_UPDATE, error, {
      kaynak: 'api/tasks/route.ts',
      islem: 'PUT',
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Görev düzenlenirken beklenmeyen hata',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

// ============================================================
// DELETE: Görev silme
// ============================================================
// Request Body:
//   task_id → UUID (zorunlu)
//
// Response:
//   success, deleted_id, audit
// ============================================================

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    const taskId = body.task_id;
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'task_id zorunlu alandır (UUID)',
      }, { status: 400 });
    }

    // ── 1. Görev varlığını doğrula ────────────────────────
    const { data: existing, error: fetchErr } = await supabase
      .from('tasks')
      .select('id, title, task_code')
      .eq('id', taskId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({
        success: false,
        error: `Görev bulunamadı: ${taskId}`,
      }, { status: 404 });
    }

    // ── 2. Sil ──────────────────────────────────────────────
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      processError(ERR.TASK_DELETE, error, {
        kaynak: 'api/tasks/route.ts',
        islem: 'DELETE',
        task_id: taskId,
      });

      return NextResponse.json({
        success: false,
        error: `Görev silinemedi: ${error.message}`,
      }, { status: 500 });
    }

    // ── 3. Audit log ────────────────────────────────────────
    try {
      await logAudit({
        operation_type: 'DELETE',
        action_description: `GÖREV SİLİNDİ: "${existing.title}" [${existing.task_code ?? taskId.slice(0, 8)}]`,
        task_id: taskId,
        metadata: {
          action_code: 'TASK_DELETED_VIA_API',
          title: existing.title,
          task_code: existing.task_code,
          source: 'KARARGAH_PANELI',
        },
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      deleted_id: taskId,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    processError(ERR.TASK_DELETE, error, {
      kaynak: 'api/tasks/route.ts',
      islem: 'DELETE',
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Görev silinirken beklenmeyen hata',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
