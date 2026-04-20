/**
 * SİSTEM TAKİP PANELİ - NİHAİ CORE ARCHITECTURE TYPES
 * 
 * Bu dosya projenin anayasasıdır. Hiçbir ajan veya birim bu şemada 
 * zorunlu tutulan veri sözleşmelerine (TaskContract) aykırı hareket edemez.
 */

// 1. GÖREV KABUL BİRİMİ TİPLERİ (Intent & Sanity)
export enum SanityCheckResult {
  PASSED = "PASSED",
  REJECTED_IMPOSSIBLE = "REJECTED_IMPOSSIBLE",
  REJECTED_SECURITY = "REJECTED_SECURITY",
  REJECTED_SYSTEM_LIMIT = "REJECTED_SYSTEM_LIMIT"
}

export interface IntentAnalysis {
  isSane: boolean;
  sanityStatus: SanityCheckResult;
  extractedIntent: string;
  confidenceScore: number; // 0.0 to 1.0 (1.0 Şarttır)
  xaiExplanation?: string; // (Micro-XAI) Görev Kabul biriminin mantık açıklaması (Neden Anladım?).
}

// 2. SIMULATION & RESOURCE GOVERNOR TİPLERİ
export interface ResourceImpact {
  estimatedCpuUsageStatus: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  estimatedTokenCost: number;
  databaseMutationRisk: "NONE" | "LOW" | "HIGH" | "CATASTROPHIC";
}

export interface SimulationReport {
  isSafeToProceed: boolean;
  resourceImpact: ResourceImpact;
  requiredRollbackPoint: boolean; // Eğer true ise SNAPSHOT LOCK devreye girmek ZORUNDADIR.
  xaiExplanation?: string; // (Micro-XAI) Simülasyonun bütçe ve donanım limitleri tahmini açıklaması.
}

// 3. TASK CONTRACT (MUTLAK ZORUNLU ŞEMA)
// Bu formata girmeyen hiçbir görev PLANLAMA aşamasına geçemez.
export interface TaskContract {
  contractId: string;
  verifiedIntent: string;
  inputPayload: Record<string, any>;
  constraints: string[];
  expectedOutput: string;
  successCriteria: string[];
  g0HandshakeApproved: boolean; // HANDSHAKE onayı var mı? (G-0)
}

// 4. PLANLAMA VE DAĞITIM TİPLERİ
export enum ExecutionGuardStatus {
  STANDBY = "STANDBY",
  RUNNING = "RUNNING",
  HALTED_DEVIATION = "HALTED_DEVIATION", // KILL-SWITCH Tetiklendi!
  HALTED_TIMEOUT = "HALTED_TIMEOUT",
  COMPLETED = "COMPLETED"
}

export interface DispatchPlan {
  assignedAgentId: string;
  executionSteps: string[];
  guardConstraints: string[];
}

// 5. DENETİM VE SKORLAMA (DUAL VALIDATION & SCORING)
export interface ValidationResult {
  technicalValidationPassed: boolean;
  strategicDualValidationPassed: boolean;
  requiresAutoRollback: boolean; // Çıktı çok hatalıysa veya zarar vericiyse Rollback!
  xaiExplanation?: string; // (Micro-XAI) İKİNCİ EKİBİN, Ajan Operasyonunu mantıksal olarak ONAYLAMA veya ÇÜRÜTME Kanıtı!
}

export interface ScoreCard {
  accuracyScore: number; // 0-100
  speedScore: number; // 0-100
  qualityScore: number; // 0-100
  costEfficiency: number; // 0-100
  totalScore: number; 
  isEligibleForMemoryWrite: boolean; // Memory Poisoning koruması (Puan > 90 şartı)
}
