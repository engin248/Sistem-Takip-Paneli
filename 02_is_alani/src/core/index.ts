// src/core/index.ts
// V-FINAL çekirdek modül dışa aktarımları

// Tipler
export type {
    Channel, SystemMode, CommandStatus, CommandContext,
    L0Result, HermAIAnalysis, CriteriaResult, ProofResult,
    CriteriaCategory, CriteriaPriority, CriterionRule,
} from './types';

export { CommandContextSchema, HermAIAnalysisSchema } from './types';

// Modüller
export { L0_GATEKEEPER } from './control_engine';
export { runHermAIAnalysis } from './hermAI/analysisEngine';
export { validateK2Criteria } from './hermAI/criteriaEngine';
export { solveProof, verifyProof } from './proof/proofEngine';

// Pipeline
export { executePipeline } from './pipeline';
export type { PipelineResult } from './pipeline';
