// ============================================================
// TASK QUEUE — Gerçek İş Kuyruğu
// KÖK NEDEN: pushJobHistory/QueueJob/generateJobId/getTaskQueue
//            hepsi boş stub'dı. @ts-nocheck ile kapatılmıştı.
// ÇÖZÜM: Supabase tasks tablosunu kuyruk olarak kullan.
//        Bellek içi öncelik sıralama + Supabase senkronizasyon.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { auditLog } from '@/core/localAudit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ── TİP TANIMLARI ───────────────────────────────────────────
export interface QueueJobType {
  job_id: string;
  task_id: string;
  task_code: string;
  title: string;
  priority_score: number; // 1-5, yüksek = önce
  status: 'bekliyor' | 'isleniyor' | 'tamamlandi' | 'hata';
  created_at: string;
  ajan_id?: string;
  metadata?: Record<string, unknown>;
}

// Bellek içi kuyruk (polling yapmadan hızlı erişim)
const _kuyruk: Map<string, QueueJobType> = new Map();
let _kuyrukId = 0;

/**
 * generateJobId — Tekrarlanmaz job ID üret
 * KÖK NEDEN DÜZELTİLDİ: Artık 'jobId' sabit değil, zaman+sayaç.
 */
export function generateJobId(): string {
  _kuyrukId++;
  return `JOB-${Date.now()}-${String(_kuyrukId).padStart(4, '0')}`;
}

/**
 * QueueJob — Görevi kuyruğa ekle ve Supabase'e işaretle.
 */
export const QueueJob = {
  push: async (taskId: string, taskCode: string, title: string, priorityScore = 3): Promise<QueueJobType> => {
    const job_id = generateJobId();
    const job: QueueJobType = {
      job_id,
      task_id:        taskId,
      task_code:      taskCode,
      title,
      priority_score: Math.min(5, Math.max(1, priorityScore)),
      status:         'bekliyor',
      created_at:     new Date().toISOString(),
    };

    _kuyruk.set(job_id, job);

    // Supabase'de görevi 'devam_ediyor' işaretle
    if (supabaseUrl && supabaseUrl.length > 10) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from('tasks')
          .update({ status: 'devam_ediyor', updated_at: new Date().toISOString() })
          .eq('id', taskId);
      } catch (e: unknown) {
        console.warn(`[TASK QUEUE] Supabase işaret uyarısı: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    auditLog({ islem: 'QUEUE_PUSH', aciklama: `${job_id} kuyruğa alındı: ${title.slice(0, 50)}`, sonuc: 'PASS' });
    return job;
  },

  /** Önceliğe göre sıralı kuyruk listesi */
  getAll: (): QueueJobType[] => {
    return Array.from(_kuyruk.values())
      .sort((a, b) => b.priority_score - a.priority_score);
  },

  /** Kuyruktaki bekleyen ilk işi al */
  peek: (): QueueJobType | null => {
    const bekleyenler = Array.from(_kuyruk.values())
      .filter(j => j.status === 'bekliyor')
      .sort((a, b) => b.priority_score - a.priority_score);
    return bekleyenler[0] || null;
  },

  /** İşi tamamlandı olarak işaretle */
  complete: async (job_id: string): Promise<void> => {
    const job = _kuyruk.get(job_id);
    if (!job) return;
    job.status = 'tamamlandi';
    _kuyruk.set(job_id, job);

    if (supabaseUrl && supabaseUrl.length > 10) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        await supabase.from('tasks')
          .update({ status: 'tamamlandi', updated_at: new Date().toISOString() })
          .eq('id', job.task_id);
      } catch {/* sessiz */ }
    }
    auditLog({ islem: 'QUEUE_COMPLETE', aciklama: `${job_id} tamamlandı`, sonuc: 'PASS' });
  },

  /** Boş mu? */
  isEmpty: (): boolean => {
    return Array.from(_kuyruk.values()).filter(j => j.status === 'bekliyor').length === 0;
  },
};

/**
 * pushJobHistory — Tamamlanmış işleri log'a ekle
 * KÖK NEDEN DÜZELTİLDİ: Artık gerçekten auditLog'a yazıyor.
 */
export function pushJobHistory(job: Partial<QueueJobType>): void {
  auditLog({
    islem:    'JOB_HISTORY',
    aciklama: `İş tamamlandı: ${job.job_id || 'bilinmiyor'} — ${job.title || ''}`,
    sonuc:    job.status === 'tamamlandi' ? 'PASS' : 'FAIL',
    veri:     job,
  });
}

export const getTaskQueue = () => QueueJob;
