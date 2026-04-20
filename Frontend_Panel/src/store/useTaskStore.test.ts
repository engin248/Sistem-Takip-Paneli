import { describe, it, expect, beforeEach } from 'vitest';
import { useTaskStore, type Task } from './useTaskStore';

// ============================================================
// useTaskStore — Zustand Store Unit Testleri
// Task CRUD, filtreleme, state yönetimi
// ============================================================

const mockTask: Task = {
  id: 'test-uuid-001',
  task_code: 'TSK-001',
  title: 'Test Görevi',
  assigned_to: 'GOZCU',
  assigned_by: 'SISTEM',
  status: 'beklemede',
  priority: 'normal',
  evidence_required: true,
  evidence_provided: false,
  retry_count: 0,
  created_at: '2026-04-13T00:00:00Z',
  updated_at: '2026-04-13T00:00:00Z',
  is_archived: false,
};

const mockTask2: Task = {
  ...mockTask,
  id: 'test-uuid-002',
  task_code: 'TSK-002',
  title: 'İkinci Görev',
  assigned_to: 'ICRA',
  status: 'devam_ediyor',
  priority: 'yuksek',
};

describe('useTaskStore', () => {
  beforeEach(() => {
    useTaskStore.setState({ tasks: [], error: null, lastSyncAt: null });
  });

  // ── SET TASKS ──────────────────────────────────────────────
  describe('setTasks', () => {
    it('görev listesini set eder', () => {
      useTaskStore.getState().setTasks([mockTask]);
      const { tasks, error, lastSyncAt } = useTaskStore.getState();
      expect(tasks).toHaveLength(1);
      const first = tasks[0]!;
      expect(first.id).toBe('test-uuid-001');
      expect(error).toBeNull();
      expect(lastSyncAt).toBeTruthy();
    });

    it('boş liste set edilebilir', () => {
      useTaskStore.getState().setTasks([mockTask]);
      useTaskStore.getState().setTasks([]);
      expect(useTaskStore.getState().tasks).toHaveLength(0);
    });
  });

  // ── ADD TASK ───────────────────────────────────────────────
  describe('addTask', () => {
    it('yeni görev ekler — başa eklenir', () => {
      useTaskStore.getState().setTasks([mockTask]);
      useTaskStore.getState().addTask(mockTask2);
      const { tasks } = useTaskStore.getState();
      expect(tasks).toHaveLength(2);
      const first = tasks[0]!;
      expect(first.id).toBe('test-uuid-002');
    });
  });

  // ── UPDATE TASK STATUS ────────────────────────────────────
  describe('updateTaskStatus', () => {
    it('görev durumunu günceller', () => {
      useTaskStore.getState().setTasks([mockTask]);
      useTaskStore.getState().updateTaskStatus('test-uuid-001', 'devam_ediyor');
      const task = useTaskStore.getState().tasks[0]!;
      expect(task.status).toBe('devam_ediyor');
      expect(task.updated_at).not.toBe(mockTask.updated_at);
    });

    it('olmayan ID ile güncelleme yapılmaz', () => {
      useTaskStore.getState().setTasks([mockTask]);
      useTaskStore.getState().updateTaskStatus('nonexistent', 'tamamlandi');
      const first = useTaskStore.getState().tasks[0]!;
      expect(first.status).toBe('beklemede');
    });
  });

  // ── UPDATE TASK (PARTIAL) ─────────────────────────────────
  describe('updateTask', () => {
    it('kısmi güncelleme yapar', () => {
      useTaskStore.getState().setTasks([mockTask]);
      useTaskStore.getState().updateTask('test-uuid-001', { title: 'Güncel Başlık', priority: 'kritik' });
      const task = useTaskStore.getState().tasks[0]!;
      expect(task.title).toBe('Güncel Başlık');
      expect(task.priority).toBe('kritik');
      expect(task.assigned_to).toBe('GOZCU');
    });
  });

  // ── REMOVE TASK ───────────────────────────────────────────
  describe('removeTask', () => {
    it('görevi siler', () => {
      useTaskStore.getState().setTasks([mockTask, mockTask2]);
      useTaskStore.getState().removeTask('test-uuid-001');
      const { tasks } = useTaskStore.getState();
      expect(tasks).toHaveLength(1);
      const remaining = tasks[0]!;
      expect(remaining.id).toBe('test-uuid-002');
    });
  });

  // ── SELECTORS ─────────────────────────────────────────────
  describe('selectors', () => {
    beforeEach(() => {
      useTaskStore.getState().setTasks([mockTask, mockTask2]);
    });

    it('getTaskById — doğru görevi döner', () => {
      const task = useTaskStore.getState().getTaskById('test-uuid-002');
      expect(task?.title).toBe('İkinci Görev');
    });

    it('getTaskById — olmayan ID için undefined döner', () => {
      const task = useTaskStore.getState().getTaskById('nonexistent');
      expect(task).toBeUndefined();
    });

    it('getTasksByStatus — duruma göre filtreler', () => {
      const result = useTaskStore.getState().getTasksByStatus('beklemede');
      expect(result).toHaveLength(1);
      const first = result[0]!;
      expect(first.id).toBe('test-uuid-001');
    });

    it('getTasksByPriority — önceliğe göre filtreler', () => {
      const result = useTaskStore.getState().getTasksByPriority('yuksek');
      expect(result).toHaveLength(1);
      const first = result[0]!;
      expect(first.id).toBe('test-uuid-002');
    });
  });

  // ── ERROR STATE ───────────────────────────────────────────
  describe('setError', () => {
    it('hata mesajı set eder', () => {
      useTaskStore.getState().setError('Bağlantı hatası');
      expect(useTaskStore.getState().error).toBe('Bağlantı hatası');
    });

    it('hata temizlenir', () => {
      useTaskStore.getState().setError('Hata');
      useTaskStore.getState().setError(null);
      expect(useTaskStore.getState().error).toBeNull();
    });
  });
});
