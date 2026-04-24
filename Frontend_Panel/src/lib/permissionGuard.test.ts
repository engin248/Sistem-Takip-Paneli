import { describe, it, expect, beforeEach } from 'vitest';
import { useOperatorStore } from '../store/useOperatorStore';
import { checkWritePermission } from './permissionGuard';

// ============================================================
// Permission Guard — Dosya Seviyesinde Kilitleme Testleri
// Operatör yetki doğrulaması, rol bazlı erişim kontrolü
// ============================================================

describe('Permission Guard', () => {
  beforeEach(() => {
    // Her testten önce operatörü sıfırla
    useOperatorStore.setState({
      operator: { name: 'GOZCU', role: 'OPERATÖR' },
    });
  });

  // ── OPERATÖR YETKİ KONTROLÜ ───────────────────────────────
  describe('checkWritePermission', () => {
    it('operatör kendi görevine yazabilir', () => {
      const result = checkWritePermission('task-1', 'GOZCU', 'UPDATE');
      expect(result.granted).toBe(true);
    });

    it('operatör başkasının görevine yazamaz', () => {
      const result = checkWritePermission('task-1', 'ICRA', 'UPDATE');
      expect(result.granted).toBe(false);
      expect(result.reason).toContain('yazma yetkisine sahip değil');
    });

    it('case-insensitive karşılaştırma yapar', () => {
      const result = checkWritePermission('task-1', 'gozcu', 'UPDATE');
      expect(result.granted).toBe(true);
    });
  });

  // ── YÖNETİCİ ERİŞİMİ ─────────────────────────────────────
  describe('yönetici erişimi', () => {
    it('YÖNETİCİ tüm görevlere yazabilir', () => {
      useOperatorStore.setState({
        operator: { name: 'KOMUTAN', role: 'YÖNETİCİ' },
      });
      const result = checkWritePermission('task-1', 'ICRA', 'DELETE');
      expect(result.granted).toBe(true);
    });

    it('ADMIN tüm görevlere yazabilir', () => {
      useOperatorStore.setState({
        operator: { name: 'ADMIN', role: 'ADMIN' },
      });
      const result = checkWritePermission('task-1', 'GOZCU', 'ARCHIVE');
      expect(result.granted).toBe(true);
    });
  });

  // ── OPERATOR STORE ────────────────────────────────────────
  describe('useOperatorStore', () => {
    it('isElevated — yönetici için true döner', () => {
      useOperatorStore.setState({
        operator: { name: 'ADMIN', role: 'ADMIN' },
      });
      expect(useOperatorStore.getState().isElevated()).toBe(true);
    });

    it('isElevated — operatör için false döner', () => {
      expect(useOperatorStore.getState().isElevated()).toBe(false);
    });

    it('setOperator — operatör değiştirir', () => {
      useOperatorStore.getState().setOperator({ name: 'MUHAFIZ', role: 'OPERATÖR' });
      expect(useOperatorStore.getState().operator.name).toBe('MUHAFIZ');
    });
  });
});
