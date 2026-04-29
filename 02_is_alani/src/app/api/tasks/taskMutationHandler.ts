// ============================================================
// TASK MUTATION HANDLER â€” POST, PUT, DELETE Ä°ÅŸleyicileri
// ============================================================
// tasks/route.ts tarafÄ±ndan kullanÄ±lÄ±r.
// ============================================================

import { type NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CreateTaskSchema, UpdateTaskSchema, validateInput } from '@/lib/validation';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from '@/services/auditService';
import { sendTelegramNotification, formatTaskNotification, isTelegramNotificationAvailable } from '@/services/telegramNotifier';
import { AnlamaMotoruService } from '@/core/services/AnlamaMotoruService';
import { SimulationGovernorService } from '@/core/services/SimulationGovernorService';
import { TaskContractService } from '@/core/services/TaskContractService';
import { ShadowAuditorService } from '@/core/services/ShadowAuditorService';
import { StateMachineGuard } from '@/core/services/StateMachineGuard';
import { aiComplete } from '@/lib/aiProvider';
import { orkestrat } from '@/core/orchestrator';

/**
 * Preâ€‘execution validation.
 * Returns { allowed: boolean, errors: string[] }.
 * RED status blocks execution.
 */
function preExecuteChecks(task: any, operation: string): { allowed: boolean; errors: string[] } {
  const errors: string[] = [];

  // ---- Anomaly check (RED) ----
  const allowedFields = ['task_id', 'title', 'description', 'priority', 'assigned_to', 'due_date', 'status', 'evidence_provided', 'operator_name'];
  const extraFields = Object.keys(task).filter((k) => !allowedFields.includes(k));
  if (extraFields.length) {
    errors.push(`RED â€“ Anomalous fields: ${extraFields.join(', ')}`);
  }

  // Decay & Forgetting (Stateful memory) is moved to DB level/CRON logic to prevent OOM and Stateless pollution


  return { allowed: errors.length === 0, errors };
}

/**
 * Ensures strict server-side authentication using Bearer Token via Supabase Auth
 */
async function verifyApiAuth(request: NextRequest): Promise<{ user: any; error?: string }> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: 'Unauthorized: Bearer token is missing' };
    }
    const token = authHeader.replace('Bearer ', '').trim();
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData.user) {
      return { user: null, error: `Unauthorized: ${authErr?.message || 'Invalid token'}` };
    }
    return { user: authData.user };
  } catch (error) {
    return { user: null, error: 'Internal Auth Validation Error' };
  }
}

function generateTaskCode(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TSK-${date}-${rand}`;
}

// â”€â”€â”€ POST: GÃ¶rev oluÅŸtur â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleTaskCreate(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await verifyApiAuth(request);
    if (authResult.error) {
      processError(ERR.PERMISSION_DENIED, new Error(authResult.error), { kaynak: 'taskMutationHandler.ts', islem: 'POST' }, 'WARNING');
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }

    const body = await request.json();

    // =========================================================================
    // SİSTEM TAKİP PANELİ: SÄ°STEM TAKÄ°P PANELÄ° - OTONOM MERKEZ MÄ°MARÄ°SÄ° (NEW PIPELINE)
    // =========================================================================
    const anlamaMotoru = new AnlamaMotoruService();
    const simulationGov = new SimulationGovernorService();
    const contractSvc = new TaskContractService();
    const shadowAuditor = new ShadowAuditorService();

    const rawIntent = `${body.title || ''} ${body.description || ''}`;
    
    // KADEME 1: Intent Sanity Check & Consensus
    const sanity = await anlamaMotoru.performIntentSanityCheck(rawIntent);
    if (!sanity.isSane) {
      processError(ERR.OTONOM_SANITY_REJECT, new Error('KÃ¶tÃ¼ niyetli komut yakalandÄ±.'), { rawIntent }, 'WARNING');
      return NextResponse.json({ success: false, error: 'ğŸš¨ ECHO GATE REDDÄ°: KÃ¶tÃ¼ niyetli veya anlamsÄ±z komut (Sanity Check Failed).' }, { status: 400 });
    }
    // GÃ–LGE DENETÄ°M 1
    const audit1Check = await shadowAuditor.auditSanityOutput(rawIntent, sanity);
    if (!audit1Check) {
      processError(ERR.OTONOM_SHADOW_REJECT, new Error('GÃ¶rev Kabul Birimi sahte onay Ã¼retti. Ä°zole edildi.'), { rawIntent }, 'ERROR');
      return NextResponse.json({ success: false, error: 'ğŸš¨SHADOW AUDIT REDDÄ°: Anlama Motoru (GÃ¶rev Kabul) baÅŸarÄ±m onayÄ± ÅŸÃ¼pheli bulunduÄŸundan izole edildi.' }, { status: 400 });
    }

    const consensusOk = await anlamaMotoru.runConsensusValidation(sanity.extractedIntent);
    if (!consensusOk) {
      return NextResponse.json({ success: false, error: 'ğŸš¨ ECHO GATE REDDÄ°: Ajanlar arasÄ± fikir birliÄŸi saÄŸlanamadÄ±.' }, { status: 400 });
    }

    // KADEME 2: SimÃ¼lasyon Testi & Kaynak YÃ¶netimi
    const simReport = await simulationGov.runMultiScenarioSimulation(sanity.extractedIntent);
    if (!simReport.isSafeToProceed) {
      processError(ERR.OTONOM_BUDGET_REJECT, new Error('SimÃ¼lasyon bÃ¼tÃ§e dÄ±ÅŸÄ±'), { resourceImpact: simReport.resourceImpact }, 'WARNING');
      return NextResponse.json({ success: false, error: 'ğŸš¨ ECHO GATE REDDÄ°: BÃ¼tÃ§e / CPU Limiti AÅŸÄ±mÄ± veya KararsÄ±zlÄ±k.', details: simReport.resourceImpact }, { status: 400 });
    }
    // GÃ–LGE DENETÄ°M 2
    const audit2Check = await shadowAuditor.auditSimulationOutput(simReport);
    if (!audit2Check) {
      processError(ERR.OTONOM_SHADOW_REJECT, new Error('Simülasyon Birimi sahte/hatalı onay üretti.'), { resourceImpact: simReport.resourceImpact }, 'ERROR');
      return NextResponse.json({ success: false, error: '🚨SHADOW AUDIT REDDİ: Simülasyon Departmanının (Bütçe Uygunluğu) onayı sahte/halüsinasyon kabul edildi.' }, { status: 400 });
    }

    // KADEME 3: Snapshot Lock ve Mühürlü Görev Sözleşmesi (Task Contract)
    const snapshotId = await contractSvc.triggerSnapshotLock();
    let taskContract = await contractSvc.buildAndMühürleContract(sanity.extractedIntent, snapshotId);
    if (!taskContract) {
      processError(ERR.OTONOM_CONTRACT_FAIL, new Error('Zod Schema/Sözleşme kurulamadı'), {}, 'ERROR');
      return NextResponse.json({ success: false, error: '🚨 ECHO GATE REDDİ: Görev Kontratı (Şablonu) Kurulamadı.' }, { status: 400 });
    }

    // NOT: taskContract.g0HandshakeApproved = FALSE gelir. Görev silinmez. Veritabanına YÖNETİCİ ONAYI BEKLİYOR formatında güvenle yatırılır.

    // -------------------------------------------------
    // 1️⃣ Pre‘execution checks (duplicate, anomaly, decay, forgetting)
    // -------------------------------------------------
    const preCheck = preExecuteChecks(body, 'CREATE');
    if (!preCheck.allowed) {
      // RED â€“ block execution
      console.error('[TaskCreate] Preâ€‘check failed:', preCheck.errors.join(' | '));
      return NextResponse.json({ success: false, error: 'Preâ€‘execution validation failed', details: preCheck.errors }, { status: 400 });
    }

    const validation = validateInput(CreateTaskSchema, {
      title: body.title, description: body.description ?? null,
      priority: body.priority ?? 'normal', assigned_to: body.assigned_to ?? 'SISTEM',
      due_date: body.due_date ?? null,
    }, { kaynak: 'api/tasks', islem: 'POST_CREATE' });

    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.errors?.[0] ?? 'Validasyon hatasÄ±', errors: validation.errors }, { status: 400 });
    }

    const validatedData = validation.data!;
    const taskCode = generateTaskCode();

    const { data, error } = await supabase.from('tasks').insert([{
      title: validatedData.title, description: validatedData.description || null,
      task_code: taskCode, status: taskContract?.g0HandshakeApproved ? 'beklemede' : 'onay_bekliyor', priority: validatedData.priority,
      assigned_to: validatedData.assigned_to, assigned_by: body.operator_name || 'KOMUTAN',
      evidence_required: true, evidence_provided: false, retry_count: 0, is_archived: false,
      due_date: validatedData.due_date || null,
      metadata: { 
        taskContract: taskContract, 
        internal_audit: 'AWAITING_DEPLOYMENT',
        xai_sanity_explanation: sanity.xaiExplanation || 'YOK'
      }
    }]).select();

    if (error) {
      processError(ERR.TASK_CREATE, error, { kaynak: 'taskMutationHandler.ts', islem: 'INSERT', task_code: taskCode });
      return NextResponse.json({ success: false, error: `GÃ¶rev oluÅŸturulamadÄ±: ${error.message}` }, { status: 500 });
    }

    const createdTask = data?.[0];

    // ── YENİ OTONOM MİMARİ: MERKEZ PLANLAMA DEPARTMANI TETİKLEMESİ ──
    try {
      const { CentralPlanningDepartment } = await import('@/core/planning_department/PlanningDepartment');
      // AWAIT kullanılmaz! Arka planda 15 motorluk devasa planlama çalışır, bitince Dispatcher'ı tetikler.
      CentralPlanningDepartment.triggerAsyncPlanning(rawIntent, 'API_INTAKE', createdTask?.id);
    } catch (deptError: any) {
      processError(ERR.OTONOM_SHADOW_REJECT, new Error(`Planlama Senatosu Tetikleme Gecikmesi: ${deptError.message}`), { rawIntent }, 'WARNING');
    }
    let auditLogged = false;
    try {
      await logAudit({ operation_type: 'CREATE', action_description: `Ä°Å EMRÄ° OLUÅTURULDU: "${validatedData.title}" [${taskCode}] â†’ ${validatedData.priority.toUpperCase()} â†’ ${validatedData.assigned_to}`, task_id: createdTask?.id ?? null, metadata: { action_code: 'TASK_CREATED_VIA_API', task_code: taskCode, priority: validatedData.priority, assigned_to: validatedData.assigned_to, source: 'KARARGAH_PANELI' } });
      auditLogged = true;
    } catch { auditLogged = false; }

    let telegramSent = false;
    try {
      if (isTelegramNotificationAvailable()) {
        const msg = formatTaskNotification('OLUÅTURULDU', taskCode, validatedData.title) + `\nAtanan: <code>${validatedData.assigned_to}</code>\nÃ–ncelik: ${validatedData.priority.toUpperCase()}`;
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

// â”€â”€â”€ PUT: GÃ¶rev gÃ¼ncelle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleTaskUpdate(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await verifyApiAuth(request);
    if (authResult.error) {
      processError(ERR.PERMISSION_DENIED, new Error(authResult.error), { kaynak: 'taskMutationHandler.ts', islem: 'PUT' }, 'WARNING');
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    // -------------------------------------------------
    // 1ï¸âƒ£ Preâ€‘execution checks for UPDATE
    // -------------------------------------------------
    const preCheck = preExecuteChecks(body, 'UPDATE');
    if (!preCheck.allowed) {
      console.error('[TaskUpdate] Preâ€‘check failed:', preCheck.errors.join(' | '));
      return NextResponse.json({ success: false, error: 'Preâ€‘execution validation failed', details: preCheck.errors }, { status: 400 });
    }

    const taskId = body.task_id;
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ success: false, error: 'task_id zorunlu alandÄ±r (UUID)' }, { status: 400 });
    }

    const updateFields: Record<string, unknown> = {};
    if (body.title !== undefined) updateFields.title = body.title;
    if (body.description !== undefined) updateFields.description = body.description;
    if (body.priority !== undefined) updateFields.priority = body.priority;
    if (body.assigned_to !== undefined) updateFields.assigned_to = body.assigned_to;
    if (body.status !== undefined) updateFields.status = body.status;
    if (body.due_date !== undefined) updateFields.due_date = body.due_date;
    if (body.evidence_provided !== undefined) updateFields.evidence_provided = body.evidence_provided;

    // â”€â”€ KÃ–K SEBEP DÃœZELTMESÄ° Ä°PTAL EDÄ°LDÄ° â”€â”€
    // Otonom sistemi yanÄ±ltan "tamamlanan gÃ¶revlerde kanÄ±t otomatik iÅŸaretlenir" by-pass'Ä± kaldÄ±rÄ±ldÄ±.
    // L2 Validator artÄ±k bu kurala sÄ±kÄ± baÄŸÄ±mlÄ± olacak.
    
    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ success: false, error: 'GÃ¼ncellenecek en az bir alan gerekli' }, { status: 400 });
    }

    const validation = validateInput(UpdateTaskSchema, updateFields, { kaynak: 'api/tasks', islem: 'PUT_UPDATE' });
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.errors?.[0] ?? 'Validasyon hatasÄ±', errors: validation.errors }, { status: 400 });
    }

    const { data: existingTask, error: fetchErr } = await supabase.from('tasks').select('id, title, priority, status, assigned_to, evidence_provided').eq('id', taskId).single();
    if (fetchErr || !existingTask) {
      return NextResponse.json({ success: false, error: `GÃ¶rev bulunamadÄ±: ${taskId}` }, { status: 404 });
    }

    // â”€â”€ KESÄ°N KANIT Ä°LKESÄ° VE SİSTEM TAKİP PANELİ ANAYASASI â”€â”€
    const nextStatus = updateFields.status || existingTask.status;
    const isEvidenced = updateFields.evidence_provided !== undefined ? updateFields.evidence_provided : existingTask.evidence_provided;

    // â”€â”€ FSM (DURUM MAKÄ°NESÄ°) KORUMASI â”€â”€
    if (updateFields.status && updateFields.status !== existingTask.status) {
      // Ozel Bypass: Karantinaya alinan islem "onay_bekliyor"a zorlanir eger hata varsa. Bu SÄ°STEM TAKÄ°P PANELÄ° Cleanup yonetimidir.
      const isCleanupOverride = updateFields.status === 'onay_bekliyor' && existingTask.status !== 'onay_bekliyor';
      
      if (!isCleanupOverride && !StateMachineGuard.validateTransition(existingTask.status, nextStatus as string)) {
         processError(ERR.OTONOM_FSM_VIOLATION, new Error(`YasaklÄ± Durum GeÃ§iÅŸi: ${existingTask.status} -> ${nextStatus}`), { taskId }, 'CRITICAL');
         return NextResponse.json({ success: false, error: `[FSM KÄ°LÄ°DÄ°] '${existingTask.status}' statÃ¼sÃ¼nden '${nextStatus}' statÃ¼sÃ¼ne geÃ§iÅŸ Deterministik Kurallara AYKIRIDIR.` }, { status: 400 });
      }
    }

    // ── SİSTEM TAKİP PANELİ L2 ZIRHI: İZOLASYON & İNFAZ (HATA GEÇİRMEZ KARANTİNA) ──
    const isErrorReport = body.is_error === true || nextStatus === 'hata_var' || nextStatus === 'iptal';
    let fakeEvidenceDetected = false;
    let infazNedeni = 'AJAN_HATASI_VEYA_HALUSINASYON';

    if ((nextStatus === 'tamamlandi' || nextStatus === 'muhürlendi')) {
        if (!isEvidenced) {
            fakeEvidenceDetected = true;
            infazNedeni = 'YALAN_BEYAN_KANIT_YOK (YAPICI EKİP DELİL SUNMADI)';
        } else {
            // YENİ ANAYASA: YAPAN ONAYLAYAMAZ (İCRADA ÇİFT ONAY)
            // Eğer isEvidenced true ise, "Kanıtım var" demiştir ama bu kanıt GEÇERLİ Mİ?
            // Sisteme doğrudan Mistral (Execution Guard) denetimini şart koşuyoruz.
            const evidenceText = typeof body.evidence_provided === 'string' ? body.evidence_provided : JSON.stringify(body.evidence_provided);
            const checkerPrompt = `GÖREV ID: ${taskId}\nSUNULAN KANIT: ${evidenceText}\n\nSen bir Denetçisin. Yapan ajan (Usta) işi bitirdiğini iddia ediyor. Kanıt yeterliyse KESİNLİKLE 'ONAY_KODU_994' yaz. Kanıt geçersizse veya yoksa 'RED' yaz. İŞİ YAPAN ONAYLAYAMAZ, Otorite SEN'sin.`;
            
            // SİSTEMİN İLK (ORİJİNAL) AI_PROVIDER TASARIMI KULLANILIYOR
            const checkerResult = await aiComplete({
                systemPrompt: "Sen bir denetçisin. Otorite SEN'sin.",
                userMessage: checkerPrompt,
                temperature: 0.1
            });
            if (!checkerResult || !checkerResult.content) {
                fakeEvidenceDetected = true;
                infazNedeni = 'DENETİM_MOTORU_ÇÖKTÜ: Gümrük denetimi yapılamadığı için işlem otomatik Karatinaya alındı.';
            } else {
                const checkerAns = checkerResult.content || '';
                if (!checkerAns.includes('ONAY_KODU_994')) {
                    fakeEvidenceDetected = true;
                    infazNedeni = `BAŞKA_EKİP_ONAYLAMADI: Otorite (Orijinal AI Yönlendirici) kanıtı KUSURLU buldu ve işlemi REDDETTİ. Log: ${checkerAns}`;
                }
            }
        }
    }

    if (isErrorReport || fakeEvidenceDetected) {
      processError(ERR.SYSTEM_GENERAL, new Error(`[İZOLASYON] Neden: ${infazNedeni}. Ajan "${existingTask.assigned_to}" başarısız oldu veya kuralı ihlal etti!`), { task_id: taskId }, 'CRITICAL');
      
      // 1. OTONOM KURTARMA (SELF-HEALING) & BAN MEKANİZMASI
      const existingMeta = (existingTask as any).metadata || {};
      const safeContract = existingMeta.taskContract || null;
      const currentRetry = existingMeta.retry_count || 0;
      const bannedAgents = existingMeta.banned_agents || [];
      
      // Ban listesine başarısız/yalancı ajanı da ekle
      if (existingTask.assigned_to && !bannedAgents.includes(existingTask.assigned_to)) {
          bannedAgents.push(existingTask.assigned_to);
      }

      const nextRetry = currentRetry + 1;
      const isMaxRetried = nextRetry >= 3;

      if (isMaxRetried) {
          // KOTA DOLDU: SİSTEM KİLİTLENİR, G-0 MÜDAHALESİ ŞARTTIR.
          updateFields.status = 'onay_bekliyor'; 
          updateFields.assigned_to = 'KARANTINA_G0_BEKLIYOR_MAX_HATA'; 
          updateFields.priority = 'kritik';
          
          updateFields.metadata = {
              taskContract: safeContract,
              retry_count: nextRetry,
              banned_agents: bannedAgents,
              islem_gecmisi: 'SİSTEM KİLİTLENDİ: 3 FARKLI AJAN NEDENİYLE GÖREV OTONOMİDEN DÜŞTÜ. G-0 (KURUCU) MÜDAHALESİ GEREKİYOR.',
              purge_reason: `MAKSİMUM RETRY (3) AŞILDI. SON İNFAZ: ${infazNedeni}`,
              purge_date: new Date().toISOString()
          };
      } else {
          // SELF-HEALING: KOTA DOLMADIYSA, KURMAY (SİSTEM) GÖREVİ SIFIRDAN BAŞLATIR
          // Karantinaya sokmadan doğrudan Görev Havuzuna ("beklemede") atılır ki diğer ajan alsın.
          updateFields.status = 'beklemede';
          updateFields.assigned_to = null; // Havuza gönder (Routing'de yeni ajan alacak)
          updateFields.priority = 'yuksek';
          
          updateFields.metadata = {
              taskContract: safeContract,
              retry_count: nextRetry,
              banned_agents: bannedAgents,
              islem_gecmisi: `OTONOM KURTARMA AKTİF: Ajan "${existingTask.assigned_to}" İnfaz Edildi. Görev havuza iade edildi. (Deneme: ${nextRetry}/3)`,
              purge_reason: infazNedeni,
              purge_date: new Date().toISOString()
          };
      }
      
      // 2. İZOLASYON & TAM STERİLİZASYON (Kalıntı Bırakmadan Sadece Bu Görevin İçini Temizleme)
      updateFields.evidence_provided = false;
      
      // Update Fields payloadına koy ki Validation Data bunu ezmesin
      validation.data!.status = updateFields.status as any;
      validation.data!.assigned_to = updateFields.assigned_to as any;
      validation.data!.priority = updateFields.priority as any;
      validation.data!.evidence_provided = false;
      (validation.data as any).metadata = updateFields.metadata;

      // Log: Otonom SİSTEM_KASASI TutanaÄŸÄ±na Ã‡ak.
      await logAudit({
        operation_type: 'REJECT',
        action_description: `ğŸš¨ Ä°NFAZ VE KARANTÄ°NA (İZOLASYON) | Neden: ${infazNedeni} | SuÃ§lu: [${existingTask.assigned_to}]. GÃ¶rev elinden alÄ±ndÄ±, Ã§Ä±ktÄ± temizlendi, yeniden atama iÃ§in Kurmay'a sevk edildi.`,
        task_id: taskId,
        metadata: { status: 'basarisiz', action_code: 'AGENT_ISOLATED_ZERO_TOLERANCE' }
      }).catch(()=>{});

      // AÅŸaÄŸÄ±da standart Update e devam edecek ama bizim KARANTÄ°NA DATASI (updateFields/validation) ile kaydedilecek! Sistem kendini sÄ±fÄ±rlayÄ±p baÅŸtan kurmaya mÃ¼hÃ¼rlemiÅŸ oldu.
    }

    const updatePayload = { ...validation.data, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('tasks').update(updatePayload).eq('id', taskId).select();
    if (error) {
      processError(ERR.TASK_UPDATE, error, { kaynak: 'taskMutationHandler.ts', islem: 'PUT_UPDATE', task_id: taskId });
      return NextResponse.json({ success: false, error: `GÃ¶rev gÃ¼ncellenemedi: ${error.message}` }, { status: 500 });
    }

    const changedFields = Object.keys(updateFields).join(', ');
    try {
      await logAudit({ operation_type: 'UPDATE', action_description: `GÃ–REV DÃœZENLENDÄ°: [${taskId.slice(0, 8)}] â†’ DeÄŸiÅŸen: ${changedFields}`, task_id: taskId, metadata: { action_code: 'TASK_EDITED_VIA_API', changed_fields: changedFields, previous: { title: existingTask.title, priority: existingTask.priority, status: existingTask.status }, updated: updatePayload, source: 'KARARGAH_PANELI' } });
    } catch { /* non-blocking */ }

    if (updateFields.priority && updateFields.priority !== existingTask.priority) {
      try {
        if (isTelegramNotificationAvailable()) {
          await sendTelegramNotification(`ğŸ”„ <b>GÃ–REV GÃœNCELLENDÄ°</b>\n\nID: <code>${taskId.slice(0, 8)}</code>\nBaÅŸlÄ±k: ${existingTask.title}\nÃ–ncelik: ${String(existingTask.priority).toUpperCase()} â†’ ${String(updateFields.priority).toUpperCase()}`);
        }
      } catch { /* non-blocking */ }
    }

    // â”€â”€ G-0 ONAYI SONRASI DISPATCHER (AJAN TETÄ°KLEME) â”€â”€
    if (existingTask.status === 'onay_bekliyor' && updateFields.status === 'beklemede') {
       setTimeout(() => {
          console.log(`[DISPATCHER] G-0 MÃ¼hÃ¼rÃ¼ AlÄ±ndÄ±. Ajanlar uyanÄ±yor: ${taskId}`);
          orkestrat(existingTask.title, undefined)
             .catch(e => console.error('[DISPATCHER] Ajan yÃ¼rÃ¼tme baÅŸarÄ±sÄ±z:', e));
       }, 500);
    }

    return NextResponse.json({ success: true, data: data?.[0] ?? { id: taskId, ...updatePayload }, changed_fields: changedFields, timestamp: new Date().toISOString() });

  } catch (error) {
    processError(ERR.TASK_UPDATE, error, { kaynak: 'taskMutationHandler.ts', islem: 'PUT' });
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'GÃ¶rev dÃ¼zenlenirken beklenmeyen hata', timestamp: new Date().toISOString() }, { status: 500 });
  }
}

// â”€â”€â”€ DELETE: GÃ¶rev sil â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function handleTaskDelete(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await verifyApiAuth(request);
    if (authResult.error) {
      processError(ERR.PERMISSION_DENIED, new Error(authResult.error), { kaynak: 'taskMutationHandler.ts', islem: 'DELETE' }, 'WARNING');
      return NextResponse.json({ success: false, error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    // -------------------------------------------------
    // 1ï¸âƒ£ Preâ€‘execution checks for DELETE
    // -------------------------------------------------
    const preCheck = preExecuteChecks(body, 'DELETE');
    if (!preCheck.allowed) {
      console.error('[TaskDelete] Preâ€‘check failed:', preCheck.errors.join(' | '));
      return NextResponse.json({ success: false, error: 'Preâ€‘execution validation failed', details: preCheck.errors }, { status: 400 });
    }

    const taskId = body.task_id;
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ success: false, error: 'task_id zorunlu alandÄ±r (UUID)' }, { status: 400 });
    }

    const { data: existing, error: fetchErr } = await supabase.from('tasks').select('id, title, task_code').eq('id', taskId).single();
    if (fetchErr || !existing) {
      return NextResponse.json({ success: false, error: `GÃ¶rev bulunamadÄ±: ${taskId}` }, { status: 404 });
    }

    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      processError(ERR.TASK_DELETE, error, { kaynak: 'taskMutationHandler.ts', islem: 'DELETE', task_id: taskId });
      return NextResponse.json({ success: false, error: `GÃ¶rev silinemedi: ${error.message}` }, { status: 500 });
    }

    try {
      await logAudit({ operation_type: 'DELETE', action_description: `GÃ–REV SÄ°LÄ°NDÄ°: "${existing.title}" [${existing.task_code ?? taskId.slice(0, 8)}]`, task_id: taskId, metadata: { action_code: 'TASK_DELETED_VIA_API', title: existing.title, task_code: existing.task_code, source: 'KARARGAH_PANELI' } });
    } catch { /* non-blocking */ }

    return NextResponse.json({ success: true, deleted_id: taskId, timestamp: new Date().toISOString() });

  } catch (error) {
    processError(ERR.TASK_DELETE, error, { kaynak: 'taskMutationHandler.ts', islem: 'DELETE' });
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'GÃ¶rev silinirken beklenmeyen hata', timestamp: new Date().toISOString() }, { status: 500 });
  }
}

