import { toast } from 'sonner';
import { logAudit } from '@/services/auditService';
import { processError, ERR, ERR_DESCRIPTIONS, type ErrorCode, type ErrorSeverity } from './errorCore';

// ============================================================
// MERKEZİ HATA İŞLEYİCİ
// ============================================================
// Bu fonksiyon:
// 1. errorCore.processError → standart log üretir
// 2. audit_logs tablosuna mühürler
// 3. Operatöre toast ile bildirir
// Jenerik metin mesajları YASAKTIR — her zaman ERR kodu kullanılır.
// ============================================================

export const handleError = async (
  errorCode: ErrorCode,
  errorDetails: unknown,
  context: Record<string, unknown> = {},
  severity: ErrorSeverity = 'ERROR'
) => {
  // 1. Merkezi hata motoru — UID + kaynak bilgisi ile log üretir
  const result = processError(errorCode, errorDetails, context, severity);

  // 2. Audit Log'a mühürle — UID dahil
  try {
    await logAudit({
      operation_type: 'ERROR',
      action_description: `[${result.uid}] ${result.code}: ${result.description}`,
      error_code: result.code,
      error_severity: result.severity,
      status: 'basarisiz',
      metadata: {
        uid: result.uid,
        error_message: result.message,
        source_file: result.source.file,
        source_func: result.source.func,
        timestamp: result.timestamp,
        ...result.context,
      }
    });
  } catch {
    // Audit log yazma da başarısız olursa — son çare console
    console.error(`[${result.uid}] [${ERR.AUDIT_WRITE}] Audit log yazılamadı — orijinal hata: ${result.code}`);
  }

  // 3. Operatöre toast ile bildir — UID + kaynak dosya dahil
  const description = ERR_DESCRIPTIONS[errorCode] || 'Bilinmeyen hata';
  toast.error(`HATA ${errorCode} | ${result.uid}`, {
    description: `${description}. Kaynak: ${result.source.file}→${result.source.func}`,
    duration: 8000,
  });
};
