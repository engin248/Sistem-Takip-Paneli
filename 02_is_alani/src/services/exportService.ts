import { useTaskStore } from '@/store/useTaskStore';
import { logAudit } from './auditService';
import { ERR, processError } from '@/lib/errorCore';

export const exportSystemData = async () => {
  try {
    const { tasks } = useTaskStore.getState();
    const dataStr = JSON.stringify(tasks, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `STP_ARSIV_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    // BUG-016 FIX: Export işlemi audit_logs'a kaydediliyor
    await logAudit({
      operation_type: 'EXECUTE',
      action_description: `Sistem verisi dışa aktarıldı: ${exportFileDefaultName}`,
      metadata: {
        action_code: 'SYSTEM_EXPORT',
        dosya_adi: exportFileDefaultName,
        kayit_sayisi: tasks.length,
        tarih: new Date().toISOString()
      }
    });
  } catch (error) {
    processError(ERR.SYSTEM_EXPORT, error, { islem: 'EXPORT', kaynak: 'exportSystemData' });
  }
};
