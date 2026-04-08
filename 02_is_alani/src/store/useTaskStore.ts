import { create } from 'zustand';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: string;
}

interface TaskState {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [], // DENETİM KRİTERİ: Başlangıçta boş tanımlandı.
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
}));
