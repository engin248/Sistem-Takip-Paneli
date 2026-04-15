// src/core/consensus.ts
// K6 — Quorum 2/3 + Veto Konsensüs Mekanizması

import { supabase } from '@/lib/supabase';
import { createHash } from 'crypto';
import type { CriteriaResult, ProofResult } from './types';
import type { RedTeamResult } from './redTeam';

export interface ConsensusResult {
    commandId:   string;
    decision:    'PROCEED' | 'HALT' | 'ESCALATE';
    votes:       Vote[];
    quorumMet:   boolean;
    vetoUsed:    boolean;
    vetoReason:  string | null;
    confidence:  number;
    timestamp:   number;
}

interface Vote {
    voter:    string;
    decision: 'approve' | 'reject' | 'abstain';
    weight:   number;
    reason:   string;
}

export async function runConsensus(
    commandId: string,
    criteria:  CriteriaResult,
    proof:     ProofResult,
    redTeam:   RedTeamResult
): Promise<ConsensusResult> {
    const votes: Vote[] = [
        criteriaVote(criteria),
        proofVote(proof),
        redTeamVote(redTeam),
    ];

    // Veto: weight ≥ 3 reject
    const vetoVote = votes.find(v => v.decision === 'reject' && v.weight >= 3);
    if (vetoVote) {
        const result: ConsensusResult = {
            commandId, decision: 'HALT', votes,
            quorumMet: false, vetoUsed: true,
            vetoReason: vetoVote.reason, confidence: 0, timestamp: Date.now(),
        };
        await saveConsensus(commandId, result);
        return result;
    }

    const approveCount = votes.filter(v => v.decision === 'approve').length;
    const rejectCount  = votes.filter(v => v.decision === 'reject').length;
    const quorumMet    = approveCount >= 2;

    const decision: ConsensusResult['decision'] =
        quorumMet     ? 'PROCEED' :
        rejectCount >= 2 ? 'HALT' : 'ESCALATE';

    const totalWeight = votes.reduce((s, v) => s + (v.decision === 'approve' ? v.weight : 0), 0);
    const maxWeight   = votes.reduce((s, v) => s + v.weight, 0);
    const confidence  = Math.round((totalWeight / maxWeight) * 100) / 100;

    const result: ConsensusResult = {
        commandId, decision, votes, quorumMet,
        vetoUsed: false, vetoReason: null, confidence, timestamp: Date.now(),
    };

    await saveConsensus(commandId, result);
    return result;
}

// ─── Yargıç oyları ──────────────────────────────────────────

function criteriaVote(c: CriteriaResult): Vote {
    if (c.score >= 85) return { voter: 'criteria', decision: 'approve', weight: 2, reason: `Skor: ${c.score}` };
    if (c.score >= 75) return { voter: 'criteria', decision: 'approve', weight: 1, reason: `Skor: ${c.score} (sınırda)` };
    if (c.score >= 50) return { voter: 'criteria', decision: 'abstain', weight: 1, reason: `Skor: ${c.score} (belirsiz)` };
    return { voter: 'criteria', decision: 'reject', weight: 3, reason: `Skor: ${c.score} (kritik düşük)` };
}

function proofVote(p: ProofResult): Vote {
    if (p.verified && p.status === 'SAT') return { voter: 'proof', decision: 'approve', weight: 3, reason: 'Kanıt doğrulandı' };
    if (p.status === 'SAT' && !p.verified) return { voter: 'proof', decision: 'abstain', weight: 1, reason: 'Kanıt üretildi ama doğrulanmadı (A2)' };
    if (p.degraded) return { voter: 'proof', decision: 'abstain', weight: 1, reason: 'Degraded mod — Z3 yok' };
    return { voter: 'proof', decision: 'reject', weight: 3, reason: `Proof başarısız: ${p.status}` };
}

function redTeamVote(r: RedTeamResult): Vote {
    if (r.survived && r.monteCarloScore >= 80) return { voter: 'redteam', decision: 'approve', weight: 2, reason: `Monte Carlo: ${r.monteCarloScore}%` };
    if (r.survived) return { voter: 'redteam', decision: 'approve', weight: 1, reason: `Monte Carlo: ${r.monteCarloScore}% (sınırda)` };
    if (r.monteCarloScore >= 50) return { voter: 'redteam', decision: 'abstain', weight: 1, reason: `Monte Carlo: ${r.monteCarloScore}% (kısmen)` };
    return { voter: 'redteam', decision: 'reject', weight: 2, reason: `Monte Carlo: ${r.monteCarloScore}% (başarısız)` };
}

// ─── Kayıt ──────────────────────────────────────────────────

async function saveConsensus(commandId: string, result: ConsensusResult): Promise<void> {
    await supabase.from('refutations')
        .update({
            consensus_result: result.decision === 'PROCEED' ? 'proceed' :
                              result.decision === 'HALT'    ? 'halt'    : 'escalate',
            quorum_votes: {
                votes:     result.votes,
                quorumMet: result.quorumMet,
                vetoUsed:  result.vetoUsed,
                confidence: result.confidence,
            },
        })
        .eq('command_id', commandId);

    // immutable_logs — prev_hash zinciri
    const { data: lastLog } = await supabase
        .from('immutable_logs')
        .select('hash')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const hash = createHash('sha256')
        .update(commandId + result.decision + Date.now())
        .digest('hex');

    await supabase.from('immutable_logs').insert({
        module:     'K6',
        event_type: 'CONSENSUS',
        severity:   result.decision === 'HALT' ? 'critical' : 'info',
        payload:    { commandId, decision: result.decision, confidence: result.confidence },
        hash,
        prev_hash:  lastLog?.hash ?? '',
    });
}
