/**
 * GÖREV STORE — Zustand Global State Management
 * ═══════════════════════════════════════════════
 * Tüm görev durumlarını yöneten merkezi store.
 * Görev oluşturma, güncelleme, silme ve filtreleme işlemleri.
 */

import { create } from 'zustand';

// ─── TİP TANIMLARI ────────────────────────────────────────────
export interface Task {
    id: string;
    gorev_kodu: string;
    oncelik: 'P0' | 'P1' | 'P2';
    amac: string;
    neden: string;
    durum: 'pending' | 'running' | 'validation' | 'done' | 'rejected';
    yapan: string;
    kontrol_eden: string | null;
    confidence: number | null;
    katman1_execution: boolean | null;
    katman2_teknik: boolean | null;
    katman3_misyon: boolean | null;
    olusturulma: string;
    baslama: string | null;
    bitirme: string | null;
    guncelleme: string | null;
}

export interface TaskFilter {
    durum: string | null;
    oncelik: string | null;
    arama: string;
}

interface TaskStore {
    // ─── STATE ───────────────────────────────────────────
    tasks: Task[];
    selectedTaskId: string | null;
    filter: TaskFilter;
    isLoading: boolean;
    error: string | null;

    // ─── ACTIONS ─────────────────────────────────────────
    setTasks: (tasks: Task[]) => void;
    addTask: (task: Task) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    removeTask: (id: string) => void;
    selectTask: (id: string | null) => void;
    setFilter: (filter: Partial<TaskFilter>) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearTasks: () => void;

    // ─── COMPUTED ────────────────────────────────────────
    getFilteredTasks: () => Task[];
    getTaskById: (id: string) => Task | undefined;
    getTaskCounts: () => Record<string, number>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
    // ─── INITIAL STATE ──────────────────────────────────
    tasks: [],
    selectedTaskId: null,
    filter: {
        durum: null,
        oncelik: null,
        arama: '',
    },
    isLoading: false,
    error: null,

    // ─── ACTIONS ────────────────────────────────────────
    setTasks: (tasks: Task[]) => set({ tasks, error: null }),

    addTask: (task: Task) => set((state) => ({
        tasks: [task, ...state.tasks],
        error: null,
    })),

    updateTask: (id: string, updates: Partial<Task>) => set((state) => ({
        tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates } : t),
    })),

    removeTask: (id: string) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
    })),

    selectTask: (id: string | null) => set({ selectedTaskId: id }),

    setFilter: (filter: Partial<TaskFilter>) => set((state) => ({
        filter: { ...state.filter, ...filter },
    })),

    setLoading: (isLoading: boolean) => set({ isLoading }),

    setError: (error: string | null) => set({ error }),

    clearTasks: () => set({ tasks: [], selectedTaskId: null, error: null }),

    // ─── COMPUTED ───────────────────────────────────────
    getFilteredTasks: (): Task[] => {
        const { tasks, filter } = get();
        return tasks.filter((t) => {
            if (filter.durum && t.durum !== filter.durum) return false;
            if (filter.oncelik && t.oncelik !== filter.oncelik) return false;
            if (filter.arama) {
                const arama = filter.arama.toLowerCase();
                return (
                    t.gorev_kodu.toLowerCase().includes(arama) ||
                    t.amac.toLowerCase().includes(arama) ||
                    t.yapan.toLowerCase().includes(arama)
                );
            }
            return true;
        });
    },

    getTaskById: (id: string): Task | undefined => {
        return get().tasks.find((t) => t.id === id);
    },

    getTaskCounts: (): Record<string, number> => {
        const { tasks } = get();
        return {
            toplam: tasks.length,
            pending: tasks.filter((t) => t.durum === 'pending').length,
            running: tasks.filter((t) => t.durum === 'running').length,
            validation: tasks.filter((t) => t.durum === 'validation').length,
            done: tasks.filter((t) => t.durum === 'done').length,
            rejected: tasks.filter((t) => t.durum === 'rejected').length,
        };
    },
}));
