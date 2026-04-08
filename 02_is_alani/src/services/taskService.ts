import { supabase } from '@/lib/supabase';
import { useTaskStore } from '@/store/useTaskStore';

export const fetchTasksFromDB = async () => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) {
    const errorCode = 'ERR-STP001-003';
    console.error(errorCode, error);
    
    // Store'a hatayı işle
    useTaskStore.getState().setError(`${errorCode}: Veritabanı bağlantı hatası`);
    
    // Audit Log'a mühürle
    const { logAuditError } = await import('./auditService');
    await logAuditError(errorCode, 'Görev listesi çekilirken sistem hatası oluştu', { error: error.message });
    
    return;
  }
  useTaskStore.getState().setTasks(data);
};

export const updateStatus = async (id: string, status: string) => {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', id);

  if (!error) {
    const { logAudit } = await import('./auditService');
    await logAudit({
      operation_type: 'UPDATE',
      action_description: `Görev durumu güncellendi: ${id} -> ${status}`,
      task_id: id,
      metadata: { action_code: 'TASK_UPDATED', status }
    });
    await fetchTasksFromDB();
  } else {
    console.error('ERR-STP001-004', error);
  }
};

export const deleteTask = async (id: string) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (!error) {
    const { logAudit } = await import('./auditService');
    await logAudit({
      operation_type: 'DELETE',
      action_description: `Görev silindi: ${id}`,
      task_id: id
    });
    await fetchTasksFromDB();
  } else {
    console.error('ERR-STP001-005', error);
  }
};

export const archiveTask = async (id: string) => {
  const { error } = await supabase
    .from('tasks')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (!error) {
    const { logAudit } = await import('./auditService');
    await logAudit({
      operation_type: 'UPDATE',
      action_description: `Görev arşivlendi: ${id}`,
      task_id: id,
      metadata: { action_code: 'TASK_ARCHIVED', is_archived: true }
    });
    await fetchTasksFromDB();
  } else {
    console.error('ERR-STP001-008', error);
  }
};

export const subscribeToTasks = (callback: () => void) => {
  const channel = supabase
    .channel('tasks_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
      callback();
    })
    .subscribe();
  
  return channel;
};
