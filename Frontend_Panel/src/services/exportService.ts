import { useTaskStore, type Task } from '@/store/useTaskStore';
import { logAudit } from './auditService';
import { ERR, processError } from '@/lib/errorCore';

// ============================================================
// EXPORT SERVICE — Veri Dışa Aktarma
// ============================================================
// Formatlar: JSON, CSV
// Audit log entegrasyonu zorunlu.
// Hata Kodu: ERR-Sistem Takip Paneli001-012
// ============================================================

type ExportFormat = 'json' | 'csv';

/**
 * Görevleri belirtilen formatta dışa aktarır.
 * @param format - 'json' veya 'csv'
 * @param filter - Opsiyonel filtre (sadece belirli status/priority)
 */
export async function exportSystemData(
  format: ExportFormat = 'json',
  filter?: { status?: string; priority?: string }
): Promise<void> {
  try {
    let tasks = useTaskStore.getState().tasks;

    // Opsiyonel filtreleme
    if (filter?.status) {
      tasks = tasks.filter((t) => t.status === filter.status);
    }
    if (filter?.priority) {
      tasks = tasks.filter((t) => t.priority === filter.priority);
    }

    const timestamp = new Date().toISOString().split('T')[0];
    let dataStr: string;
    let mimeType: string;
    let extension: string;

    if (format === 'csv') {
      dataStr = tasksToCSV(tasks);
      mimeType = 'text/csv;charset=utf-8;';
      extension = 'csv';
    } else {
      dataStr = JSON.stringify(tasks, null, 2);
      mimeType = 'application/json;charset=utf-8;';
      extension = 'json';
    }

    const fileName = `Sistem Takip Paneli_ARSIV_${timestamp}.${extension}`;
    const blob = new Blob([dataStr], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', fileName);
    linkElement.click();

    // Bellek temizliği
    URL.revokeObjectURL(url);

    // Audit log
    await logAudit({
      operation_type: 'EXECUTE',
      action_description: `Sistem verisi dışa aktarıldı: ${fileName}`,
      metadata: {
        action_code: 'SYSTEM_EXPORT',
        dosya_adi: fileName,
        format,
        kayit_sayisi: tasks.length,
        filtre: filter ?? null,
        tarih: new Date().toISOString(),
      },
    });
  } catch (error) {
    processError(ERR.SYSTEM_EXPORT, error, {
      islem: 'EXPORT',
      kaynak: 'exportService',
      format,
    });
  }
}

/**
 * Task dizisini CSV formatına dönüştürür.
 * BOM karakteri ile Excel uyumluluğu sağlar.
 */
function tasksToCSV(tasks: Task[]): string {
  if (tasks.length === 0) return '';

  const headers = [
    'id', 'task_code', 'title', 'status', 'priority',
    'assigned_to', 'assigned_by', 'evidence_required',
    'evidence_provided', 'retry_count', 'created_at',
    'updated_at', 'is_archived', 'description',
  ];

  const escapeCSV = (value: unknown): string => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = tasks.map((task) =>
    headers.map((h) => escapeCSV(task[h as keyof Task])).join(',')
  );

  // BOM + header + rows
  return '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
}
