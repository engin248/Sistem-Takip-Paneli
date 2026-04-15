// src/core/taskQueue.ts
// ============================================================
// GÖREV KUYRUGU — In-Memory FIFO + Öncelik Desteği
// ============================================================
// Vercel serverless'ta kalıcı kuyruk yok.
// Her API isteği kendi kuyruğuyla ilgilenir (senkron işlem).
// Bu modül: state tutma + istatistik + son N iş kaydı.
// ============================================================

export type JobStatus =
  | 'bekliyor'
  | 'isleniyor'
  | 'tamamlandi'
  | 'hata'
  | 'reddedildi';

export interface QueueJob {
  /** Benzersiz iş ID */
  job_id: string;
  /** Ajana ait ID */
  agent_id: string;
  /** Ajan kod adı */
  agent_kod_adi: string;
  /** Ajan katmanı */
  agent_katman: string;
  /** Ham görev metni */
  task: string;
  /** Öncelik: 1 (en düşük) – 5 (kritik) */
  priority: number;
  /** Mevcut durum */
  status: JobStatus;
  /** Oluşturulma zamanı (ISO) */
  created_at: string;
  /** İşlem başlangıcı (ISO) */
  started_at?: string;
  /** İşlem bitişi (ISO) */
  completed_at?: string;
  /** AI veya kural tabanlı yanıt */
  result?: string;
  /** Hata mesajı */
  error?: string;
  /** İşlem süresi (ms) */
  duration_ms?: number;
}

// ── RING BUFFER — Son 100 iş ──────────────────────────────
const MAX_HISTORY = 100;
const jobHistory: QueueJob[] = [];

export function pushJobHistory(job: QueueJob): void {
  if (jobHistory.length >= MAX_HISTORY) {
    jobHistory.shift(); // en eskiyi çıkar
  }
  jobHistory.push({ ...job });
}

export function getJobHistory(): QueueJob[] {
  return [...jobHistory].reverse(); // en yeni başta
}

export function getJobById(jobId: string): QueueJob | undefined {
  return jobHistory.find(j => j.job_id === jobId);
}

// ── GEÇMİŞ İSTATİSTİKLERİ ────────────────────────────────
export interface QueueStats {
  toplam: number;
  tamamlandi: number;
  hata: number;
  reddedildi: number;
  basari_orani: number;
  ort_sure_ms: number;
}

export function getQueueStats(): QueueStats {
  const toplam      = jobHistory.length;
  const tamamlandi  = jobHistory.filter(j => j.status === 'tamamlandi').length;
  const hata        = jobHistory.filter(j => j.status === 'hata').length;
  const reddedildi  = jobHistory.filter(j => j.status === 'reddedildi').length;

  const durations   = jobHistory
    .filter(j => j.duration_ms !== undefined)
    .map(j => j.duration_ms as number);

  const ort_sure_ms = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  const basari_orani = toplam > 0
    ? Math.round((tamamlandi / toplam) * 100)
    : 100;

  return { toplam, tamamlandi, hata, reddedildi, basari_orani, ort_sure_ms };
}

// ── JOB ID ÜRETİCİ ───────────────────────────────────────
export function generateJobId(agentId: string): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `JOB-${agentId}-${ts}-${rnd}`;
}
