// src/core/index.ts
// V-FINAL çekirdek modül dışa aktarımları — 9 Katman (K1-K9)

// Tipler
export type {
    Channel, SystemMode, CommandStatus, CommandContext,
    L0Result, Sistem Takip PaneliAnalysis, CriteriaResult, ProofResult,
    CriteriaCategory, CriteriaPriority, CriterionRule,
} from './types';
export { CommandContextSchema, Sistem Takip PaneliAnalysisSchema } from './types';

// K1.2 — L0 Gatekeeper
export { L0_GATEKEEPER } from './control_engine';

// K2.1 - Sistem Takip Paneli Analiz (Silindi, dis servise aktarildi)
// K2.3 - 92 Kriter Motoru (Silindi, dis servise aktarildi)

// K3 — Formal Spesifikasyon
export { generateFormalSpec } from './formalSpec';
export type { FormalSpec } from './formalSpec';

// K4 — Red Team Çürütme
export { runRedTeam } from './redTeam';
export type { RedTeamResult } from './redTeam';

// K5 — Proof Engine
export { solveProof, verifyProof } from './proof/proofEngine';

// K6 — Konsensüs (Quorum 2/3 + Veto)
export { runConsensus } from './consensus';
export type { ConsensusResult } from './consensus';

// K7 — 8+1 Gate Check
export { runGateCheck } from './gateCheck';
export type { GateCheckResult } from './gateCheck';

// K8 — Execution Engine
export { executeCommand } from './executionEngine';
export type { ExecutionResult } from './executionEngine';

// K9 — Post-Execution Doğrulama
export { runPostExec } from './postExec';
export type { PostExecResult } from './postExec';

// Pipeline
export { executePipeline } from './pipeline';
export type { PipelineResult } from './pipeline';

// Human Gate — G-1/G-2/G-6/G-7 Kapılı Onay Mekanizması
export {
    saveCheckpoint, loadCheckpoint,
    confirmGate, rejectGate, getPendingCheckpoints,
} from './humanGate';
export type {
    GateId, GateStatus, CheckpointData, CheckpointRecord,
    GateUnderstanding, GatePlan, GateEvidence, GateApprovalReport,
} from './humanGate';

// K0 — Bootstrap
export { runBootstrap } from './bootstrap';
export type { BootstrapResult } from './bootstrap';
