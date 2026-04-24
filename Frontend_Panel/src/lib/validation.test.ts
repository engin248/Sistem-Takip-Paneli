// ============================================================
// VALIDATION TEST — ZOD G-0 Giriş Filtresi Birim Testleri
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  CreateTaskSchema,
  UpdateTaskStatusSchema,
  BoardDecisionSchema,
  validateInput,
} from './validation';

describe('ZOD Validation', () => {
  // ── CreateTaskSchema ──────────────────────────────────────
  describe('CreateTaskSchema', () => {
    it('geçerli görev verisini kabul eder', () => {
      const result = CreateTaskSchema.safeParse({
        title: 'Test Görevi',
        priority: 'normal',
        assigned_to: 'OPERATÖR',
      });
      expect(result.success).toBe(true);
    });

    it('boş başlığı reddeder', () => {
      const result = CreateTaskSchema.safeParse({
        title: '',
        priority: 'normal',
      });
      expect(result.success).toBe(false);
    });

    it('2 karakterlik başlığı reddeder', () => {
      const result = CreateTaskSchema.safeParse({
        title: 'ab',
        priority: 'normal',
      });
      expect(result.success).toBe(false);
    });

    it('geçersiz önceliği reddeder', () => {
      const result = CreateTaskSchema.safeParse({
        title: 'Test Görevi',
        priority: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('varsayılan değerleri atar', () => {
      const result = CreateTaskSchema.safeParse({
        title: 'Test Görevi',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('normal');
        expect(result.data.assigned_to).toBe('SISTEM');
      }
    });
  });

  // ── UpdateTaskStatusSchema ────────────────────────────────
  describe('UpdateTaskStatusSchema', () => {
    it('geçerli UUID ve status kabul eder', () => {
      const result = UpdateTaskStatusSchema.safeParse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        newStatus: 'devam_ediyor',
      });
      expect(result.success).toBe(true);
    });

    it('geçersiz UUID reddeder', () => {
      const result = UpdateTaskStatusSchema.safeParse({
        taskId: 'not-a-uuid',
        newStatus: 'beklemede',
      });
      expect(result.success).toBe(false);
    });

    it('geçersiz status reddeder', () => {
      const result = UpdateTaskStatusSchema.safeParse({
        taskId: '550e8400-e29b-41d4-a716-446655440000',
        newStatus: 'invalid_status',
      });
      expect(result.success).toBe(false);
    });
  });

  // ── BoardDecisionSchema ───────────────────────────────────
  describe('BoardDecisionSchema', () => {
    it('geçerli karar verisini kabul eder', () => {
      const result = BoardDecisionSchema.safeParse({
        title: 'Deploy Kararı',
        category: 'DEPLOYMENT',
      });
      expect(result.success).toBe(true);
    });

    it('geçersiz kategoriyi reddeder', () => {
      const result = BoardDecisionSchema.safeParse({
        title: 'Test',
        category: 'INVALID',
      });
      expect(result.success).toBe(false);
    });
  });

  // ── validateInput Guard ───────────────────────────────────
  describe('validateInput', () => {
    it('başarılı validasyonda success: true döner', () => {
      const result = validateInput(CreateTaskSchema, {
        title: 'Geçerli Görev',
        priority: 'yuksek',
      }, { kaynak: 'test', islem: 'TEST' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('başarısız validasyonda errors döner', () => {
      const result = validateInput(CreateTaskSchema, {
        title: '',
      }, { kaynak: 'test', islem: 'TEST' });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
