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
import { CreateTaskSchema, validateInput } from '@/lib/validation';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from '@/services/auditService';
import { analyzeLocalPriority } from '@/services/aiManager';
import { agentRegistry } from '@/services/agentRegistry';
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

      default:
        return NextResponse.json({
          success: false,
          error: 'Geçerli action parametresi gerekli: agents | suggest',
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
