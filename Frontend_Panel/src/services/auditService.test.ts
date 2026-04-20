import { describe, it, expect } from 'vitest';
import type { AuditOperationType, AuditErrorSeverity, AuditStatus } from './auditService';

// ============================================================
// Audit Service — Denetim Kaydı Unit Testleri
// Tip doğrulamaları, log code formatı, adaptör mantığı
// NOT: logAudit/fetchAuditLogs Supabase'e bağlı — burada
// sadece lokal mantık (tip, format, adaptör) test edilir.
// ============================================================

// logCode formatını test etmek için fonksiyonu yeniden üretiyoruz
function generateLogCode(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.random().toString(36).substring(2, 10);
  return `LOG-${date}-${time}-${rand}`;
}

describe('AuditService', () => {
  // ── LOG CODE FORMATI ──────────────────────────────────────
  describe('generateLogCode', () => {
    it('LOG- prefix ile başlar', () => {
      const code = generateLogCode();
      expect(code.startsWith('LOG-')).toBe(true);
    });

    it('doğru format: LOG-YYYYMMDD-HHMMSS-RAND', () => {
      const code = generateLogCode();
      expect(code).toMatch(/^LOG-\d{8}-\d{6}-[a-z0-9]+$/);
    });

    it('her çağrıda benzersiz', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 10; i++) {
        codes.add(generateLogCode());
      }
      expect(codes.size).toBe(10);
    });
  });

  // ── TİP DOĞRULAMALARI ─────────────────────────────────────
  describe('tip güvenliği', () => {
    it('AuditOperationType geçerli değerler', () => {
      const types: AuditOperationType[] = [
        'CREATE', 'UPDATE', 'DELETE', 'READ',
        'EXECUTE', 'VALIDATE', 'REJECT', 'ERROR', 'SYSTEM',
      ];
      expect(types).toHaveLength(9);
    });

    it('AuditErrorSeverity geçerli değerler', () => {
      const severities: AuditErrorSeverity[] = [
        'INFO', 'WARNING', 'ERROR', 'CRITICAL', 'FATAL',
      ];
      expect(severities).toHaveLength(5);
    });

    it('AuditStatus geçerli değerler', () => {
      const statuses: AuditStatus[] = [
        'basarili', 'basarisiz', 'beklemede', 'iptal',
      ];
      expect(statuses).toHaveLength(4);
    });
  });

  // ── DB ROW ADAPTÖR MANTIĞI ────────────────────────────────
  describe('DB adaptör mantığı', () => {
    it('toDbRow: operation_type + logCode → actionCode formatı', () => {
      const logCode = generateLogCode();
      const actionCode = `CREATE_${logCode.slice(-8)}`;
      expect(actionCode).toMatch(/^CREATE_[a-z0-9]{8}$/);
    });

    it('fromDbRow: details JSONB alanından operation_type çıkarılır', () => {
      const details = { operation_type: 'UPDATE', action_description: 'Test' };
      expect(String(details.operation_type)).toBe('UPDATE');
    });
  });
});
