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
