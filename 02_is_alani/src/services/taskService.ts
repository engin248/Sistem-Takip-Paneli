import { supabase } from '@/lib/supabase';
import { useTaskStore } from '@/store/useTaskStore';

export const fetchTasksFromDB = async () => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('ERR-STP001-003', error); // Veritabanı veri çekme hatası
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

export const subscribeToTasks = (callback: () => void) => {
  const channel = supabase
    .channel('tasks_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
      callback();
    })
    .subscribe();
  
  return channel;
};
