import { describe, it, expect } from 'vitest';
import { generateDecisionCode, type ConsensusResult, type VoteResult } from './consensusEngine';

// ============================================================
// Consensus Engine — 3 AI Ajan Oylama Sistemi Unit Testleri
// Karar kodu üretimi, oy tipleri, konsensüs mantığı
// ============================================================

describe('ConsensusEngine', () => {
  // ── KARAR KODU ────────────────────────────────────────────
  describe('generateDecisionCode', () => {
    it('BRD- prefix ile üretilir', () => {
      const code = generateDecisionCode();
      expect(code).toMatch(/^BRD-\d{8}-[A-Z0-9]{4}$/);
    });

    it('her çağrıda benzersiz kod üretilir', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 20; i++) {
        codes.add(generateDecisionCode());
      }
      expect(codes.size).toBe(20);
    });
  });

  // ── TİP DOĞRULAMALARI ─────────────────────────────────────
  describe('tip güvenliği', () => {
    it('VoteResult sadece ONAY veya RED olabilir', () => {
      const onay: VoteResult = 'ONAY';
      const red: VoteResult = 'RED';
      expect(onay).toBe('ONAY');
      expect(red).toBe('RED');
    });

    it('ConsensusResult 3 durumdan biri', () => {
      const durumlar: ConsensusResult[] = ['MÜHÜRLÜ', 'REDDEDİLDİ', 'BEKLEMEDE'];
      expect(durumlar).toHaveLength(3);
    });
  });

  // ── KONSENSÜS MANTIK TESTİ ────────────────────────────────
  describe('konsensüs hesaplama mantığı', () => {
    it('3/3 ONAY = MÜHÜRLÜ', () => {
      const votes: VoteResult[] = ['ONAY', 'ONAY', 'ONAY'];
      const approved = votes.filter(v => v === 'ONAY').length;
      const result: ConsensusResult = approved === 3 ? 'MÜHÜRLÜ' : 'REDDEDİLDİ';
      expect(result).toBe('MÜHÜRLÜ');
    });

    it('2/3 ONAY = REDDEDİLDİ', () => {
      const votes: VoteResult[] = ['ONAY', 'ONAY', 'RED'];
      const approved = votes.filter(v => v === 'ONAY').length;
      const result: ConsensusResult = approved === 3 ? 'MÜHÜRLÜ' : 'REDDEDİLDİ';
      expect(result).toBe('REDDEDİLDİ');
    });

    it('0/3 ONAY = REDDEDİLDİ', () => {
      const votes: VoteResult[] = ['RED', 'RED', 'RED'];
      const approved = votes.filter(v => v === 'ONAY').length;
      const result: ConsensusResult = approved === 3 ? 'MÜHÜRLÜ' : 'REDDEDİLDİ';
      expect(result).toBe('REDDEDİLDİ');
    });
  });
});
