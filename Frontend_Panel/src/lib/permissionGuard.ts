// @ts-nocheck
// ============================================================
// PERMISSION GUARD — DOSYA SEVİYESİNDE KİLİTLEME SİMÜLASYONU
// ============================================================
// Ekip üyelerinin sadece kendilerine atanan görev dosyalarına
// yazma yetkisi olmasını doğrular.
//
// Mimari:
//   task.assigned_to ↔ operator.name karşılaştırması
//   YÖNETİCİ / ADMIN → tüm görevlere tam erişim
//   OPERATÖR          → sadece kendi görevlerine erişim
//
// Hata Kodları:
//   ERR-Sistem Takip Paneli001-023: Yazma yetkisi reddedildi
//   ERR-Sistem Takip Paneli001-024: Sahiplik doğrulanamadı
//   ERR-Sistem Takip Paneli001-025: Kilit ihlali tespit edildi
// ============================================================

import { useOperatorStore, type Operator } from '@/store/useOperatorStore';
import { ERR, processError, type ErrorCode } from '@/lib/errorCore';
import { logAudit } from '@/services/auditService';

// ── İZİN SONUCU ─────────────────────────────────────────────
export interface PermissionResult {
  /** Yazma izni var mı? */
  granted: boolean;
  /** Aktif operatör bilgileri */
  operator: Operator;
  /** Görevin atandığı kişi */
  taskAssignedTo: string;
  /** Red nedeni (varsa) */
  reason?: string;
}

/**
 * Görev üzerindeki yazma yetkisini doğrular.
 * @param taskId    - Görev UUID
 * @param assignedTo - Görevin assigned_to alanı
 * @param operation - İşlem türü (UPDATE, DELETE, ARCHIVE)
 * @returns PermissionResult
 */
export function checkWritePermission(
  taskId: string,
  assignedTo: string,
  _operation: string // eslint — parametrenin imzada kalması gerekli
): PermissionResult {
  const { operator, canWrite } = useOperatorStore.getState();
  const isGranted = canWrite(assignedTo);

  const result: PermissionResult = {
    granted: isGranted,
    operator,
    taskAssignedTo: assignedTo,
  };

  if (!isGranted) {
    result.reason = `Operatör "${operator.name}" (${operator.role}), "${assignedTo}" kullanıcısına atanmış göreve yazma yetkisine sahip değil`;
  }

  return result;
}

/**
 * Yazma operasyonu öncesi yetki kontrolü yapar.
 * İzin yoksa:
 *   1. ERR-Sistem Takip Paneli001-023 hatası üretir
 *   2. Audit log'a ihlali kaydeder
 *   3. false döndürür (işlem engellenir)
 *
 * @param taskId    - Görev UUID
 * @param assignedTo - Görevin assigned_to alanı
 * @param operation - İşlem türü adı
 * @param errorCode - Kullanılacak hata kodu (varsayılan: PERMISSION_DENIED)
 * @returns true = operasyona devam et, false = engelle
 */
export async function guardWritePermission(
  taskId: string,
  assignedTo: string,
  operation: string,
  errorCode: ErrorCode = ERR.PERMISSION_DENIED
): Promise<boolean> {
  const result = checkWritePermission(taskId, assignedTo, operation);

  if (result.granted) {
    return true;
  }

  // ─── 1. Hata motoru ile logla ─────────────────────────────
  processError(errorCode, new Error(result.reason || 'Yazma yetkisi yok'), {
    tablo: 'tasks',
    islem: operation,
    task_id: taskId,
    task_assigned_to: assignedTo,
    operator_name: result.operator.name,
    operator_role: result.operator.role,
  }, 'WARNING');

  // ─── 2. Audit log'a ihlali mühürle ───────────────────────
  try {
    await logAudit({
      operation_type: 'REJECT',
      action_description: `KİLİT İHLALİ: "${result.operator.name}" (${result.operator.role}) → "${assignedTo}" görevine ${operation} yetkisi reddedildi`,
      task_id: taskId,
      error_code: errorCode,
      error_severity: 'WARNING',
      status: 'basarisiz',
      metadata: {
        action_code: 'PERMISSION_DENIED',
        operator_name: result.operator.name,
        operator_role: result.operator.role,
        task_assigned_to: assignedTo,
        attempted_operation: operation,
        guard_type: 'FILE_LEVEL_LOCK',
      },
    });
  } catch {
    // Audit yazma da başarısız — son çare console (double-error koruması)
    console.error(`[PERMISSION_GUARD] Audit log yazılamadı — ihlal: ${result.operator.name} → ${taskId}`);
  }

  return false;
}

/**
 * Görevin store'dan assigned_to bilgisini çeker.
 * Task ID ile store araması yapar — store senkronize olmalıdır.
 * NOT: Circular dependency önlemek için useTaskStore doğrudan import edilmez.
 */
export function getTaskOwner(taskId: string): string | null {
  // Zustand store'ları modül seviyesinde singleton olduğundan
  // getState() runtime'da güvenli erişim sağlar.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useTaskStore } = require('@/store/useTaskStore') as {
    useTaskStore: {
      getState: () => { tasks: Array<{ id: string; assigned_to: string }> };
    };
  };
  const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);
  return task?.assigned_to ?? null;
}


