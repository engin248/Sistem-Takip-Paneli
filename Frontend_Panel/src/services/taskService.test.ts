import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Task Service — Görev CRUD Unit Testleri
// Bağlantı kontrolü, tip doğrulaması
// NOT: Supabase çağrıları mock edilmeden integration test olur.
// Bu dosyada sadece lokal mantık test edilir.
// ============================================================

// Supabase modülünü mock'la
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
  },
  validateSupabaseConnection: vi.fn(() => ({ isValid: false, missingVars: ['SUPABASE_URL'] })),
}));

vi.mock('./auditService', () => ({
  logAudit: vi.fn().mockResolvedValue({ success: true }),
  logAuditError: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/permissionGuard', () => ({
  guardWritePermission: vi.fn().mockResolvedValue(true),
  getTaskOwner: vi.fn().mockReturnValue(null),
}));

describe('TaskService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── BAĞLANTI KONTROLÜ ─────────────────────────────────────
  describe('bağlantı kontrolü', () => {
    it('validateSupabaseConnection — geçersiz bağlantıda false döner', async () => {
      const { validateSupabaseConnection } = await import('@/lib/supabase');
      const result = validateSupabaseConnection();
      expect(result.isValid).toBe(false);
      expect(result.missingVars).toContain('SUPABASE_URL');
    });
  });

  // ── FETCH TASKS ───────────────────────────────────────────
  describe('fetchTasksFromDB', () => {
    it('bağlantı geçersizse erken dönüş yapar', async () => {
      const { fetchTasksFromDB } = await import('./taskService');
      // validateSupabaseConnection false dönüyor → fetchTasksFromDB erken çıkmalı
      await fetchTasksFromDB();
      // Supabase.from çağrılmadı çünkü bağlantı geçersiz
      const { supabase } = await import('@/lib/supabase');
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  // ── UPDATE STATUS ─────────────────────────────────────────
  describe('updateStatus', () => {
    it('bağlantı geçersizse çalışmaz', async () => {
      const { updateStatus } = await import('./taskService');
      await updateStatus('test-id', 'devam_ediyor');
      const { supabase } = await import('@/lib/supabase');
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  // ── DELETE TASK ───────────────────────────────────────────
  describe('deleteTask', () => {
    it('bağlantı geçersizse çalışmaz', async () => {
      const { deleteTask } = await import('./taskService');
      await deleteTask('test-id');
      const { supabase } = await import('@/lib/supabase');
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  // ── ARCHIVE TASK ──────────────────────────────────────────
  describe('archiveTask', () => {
    it('bağlantı geçersizse çalışmaz', async () => {
      const { archiveTask } = await import('./taskService');
      await archiveTask('test-id');
      const { supabase } = await import('@/lib/supabase');
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });
});
