// src/core/types.ts
// V-FINAL doktrin tip tanımları
import { z } from 'zod';

export type Channel = 'telegram' | 'panel' | 'voice' | 'api';
export type SystemMode = 'STRICT' | 'NORMAL' | 'SAFE';

export type CommandStatus =
    | 'received' | 'voice_pending' | 'validated' | 'analyzing'
    | 'understanding_pending' | 'plan_pending'
    | 'detecting' | 'specifying' | 'proving' | 'verifying'
    | 'refuting' | 'consensus' | 'gate_check'
    | 'evidence_pending' | 'approval_pending'
    | 'executing'
    | 'completed' | 'failed' | 'escalated' | 'killed';

export const CommandContextSchema = z.object({
    userId: z.string().min(1),
    channel: z.enum(['telegram', 'panel', 'voice', 'api']),
    isAuthorized: z.boolean(),
    role: z.enum(['admin', 'operator', 'viewer']),
    scope: z.array(z.string()).min(1),
    nonce: z.string().min(8),
    isVoice: z.boolean(),
    transcript: z.string().optional(),
});
export type CommandContext = z.infer<typeof CommandContextSchema>;

export interface L0Result {
    status: 'PROCEED' | 'VOICE_PENDING_CONFIRM' | 'REJECTED';
    commandId: string;
    hash: string;
    timestamp: number;
    channel: Channel;
}

export const STPAnalysisSchema = z.object({
    reasoning: z.string(),
    methodology: z.string(),
    alternatives: z.array(z.string()),
    risks: z.string(),
    refutation: z.string(),
    constraints: z.array(z.string()),
    questions: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    entropy: z.number().min(0),
    entropyClass: z.enum(['low', 'medium', 'high']),
    proofLevel: z.enum(['PROVEN', 'VALIDATED', 'BOUNDED_VERIFIED', 'GODEL_LIMIT']),
});
export type STPAnalysis = z.infer<typeof STPAnalysisSchema>;

export type CriteriaCategory = 'functional' | 'logical' | 'performance' | 'security' | 'data';
export type CriteriaPriority = 'critical' | 'high' | 'standard';

export interface CriterionRule {
    id: string;
    name: string;
    category: CriteriaCategory;
    priority: CriteriaPriority;
    fn: (input: string, analysis: STPAnalysis) => boolean;
}

export interface CriteriaResult {
    passed: boolean;
    score: number;
    total: number;
    passedCount: number;
    failedCount: number;
    failedRules: { id: string; name: string; category: string }[];
    mode: SystemMode;
    timestamp: number;
}

export interface ProofResult {
    status: 'SAT' | 'UNSAT' | 'TIMEOUT' | 'ERROR';
    proofHash: string;
    solved: boolean;
    verified: boolean;
    cached: boolean;
    degraded: boolean;
    processingMs: number;
    constraints: string[];
}
