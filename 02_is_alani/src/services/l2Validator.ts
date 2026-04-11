// ============================================================
// L2 VALIDATOR — BAĞIMSIZ DENETİM AJANI (G-5)
// ============================================================
// Görev: Tamamlanan işlemleri bağımsız olarak doğrulamak.
// Konsensüs motorundan (consensusEngine) AYRI çalışır.
// Audit log'daki verileri analiz ederek tutarsızlık arar.
//
// ÜST: Tüm servisler (audit_logs tablosu üzerinden)
// ALT: Supabase audit_logs okuma
// YAN: errorCore + auditService
// ÖN: Operatörden bağımsız, otonom denetim
// ARKA: Sistem bütünlüğü + güven katmanı
//
// Hata Kodu: ERR-STP001-001 (genel)
// ============================================================

import { supabase, validateSupabaseConnection } from '@/lib/supabase';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';
import { sendTelegramNotification, formatL2Report, isTelegramNotificationAvailable } from './telegramNotifier';

// ─── DENETİM SONUCU ────────────────────────────────────────

export interface ValidationFinding {
  type: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  description: string;
  table?: string;
  record_id?: string;
  timestamp: string;
}

export interface L2ValidationReport {
  validator: 'L2-AUTONOMOUS';
  timestamp: string;
  duration_ms: number;
  findings: ValidationFinding[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    status: 'PASS' | 'FAIL' | 'WARNING';
  };
}

// ============================================================
// 1. ORPHAN TASK KONTROLÜ
// ============================================================
// Görev var ama audit kaydı yok → izlenebilirlik ihlali

async function checkOrphanTasks(): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];

  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, task_code, title, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !tasks) return findings;

    for (const task of tasks) {
      const { count, error: auditError } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('task_id', task.id);

      if (!auditError && (count === null || count === 0)) {
        findings.push({
          type: 'WARNING',
          code: 'L2-ORPHAN-TASK',
          description: `Görev "${task.task_code}" için audit kaydı bulunamadı. İzlenebilirlik ihlali.`,
          table: 'tasks',
          record_id: task.id,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'l2Validator.ts',
      islem: 'CHECK_ORPHAN_TASKS',
    });
  }

  return findings;
}

// ============================================================
// 2. DURUM TUTARSIZLIĞI KONTROLÜ
// ============================================================
// "tamamlandi" durumunda ama evidence_provided = false

async function checkStatusInconsistency(): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];

  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, task_code, status, evidence_provided, evidence_required')
      .eq('status', 'tamamlandi')
      .eq('evidence_required', true)
      .eq('evidence_provided', false);

    if (error || !tasks) return findings;

    for (const task of tasks) {
      findings.push({
        type: 'ERROR',
        code: 'L2-STATUS-INCONSISTENCY',
        description: `Görev "${task.task_code}" tamamlandı olarak işaretlenmiş ama kanıt yok (evidence_provided=false).`,
        table: 'tasks',
        record_id: task.id,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'l2Validator.ts',
      islem: 'CHECK_STATUS_INCONSISTENCY',
    });
  }

  return findings;
}

// ============================================================
// 3. HATA YOĞUNLUĞU KONTROLÜ
// ============================================================
// Son 1 saatte 10'dan fazla hata → sistem sağlığı uyarısı

async function checkErrorDensity(): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // audit_logs ŞEMASI: log_id, task_id, action_code, details(JSONB), operator_id, timestamp
    // error_code → details JSONB içinde. Supabase JS client ile JSONB filtreleme
    // desteklenmediğinden, zaman aralığındaki logları çekip JS'te filtreliyoruz.
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('details')
      .gte('timestamp', oneHourAgo);

    if (!error && logs) {
      // details JSONB içindeki error_code alanı dolu olanları say
      const errorCount = logs.filter(log => {
        const details = (log.details || {}) as Record<string, unknown>;
        return details.error_code != null;
      }).length;

      if (errorCount > 10) {
        findings.push({
          type: 'WARNING',
          code: 'L2-ERROR-DENSITY',
          description: `Son 1 saatte ${errorCount} hata kaydı tespit edildi. Normal eşik: 10.`,
          table: 'audit_logs',
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'l2Validator.ts',
      islem: 'CHECK_ERROR_DENSITY',
    });
  }

  return findings;
}

// ============================================================
// 4. BOARD KONSENSÜS BÜTÜNLÜĞÜ
// ============================================================
// sealed durumda ama seal_hash yok → mühür bütünlüğü ihlali

async function checkBoardIntegrity(): Promise<ValidationFinding[]> {
  const findings: ValidationFinding[] = [];

  try {
    const { data: decisions, error } = await supabase
      .from('board_decisions')
      .select('id, decision_code, status, seal_hash, consensus_result')
      .eq('status', 'sealed')
      .is('seal_hash', null);

    if (error || !decisions) return findings;

    for (const d of decisions) {
      findings.push({
        type: 'ERROR',
        code: 'L2-SEAL-INTEGRITY',
        description: `Karar "${d.decision_code}" sealed durumda ama seal_hash yok. Mühür bütünlüğü ihlali.`,
        table: 'board_decisions',
        record_id: d.id,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'l2Validator.ts',
      islem: 'CHECK_BOARD_INTEGRITY',
    });
  }

  return findings;
}

// ============================================================
// ANA ORKESTRATÖR — TÜM KONTROLLERİ ÇALIŞTIR
// ============================================================

export async function runL2Validation(): Promise<L2ValidationReport> {
  const startTime = Date.now();

  if (!validateSupabaseConnection().isValid) {
    return {
      validator: 'L2-AUTONOMOUS',
      timestamp: new Date().toISOString(),
      duration_ms: 0,
      findings: [{
        type: 'ERROR',
        code: 'L2-NO-CONNECTION',
        description: 'Supabase bağlantısı yok. L2 doğrulama çalıştırılamaz.',
        timestamp: new Date().toISOString(),
      }],
      summary: { errors: 1, warnings: 0, info: 0, status: 'FAIL' },
    };
  }

  // Tüm kontrolleri paralel çalıştır
  const [orphans, inconsistencies, density, board] = await Promise.all([
    checkOrphanTasks(),
    checkStatusInconsistency(),
    checkErrorDensity(),
    checkBoardIntegrity(),
  ]);

  const allFindings = [...orphans, ...inconsistencies, ...density, ...board];
  const errors = allFindings.filter(f => f.type === 'ERROR').length;
  const warnings = allFindings.filter(f => f.type === 'WARNING').length;
  const info = allFindings.filter(f => f.type === 'INFO').length;

  const status: 'PASS' | 'FAIL' | 'WARNING' =
    errors > 0 ? 'FAIL' : warnings > 0 ? 'WARNING' : 'PASS';

  const duration_ms = Date.now() - startTime;

  const report: L2ValidationReport = {
    validator: 'L2-AUTONOMOUS',
    timestamp: new Date().toISOString(),
    duration_ms,
    findings: allFindings,
    summary: { errors, warnings, info, status },
  };

  // Raporu audit log'a mühürle
  await logAudit({
    operation_type: 'EXECUTE',
    action_description: `L2 Validator tamamlandı: ${status} (${errors}E/${warnings}W/${info}I) — ${duration_ms}ms`,
    metadata: {
      action_code: 'L2_VALIDATION',
      status,
      errors,
      warnings,
      info,
      duration_ms,
      finding_codes: allFindings.map(f => f.code),
    },
  }).catch(() => {});

  // Telegram bildirim gönder (varsa)
  if (isTelegramNotificationAvailable()) {
    await sendTelegramNotification(
      formatL2Report(status, errors, warnings, duration_ms)
    ).catch(() => {});
  }

  return report;
}
