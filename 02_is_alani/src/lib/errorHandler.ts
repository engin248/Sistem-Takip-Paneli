import { toast } from 'sonner';
import { logAudit } from '@/services/auditService';

export const handleError = async (errorCode: string, errorDetails: any) => {
  console.error(`[${errorCode}]`, errorDetails);
  
  // Sisteme mühürle
  await logAudit({
    operation_type: 'ERROR',
    action_description: `Hata meydana geldi: ${errorCode}`,
    error_code: errorCode,
    error_severity: 'ERROR',
    status: 'basarisiz',
    metadata: { error: errorDetails.message || errorDetails }
  });
  
  // Operatöre bildir
  toast.error(`KRİTİK HATA: ${errorCode}`, {
    description: "İşlem başarısız. Denetim günlüğü oluşturuldu.",
  });
};
