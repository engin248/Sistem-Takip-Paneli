// ============================================================
// TASK SERVICE — Gerçek Supabase Görev Servisi
// KÖK NEDEN: updateStatus ve getTaskService tamamen boştu.
//            @ts-nocheck ile TypeScript denetimi kapatılmıştı.
// ÇÖZÜM: Supabase'e bağlı gerçek CRUD fonksiyonları.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getClient() {
  if (!supabaseUrl || supabaseUrl.length < 10) {
    throw new Error('VERİ HATTI KESİK: NEXT_PUBLIC_SUPABASE_URL tanımlı değil — taskService');
  }
  return createClient(supabaseUrl, supabaseKey);
}

export type TaskStatus = 'beklemede' | 'devam_ediyor' | 'tamamlandi' | 'hata' | 'reddedildi';

export interface TaskUpdatePayload {
  status?: TaskStatus;
  metadata?: Record<string, unknown>;
  updated_at?: string;
}

/**
 * updateStatus — Görev durumunu Supabase'de günceller.
 * KÖK NEDEN DÜZELTİLDİ: Önceden boş fonksiyondu, hiçbir şey yazmıyordu.
 */
export async function updateStatus(
  taskId: string,
  payload: TaskUpdatePayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getClient();
    const { error } = await supabase
      .from('tasks')
      .update({
        ...payload,
        updated_at: payload.updated_at || new Date().toISOString(),
      })
      .eq('id', taskId);

    if (error) {
      console.error(`[TASK SERVICE] updateStatus hata: ${error.message}`);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

/**
 * getTaskById — Tek görevi id ile çeker.
 */
export async function getTaskById(taskId: string) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (error) return { success: false, error: error.message, data: null };
    return { success: true, data };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e), data: null };
  }
}

/**
 * getPendingTasks — Planlama departmanı için bekleyen görevleri çeker.
 */
export async function getPendingTasks(limit = 20) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'beklemede')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) return { success: false, error: error.message, data: [] };
    return { success: true, data: data || [] };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e), data: [] };
  }
}

/**
 * createTask — Yeni görev oluştur.
 */
export async function createTask(payload: {
  task_code: string;
  title: string;
  priority?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = getClient();
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        task_code:   payload.task_code,
        title:       payload.title,
        status:      'beklemede',
        priority:    payload.priority || 'normal',
        is_archived: false,
        metadata:    payload.metadata || {},
        created_at:  new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message, data: null };
    return { success: true, data };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e), data: null };
  }
}

export const getTaskService = () => ({
  updateStatus,
  getTaskById,
  getPendingTasks,
  createTask,
});
