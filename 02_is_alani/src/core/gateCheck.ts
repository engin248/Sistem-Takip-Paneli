// src/core/gateCheck.ts
// K7 — 8+1 Gate Check (Final Guard)

import { supabase } from '@/lib/supabase';
import type { HermAIAnalysis, CriteriaResult, ProofResult } from './types';
import type { RedTeamResult } from './redTeam';
import type { ConsensusResult } from './consensus';
import type { FormalSpec } from './formalSpec';

export interface GateCheckResult {
  allPassed:  boolean;
  failedGate?: string;
  gates:      Record<string, boolean>;
}

export async function runGateCheck(
  commandId:  string,
  analysis:   HermAIAnalysis,
  criteria:   CriteriaResult,
  proof:      ProofResult,
  redTeam:    RedTeamResult,
  consensus:  ConsensusResult,
  formalSpec: FormalSpec,
  strict:     boolean
): Promise<GateCheckResult> {
  const gates: Record<string, boolean> = {
    G1_CRITERIA_PASS:    criteria.passed,
    G2_PROOF_SOLVED:     proof.solved,
    G3_PROOF_VERIFIED:   proof.verified,
    G4_REDTEAM_PASS:     redTeam.passed,
    G5_CONSENSUS_OK:     consensus.decision === 'PROCEED',
    G6_CONFIDENCE_MIN:   analysis.confidence >= 0.3,
    G7_NO_UNSAT:         proof.status !== 'UNSAT',
    G8_SPEC_EXISTS:      formalSpec.preConditions.length > 0,
    G9_STRICT_SCORE:     strict ? criteria.score >= 90 : criteria.score >= 75,
  };

  const failedGate = Object.entries(gates).find(([, v]) => !v)?.[0];
  const allPassed  = !failedGate;

  await supabase.from('gate_results').insert({
    command_id:  commandId,
    gates,
    all_passed:  allPassed,
    failed_gate: failedGate ?? null,
  });

  return { allPassed, failedGate, gates };
}
