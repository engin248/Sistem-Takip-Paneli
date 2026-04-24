import { describe, it, expect } from 'vitest';
import { translations, t, type Lang, type TranslationKeys } from './i18n';

// ============================================================
// i18n — Çoklu Dil Sözlüğü Unit Testleri
// TR / AR dil tutarlılığı, key eşleşmesi, tip güvenliği
// ============================================================

describe('i18n', () => {
  // ── DİL ANAHTARI TUTARLILIĞI ──────────────────────────────
  describe('dil anahtarı tutarlılığı', () => {
    const trKeys = Object.keys(translations.tr).sort();
    const arKeys = Object.keys(translations.ar).sort();

    it('TR ve AR aynı sayıda anahtara sahip', () => {
      expect(trKeys.length).toBe(arKeys.length);
    });

    it('TR ve AR aynı anahtar setini paylaşır', () => {
      expect(trKeys).toEqual(arKeys);
    });

    it('TR sözlüğünde boş değer yok', () => {
      for (const [key, value] of Object.entries(translations.tr)) {
        expect(value, `TR key "${key}" boş`).toBeTruthy();
      }
    });

    it('AR sözlüğünde boş değer yok', () => {
      for (const [key, value] of Object.entries(translations.ar)) {
        expect(value, `AR key "${key}" boş`).toBeTruthy();
      }
    });
  });

  // ── t() FONKSİYONU ────────────────────────────────────────
  describe('t() fonksiyonu', () => {
    it('TR dilinde doğru sözlüğü döner', () => {
      const tr = t('tr');
      expect(tr.panelTitle).toBe('S\u0130STEM TAK\u0130P PANEL\u0130');
      expect(tr.dashboardTitle).toBe('MERKEZ OPERASYON DA\u0130RE BA\u015eKANLI\u011eI');
    });

    it('AR dilinde doğru sözlüğü döner', () => {
      const ar = t('ar');
      expect(ar.panelTitle).toBe('Sistem Takip Paneli-لوحة');
      expect(ar.dashboardTitle).toBe('مركز عمليات Sistem Takip Paneli');
    });

    it('kritik UI key\'leri mevcut', () => {
      const requiredKeys: TranslationKeys[] = [
        'panelTitle', 'dashboardTitle', 'placeholder', 'addButton',
        'statusPending', 'statusInProgress', 'statusCompleted',
        'healthTitle', 'alarmTitle', 'tgSendTitle', 'kanbanTitle',
      ];
      const tr = t('tr');
      for (const key of requiredKeys) {
        expect(tr[key], `Eksik key: ${key}`).toBeTruthy();
      }
    });
  });
});
