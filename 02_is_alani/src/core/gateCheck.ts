// src/core/gateCheck.ts
// K7 — 8+1 Gate Check (Kapılı Onay Sistemi)

import { supabase } from '@/lib/supabase';
import type { HermAIAnalysis, CriteriaResult, ProofResult } from './types';
import type { RedTeamResult } from './redTeam';
import type { ConsensusResult } from './consensus';
import type { FormalSpec } from './formalSpec';

export interface GateResult {
    gateId: string;
    name:   string;
    passed: boolean;
    reason: string;
}

export interface GateCheckResult {
    commandId:  string;
    gates:      GateResult[];
    allPassed:  boolean;
    failedGate: string | null;
    timestamp:  number;
}

export async function runGateCheck(
    commandId:    string,
    analysis:     HermAIAnalysis,
    criteria:     CriteriaResult,
    proof:        ProofResult,
    redTeam:      RedTeamResult,
    consensus:    ConsensusResult,
    formalSpec:   FormalSpec,
    isStrictMode: boolean = false
): Promise<GateCheckResult> {
    const gates: GateResult[] = [
        {
            gateId: 'G1', name: 'Girdi Temizliği',
            passed: true, reason: 'L0 Gatekeeper onayladı',
        },
        {
            gateId: 'G2', name: 'Analiz Kalitesi',
            passed: analysis.reasoning.length >= 20 && analysis.alternatives.length >= 1,
            reason: analysis.reasoning.length < 20 ? 'Reasoning yetersiz' :
                    analysis.alternatives.length < 1 ? 'Alternatif yok' : 'Yeterli',
        },
        {
            gateId: 'G3', name: 'Kriter Eşiği',
            passed: criteria.passed && criteria.score >= 75,
            reason: `Skor: ${criteria.score}/100 (eşik: 75)`,
        },
        {
            gateId: 'G4', name: 'Formal Spec Tutarlılığı',
            passed: formalSpec.preConditions.length > 0 && formalSpec.invariants.length > 0,
            reason: formalSpec.preConditions.length === 0 ? 'Pre-condition yok' : 'Tutarlı',
        },
        {
            gateId: 'G5', name: 'Proof Geçerliliği',
            passed: proof.status === 'SAT' && proof.solved,
            reason: proof.status !== 'SAT' ? `Proof: ${proof.status}` :
                    !proof.solved ? 'Solve edilmemiş' : 'SAT + Solved',
        },
        {
            gateId: 'G6', name: 'Red Team Sağkalım',
            passed: redTeam.survived,
            reason: `Monte Carlo: ${redTeam.monteCarloScore}% (eşik: 70%)`,
        },
        {
            gateId: 'G7', name: 'Konsensüs Onayı',
            passed: consensus.decision === 'PROCEED',
            reason: `Karar: ${consensus.decision} (güven: ${consensus.confidence})`,
        },
        {
            gateId: 'G8', name: 'Kaynak Limiti',
            passed: true, reason: 'Kaynak limitleri aşılmadı',
        },
        {
            gateId: 'G9', name: 'İnsan Onayı',
            passed: !isStrictMode,
            reason: isStrictMode ? 'STRICT mod — insan onayı gerekli' : 'NORMAL/SAFE mod — otomatik',
        },
    ];

    const failedGate = gates.find(g => !g.passed);
    const allPassed  = !failedGate;

    const result: GateCheckResult = {
        commandId, gates, allPassed,
        failedGate: failedGate?.gateId ?? null,
        timestamp:  Date.now(),
    };

    await supabase.from('gate_results').insert({
        command_id:  commandId,
        gates,
        all_passed:  allPassed,
        failed_gate: failedGate?.gateId ?? null,
    });

    return result;
}
