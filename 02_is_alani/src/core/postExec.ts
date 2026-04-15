// src/core/postExec.ts
// K9 — Post-Execution Validation & Archival

import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase';
import type { ProofResult } from './types';
import type { ExecutionResult } from './executionEngine';

export interface PostExecResult {
  archived:   boolean;
  auditHash:  string;
  chainEntry: boolean;
}

export async function runPostExec(
  commandId: string,
  execution: ExecutionResult,
  proof:     ProofResult
): Promise<PostExecResult> {
  // A6: İzlenebilirlik — audit hash üret
  const auditHash = createHash('sha256')
    .update(commandId + JSON.stringify(execution.output) + proof.proofHash)
    .digest('hex');

  // proof_chain'e ekle
  const { data: lastChain } = await supabase
    .from('proof_chain')
    .select('proof_hash')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: chainError } = await supabase.from('proof_chain').insert({
    command_id:  commandId,
    proof_hash:  auditHash,
    prev_hash:   lastChain?.proof_hash ?? '',
    merkle_root: null,
    signature:   null,
  });

  // immutable_logs'a son kayıt
  const { data: lastLog } = await supabase
    .from('immutable_logs')
    .select('hash')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from('immutable_logs').insert({
    module:     'K9',
    event_type: 'EXECUTION_COMPLETE',
    severity:   'info',
    payload:    {
      commandId,
      status:      execution.status,
      processingMs: execution.processingMs,
      auditHash,
    },
    hash:       auditHash,
    prev_hash:  lastLog?.hash ?? '',
  });

  return {
    archived:   true,
    auditHash,
    chainEntry: !chainError,
  };
}
