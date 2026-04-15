// ============================================================
// STP — MERKEZİ TİP DOSYASI
// Konum: src/core/types.ts
// ============================================================
// Tüm pipeline tipleri buradan import edilir.
// Kaynak: V-FINAL Doktrin — Zod şema doğrulamalı tipler.
// ============================================================

import { z } from 'zod';

// ─── TEMEL ENUM'LAR ─────────────────────────────────────────

export type Channel    = 'telegram' | 'panel' | 'voice' | 'api';
export type SystemMode = 'STRICT' | 'NORMAL' | 'SAFE';

// ─── KOMUT BAĞLAMI (L0 Gatekeeper girdi) ────────────────────

export const CommandContextSchema = z.object({
  userId:         z.string().min(1),
  channel:        z.enum(['telegram', 'panel', 'voice', 'api']),
  isAuthorized:   z.boolean(),
  role:           z.enum(['admin', 'operator', 'viewer']),
  scope:          z.array(z.string()).min(1),
  nonce:          z.string().min(8),
  isVoice:        z.boolean(),
  voiceConfirmed: z.boolean().optional(),
  transcript:     z.string().optional(),
});

export type CommandContext = z.infer<typeof CommandContextSchema>;

// ─── L0 SONUCU ──────────────────────────────────────────────

export interface L0Result {
  status: 'PROCEED' | 'VOICE_PENDING_CONFIRM' | 'REJECTED';
  commandId: string;
  hash: string;
  timestamp: number;
  channel: Channel;
}

// ─── HERMAI ANALİZ SONUCU (K2.1) ────────────────────────────

export const HermAIAnalysisSchema = z.object({
  reasoning:    z.string(),
  methodology:  z.string(),
  alternatives: z.array(z.string()),
  risks:        z.string(),
  refutation:   z.string(),
  constraints:  z.array(z.string()),
  confidence:   z.number().min(0).max(1),
  entropy:      z.number().min(0),
  entropyClass: z.enum(['low', 'medium', 'high']),
  proofLevel:   z.enum(['PROVEN', 'VALIDATED', 'BOUNDED_VERIFIED', 'GODEL_LIMIT']),
});

export type HermAIAnalysis = z.infer<typeof HermAIAnalysisSchema>;

// ─── 92 KRİTER SONUCU (K2.3) ────────────────────────────────

export interface CriteriaCheckResult {
  passed: boolean;
  score: number;        // 0-100
  total: number;
  passedCount: number;
  failedCount: number;
  failedRules: { id: string; name: string; category: string }[];
  mode: SystemMode;
  timestamp: number;
}

// ─── PROOF SONUCU (K5) ──────────────────────────────────────

export interface ProofResult {
  status: 'SAT' | 'UNSAT' | 'TIMEOUT' | 'ERROR';
  proofHash: string;
  solved: boolean;
  verified: boolean;
  cached: boolean;
  degraded: boolean;     // Z3 yoksa (Zod constraint solver — degraded mode)
  processingMs: number;
  constraints: string[];
}

// ─── SİSTEM MODU EŞIĞI ──────────────────────────────────────

export const SCORE_THRESHOLD: Record<SystemMode, number> = {
  STRICT: 90,
  NORMAL: 75,
  SAFE:   60,
};
