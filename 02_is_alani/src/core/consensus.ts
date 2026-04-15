// src/core/consensus.ts
// K6 — Multi-Agent Consensus Engine

import { supabase } from '@/lib/supabase';
import type { CriteriaResult, ProofResult } from './types';
import type { RedTeamResult } from './redTeam';

export interface ConsensusResult {
  decision:    'PROCEED' | 'HALT' | 'ESCALATE';
  vetoReason?: string;
  quorum:      number;
  votes:       { agent: string; vote: 'PROCEED' | 'HALT' | 'ESCALATE' }[];
}

export async function runConsensus(
  commandId: string,
  criteria:  CriteriaResult,
  proof:     ProofResult,
  redTeam:   RedTeamResult
): Promise<ConsensusResult> {
  // 3 ajan oyu
  const votes: ConsensusResult['votes'] = [
    {
      agent: 'CRITERIA_AGENT',
      vote:  criteria.passed ? 'PROCEED' : 'HALT',
    },
    {
      agent: 'PROOF_AGENT',
      vote:  proof.verified ? 'PROCEED' : 'HALT',
    },
    {
      agent: 'REDTEAM_AGENT',
      vote:  redTeam.passed ? 'PROCEED'
           : redTeam.riskScore > 0.7 ? 'HALT' : 'ESCALATE',
    },
  ];

  const proceedCount = votes.filter(v => v.vote === 'PROCEED').length;
  const haltCount    = votes.filter(v => v.vote === 'HALT').length;
  const quorum       = proceedCount / votes.length;

  let decision: ConsensusResult['decision'];
  let vetoReason: string | undefined;

  if (haltCount >= 2) {
    decision   = 'HALT';
    vetoReason = votes.find(v => v.vote === 'HALT')?.agent + ' veto';
  } else if (quorum >= 0.67) {
    decision = 'PROCEED';
  } else {
    decision = 'ESCALATE';
  }

  const result: ConsensusResult = { decision, vetoReason, quorum, votes };

  await supabase.from('refutations')
    .update({
      consensus_result: decision.toLowerCase() as 'proceed' | 'halt' | 'escalate',
      quorum_votes:     { votes, quorum },
    })
    .eq('command_id', commandId);

  return result;
}
