import { supabase } from '@/lib/supabase';
import { useTaskStore } from '@/store/useTaskStore';
import { logAudit, logAuditError } from './auditService';
import { validateSupabaseConnection } from '@/lib/supabase';
import { ERR, processError } from '@/lib/errorCore';

// ============================================================
// BAĞLANTI ÖN KONTROLÜ
// Supabase çağrısı yapmadan önce bağlantı geçerliliğini doğrular.
// Placeholder değerler varsa network hatası oluşmadan engeller.
// ============================================================
function isConnectionValid(): boolean {
  const { isValid } = validateSupabaseConnection();
  return isValid;
}

export const fetchTasksFromDB = async () => {
  if (!isConnectionValid()) {
    processError(ERR.CONNECTION_INVALID, new Error('.env.local SUPABASE bilgileri eksik'), {
      tablo: 'tasks', islem: 'SELECT'
    }, 'CRITICAL');
    useTaskStore.getState().setError(`${ERR.TASK_FETCH}: Veritabanı bağlantı bilgileri eksik`);
    return;
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      processError(ERR.TASK_FETCH, error, { tablo: 'tasks', islem: 'SELECT' });
      useTaskStore.getState().setError(`${ERR.TASK_FETCH}: Veritabanı bağlantı hatası`);
      await logAuditError(ERR.TASK_FETCH, 'Görev listesi çekilirken sistem hatası oluştu', { error: error.message });
      return;
    }
    useTaskStore.getState().setTasks(data);
  } catch (err) {
    processError(ERR.UNIDENTIFIED_COLLAPSE, err, {
      tablo: 'tasks', islem: 'SELECT', context: 'fetchTasksFromDB'
    }, 'FATAL');
    useTaskStore.getState().setError(`${ERR.UNIDENTIFIED_COLLAPSE}: Ağ bağlantısı hatası`);
  }
};

export const updateStatus = async (id: string, status: string) => {
  if (!isConnectionValid()) {
    processError(ERR.CONNECTION_INVALID, new Error('Bağlantı eksik'), {
      tablo: 'tasks', islem: 'UPDATE', task_id: id
    }, 'CRITICAL');
    return;
  }

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', id);

    if (!error) {
      await logAudit({
        operation_type: 'UPDATE',
        action_description: `Görev durumu güncellendi: ${id} -> ${status}`,
        task_id: id,
        metadata: { action_code: 'TASK_UPDATED', status }
      });
      await fetchTasksFromDB();
    } else {
      processError(ERR.TASK_UPDATE, error, {
        tablo: 'tasks', islem: 'UPDATE', task_id: id, attempted_status: status
      });
      await logAuditError(ERR.TASK_UPDATE, `Görev durumu güncellenemedi: ${id}`, {
        error: error.message, task_id: id, attempted_status: status
      });
    }
  } catch (err) {
    processError(ERR.UNIDENTIFIED_COLLAPSE, err, {
      tablo: 'tasks', islem: 'UPDATE', task_id: id
    }, 'FATAL');
  }
};

export const deleteTask = async (id: string) => {
  if (!isConnectionValid()) {
    processError(ERR.CONNECTION_INVALID, new Error('Bağlantı eksik'), {
      tablo: 'tasks', islem: 'DELETE', task_id: id
    }, 'CRITICAL');
    return;
  }

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (!error) {
      await logAudit({
        operation_type: 'DELETE',
        action_description: `Görev silindi: ${id}`,
        task_id: id,
        metadata: { action_code: 'TASK_DELETED' }
      });
      await fetchTasksFromDB();
    } else {
      processError(ERR.TASK_DELETE, error, {
        tablo: 'tasks', islem: 'DELETE', task_id: id
      });
      await logAuditError(ERR.TASK_DELETE, `Görev silinemedi: ${id}`, {
        error: error.message, task_id: id
      });
    }
  } catch (err) {
    processError(ERR.UNIDENTIFIED_COLLAPSE, err, {
      tablo: 'tasks', islem: 'DELETE', task_id: id
    }, 'FATAL');
  }
};

export const archiveTask = async (id: string) => {
  if (!isConnectionValid()) {
    processError(ERR.CONNECTION_INVALID, new Error('Bağlantı eksik'), {
      tablo: 'tasks', islem: 'ARCHIVE', task_id: id
    }, 'CRITICAL');
    return;
  }

  try {
    const { error } = await supabase
      .from('tasks')
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) {
      await logAudit({
        operation_type: 'UPDATE',
        action_description: `Görev arşivlendi: ${id}`,
        task_id: id,
        metadata: { action_code: 'TASK_ARCHIVED', is_archived: true }
      });
      await fetchTasksFromDB();
    } else {
      processError(ERR.TASK_ARCHIVE, error, {
        tablo: 'tasks', islem: 'UPDATE (archive)', task_id: id
      });
      await logAuditError(ERR.TASK_ARCHIVE, `Görev arşivlenemedi: ${id}`, {
        error: error.message, task_id: id
      });
    }
  } catch (err) {
    processError(ERR.UNIDENTIFIED_COLLAPSE, err, {
      tablo: 'tasks', islem: 'ARCHIVE', task_id: id
    }, 'FATAL');
  }
};

export const subscribeToTasks = (callback: () => void) => {
  // Bağlantı geçersizse WebSocket açmadan dön — retry spam'i engeller
  if (!isConnectionValid()) {
    processError(ERR.TASK_REALTIME, new Error('Realtime kanal açılamıyor'), {
      tablo: 'tasks', islem: 'SUBSCRIBE'
    }, 'CRITICAL');
    // Boş bir kanal nesnesi döndür — removeChannel çağrısı hata vermesin
    return supabase.channel('tasks_realtime_disabled');
  }

  try {
    const channel = supabase
      .channel('tasks_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        callback();
      })
      .subscribe();

    return channel;
  } catch (error) {
    processError(ERR.TASK_REALTIME, error, { tablo: 'tasks', islem: 'SUBSCRIBE' });
    return supabase.channel('tasks_realtime_error');
  }
};
