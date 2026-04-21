// src/core/taskQueue.ts
// ============================================================
// GÖREV KUYRUGU — In-Memory FIFO + Dosya Persist
// ============================================================
// Sunucu yeniden başlatıldığında veri kaybını önlemek için
// iş geçmişi JSON dosyasına persist edilir.
//
// KALİCILIK STRATEJİSİ:
//   1. Her pushJobHistory() çağrısında dosyaya yaz
//   2. Modül ilk yüklendiğinde dosyadan oku
//   3. Dosya I/O hatası → sessiz fail, in-memory devam
// ============================================================

import * as fs from 'fs';
import * as path from 'path';
import { alarmUret, ALARM_SEVIYE } from '@/services/alarmService';

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

// ── PERSIST KATMANI ─────────────────────────────────────────
// .agent_memory dizinine JSON olarak persist eder.
// Vercel serverless'ta bu dizin read-only olabilir → sessiz fail.
// ─────────────────────────────────────────────────────────────

const PERSIST_DIR = path.join(process.cwd(), '.agent_memory');
const PERSIST_FILE = path.join(PERSIST_DIR, 'job_history.json');

/** Dosyadan iş geçmişini yükle — modül ilk yüklendiğinde çağrılır */
function loadFromDisk(): QueueJob[] {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const raw = fs.readFileSync(PERSIST_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as QueueJob[];
      if (Array.isArray(parsed)) {
        return parsed.slice(-MAX_HISTORY); // son MAX_HISTORY kadar al
      }
    }
  } catch {
    // Dosya okunamadı — sessiz fail, boş dizi dön
  }
  return [];
}

/** İş geçmişini dosyaya yaz — her push'ta çağrılır */
function persistToDisk(jobs: QueueJob[]): void {
  try {
    if (!fs.existsSync(PERSIST_DIR)) {
      fs.mkdirSync(PERSIST_DIR, { recursive: true });
    }
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(jobs), 'utf-8');
  } catch {
    // Dosya yazılamadı — sessiz fail (Vercel read-only, vb.)
  }
}

// ── RING BUFFER — Son 100 iş ──────────────────────────────
const MAX_HISTORY = 100;
const jobHistory: QueueJob[] = loadFromDisk();

export function pushJobHistory(job: QueueJob): void {
  if (jobHistory.length >= MAX_HISTORY) {
    jobHistory.shift(); // en eskiyi çıkar
  }
  jobHistory.push({ ...job });
  
  // Dosyaya persist
  persistToDisk(jobHistory);

  // ── ALARM MERKEZİ ENTEGRASYONU (SCR-16) ───────────────────
  // İş hata aldıysa veya reddedildiyse alarm üret
  if (job.status === 'hata' || job.status === 'reddedildi') {
    const seviye = job.priority >= 4 ? ALARM_SEVIYE.CRITICAL : ALARM_SEVIYE.WARNING;
    void alarmUret({
      modul: 'JOB_MONITOR',
      baslik: `İŞ HATASI: ${job.agent_kod_adi}`,
      aciklama: `[${job.job_id}] ${job.agent_kod_adi} (${job.agent_katman}) görevde hata aldı.\n` +
                `Hata: ${job.error || 'Belirtilmedi'}\n` +
                `Görev: ${job.task.slice(0, 50)}...`,
      seviye,
    });
  }

  // Başarı oranı denetimi — Circuit Breaker Mantığı
  const stats = getQueueStats();
  if (stats.toplam >= 5 && stats.basari_orani < 70) {
    void alarmUret({
      modul: 'JOB_MONITOR',
      baslik: 'KRİTİK BAŞARI DÜŞÜŞÜ',
      aciklama: `Sistem başarı oranı %${stats.basari_orani}'e düştü! (Toplam: ${stats.toplam}, Hata: ${stats.hata})\nOperasyonel risk tespiti.`,
      seviye: ALARM_SEVIYE.EMERGENCY,
    });
  }
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


