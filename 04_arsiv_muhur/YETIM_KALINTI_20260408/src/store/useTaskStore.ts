import { create } from 'zustand';

// ============================================================
// TASK TİP TANIMLARI
// Kaynak: 01_komutlar/supabase_schema.sql — Satır 13-59
// Doktrin: SQL CHECK kısıtlamalarıyla HARFİYEN eşleşir
// ============================================================

// Status enum — SQL CHECK (satır 27-34) ile birebir eşleşir
export type TaskStatus =
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

  // --- Opsiyonel alanlar (SQL: NULL olabilir) ---
  description?: string | null;            // TEXT
  evidence_urls?: string[] | null;        // TEXT[]
  error_code?: string | null;             // VARCHAR(30)
  error_message?: string | null;          // TEXT
  started_at?: string | null;             // TIMESTAMPTZ
  completed_at?: string | null;           // TIMESTAMPTZ
  parent_task_id?: string | null;         // UUID REFERENCES tasks(id)
  metadata?: Record<string, unknown>;     // JSONB DEFAULT '{}'
}

// ============================================================
// ZUSTAND STORE
// ============================================================
interface TaskState {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTaskStatus: (id, status) => set((state) => ({
    tasks: state.tasks.map((t) => t.id === id ? { ...t, status } : t),
  })),
}));
