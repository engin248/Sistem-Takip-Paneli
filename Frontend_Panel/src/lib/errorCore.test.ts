// ============================================================
// ERRORCORE TEST — Merkezi Hata Motoru Birim Testleri
// ============================================================

import { describe, it, expect, vi } from 'vitest';
import { ERR, processError, generateUID } from './errorCore';

describe('errorCore', () => {
  // ── UID ÜRETİMİ ──────────────────────────────────────────
  describe('generateUID', () => {
    it('UID-YYYYMMDD-HHMMSS-XXXX formatında üretir', () => {
      const uid = generateUID();
      expect(uid).toMatch(/^UID-\d{8}-\d{6}-[A-Z0-9]+$/);
    });

    it('her çağrıda benzersiz UID üretir', () => {
      const uids = new Set(Array.from({ length: 100 }, () => generateUID()));
      expect(uids.size).toBe(100);
    });
  });

  // ── HATA KODLARI ──────────────────────────────────────────
  describe('ERR sabitleri', () => {
    it('SYSTEM_GENERAL tanımlı', () => {
      expect(ERR.SYSTEM_GENERAL).toBe('ERR-Sistem Takip Paneli001-001');
    });

    it('TASK_CREATE tanımlı', () => {
      expect(ERR.TASK_CREATE).toBeDefined();
      expect(ERR.TASK_CREATE).toMatch(/^ERR-Sistem Takip Paneli001-/);
    });

    it('tüm kodlar ERR-Sistem Takip Paneli001 formatında', () => {
      for (const [, code] of Object.entries(ERR)) {
        expect(code).toMatch(/^ERR-Sistem Takip Paneli001-\d{3}$/);
      }
    });

    it('hiçbir kod çakışmıyor', () => {
      const codes = Object.values(ERR);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  // ── processError ──────────────────────────────────────────
  describe('processError', () => {
    it('console.error çağırır', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      processError(ERR.SYSTEM_GENERAL, new Error('test'), {
        kaynak: 'test.ts',
        islem: 'TEST',
      });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('string hata ile de çalışır', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      processError(ERR.SYSTEM_GENERAL, 'string hata', {
        kaynak: 'test.ts',
        islem: 'TEST',
      });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
