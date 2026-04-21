import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

// ============================================================
// TASK TİP TANIMLARI
// Kaynak: 01_komutlar/supabase_schema.sql — Satır 13-59
// Doktrin: SQL CHECK kısıtlamalarıyla HARFİYEN eşleşir
// ============================================================

// Status enum — SQL CHECK (satır 27-34) ile birebir eşleşir
export type TaskStatus =
  | 'onay_bekliyor'   // Otonom onay bekleme (Sıfır inisiyatif KILIDI)
  | 'beklemede'       // Henüz başlanmadı
  | 'devam_ediyor'    // İşlem sürüyor
  | 'dogrulama'       // Doğrulama aşamasında
  | 'tamamlandi'      // Tamamlandı
  | 'reddedildi'      // Reddedildi
  | 'iptal';          // İptal edildi

// Priority enum — SQL CHECK (satır 35-36) ile birebir eşleşir
export type TaskPriority =
  | 'kritik'          // Kritik öncelik
  | 'yuksek'          // Yüksek öncelik
  | 'normal'          // Normal öncelik
  | 'dusuk';          // Düşük öncelik

// ============================================================
// TASK INTERFACE
// SQL NOT NULL → zorunlu alan (? yok)
// SQL NULL olabilir → opsiyonel alan (? var)
// ============================================================
export interface Task {
  // --- Zorunlu alanlar (SQL: NOT NULL) ---
  id: string;                              // UUID PRIMARY KEY
  task_code: string;                       // VARCHAR(50) NOT NULL UNIQUE
  title: string;                           // VARCHAR(255) NOT NULL
  assigned_to: string;                     // VARCHAR(100) NOT NULL
  assigned_by: string;                     // VARCHAR(100) NOT NULL DEFAULT 'SISTEM'
  status: TaskStatus;                      // VARCHAR(30) NOT NULL DEFAULT 'beklemede'
  priority: TaskPriority;                  // VARCHAR(20) NOT NULL DEFAULT 'normal'
  evidence_required: boolean;              // BOOLEAN NOT NULL DEFAULT TRUE
  evidence_provided: boolean;              // BOOLEAN NOT NULL DEFAULT FALSE
  retry_count: number;                     // INTEGER NOT NULL DEFAULT 0
  created_at: string;                      // TIMESTAMPTZ NOT NULL DEFAULT NOW()
  updated_at: string;                      // TIMESTAMPTZ NOT NULL DEFAULT NOW()
  is_archived: boolean;                    // BOOLEAN NOT NULL DEFAULT FALSE

  // --- Opsiyonel alanlar (SQL: NULL olabilir) ---
  description?: string | null;            // TEXT
  evidence_urls?: string[] | null;        // TEXT[]
  error_code?: string | null;             // VARCHAR(30)
  error_message?: string | null;          // TEXT
  started_at?: string | null;             // TIMESTAMPTZ
  completed_at?: string | null;           // TIMESTAMPTZ
  due_date?: string | null;               // TIMESTAMPTZ — İş emri son tarihi
  parent_task_id?: string | null;         // UUID REFERENCES tasks(id)
  metadata?: Record<string, unknown>;     // JSONB DEFAULT '{}'
}

// ============================================================
// ZUSTAND STORE — Devtools + subscribeWithSelector
// ============================================================
// Devtools: Redux DevTools ile debug
// subscribeWithSelector: Granüler selector bazlı subscribe
// ============================================================
interface TaskState {
  tasks: Task[];
  error: string | null;
  lastSyncAt: string | null;
  setTasks: (tasks: Task[]) => void;
  setError: (error: string | null) => void;
  addTask: (task: Task) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  getTaskById: (id: string) => Task | undefined;
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTasksByPriority: (priority: TaskPriority) => Task[];
}

export const useTaskStore = create<TaskState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      tasks: [],
      error: null,
      lastSyncAt: null,

      setTasks: (tasks) => set(
        { tasks, error: null, lastSyncAt: new Date().toISOString() },
        false,
        'setTasks'
      ),

      setError: (error) => set({ error }, false, 'setError'),

      addTask: (task) => set(
        (state) => ({ tasks: [task, ...state.tasks] }),
        false,
        'addTask'
      ),

      updateTaskStatus: (id, status) => set(
        (state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, status, updated_at: new Date().toISOString() } : t
          ),
        }),
        false,
        'updateTaskStatus'
      ),

      updateTask: (id: string, updates: Partial<Task>) => set(
        (state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t
          ),
        }),
        false,
        'updateTask'
      ),

      removeTask: (id) => set(
        (state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }),
        false,
        'removeTask'
      ),

      // ── SELECTÖRler ─────────────────────────────────────────
      getTaskById: (id) => get().tasks.find((t) => t.id === id),
      getTasksByStatus: (status) => get().tasks.filter((t) => t.status === status),
      getTasksByPriority: (priority) => get().tasks.filter((t) => t.priority === priority),
    })),
    { name: 'Sistem Takip Paneli-TaskStore', enabled: process.env.NODE_ENV !== 'production' }
  )
);
