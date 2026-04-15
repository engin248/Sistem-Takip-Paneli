// src/core/postExec.ts
// K9 — Post-Execution Doğrulama
// İcra sonrası invariant kontrolü + Merkle hash zinciri

import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase';
import type { ProofResult } from './types';
import type { ExecutionResult } from './executionEngine';

export interface PostExecResult {
    commandId:       string;
    invariantsHeld:  boolean;
    merkleRoot:      string;
    proofChainValid: boolean;
    healthStatus:    'healthy' | 'degraded' | 'down';
    timestamp:       number;
}

/**
 * K9 — Post-Execution Doğrulama
 *
 * 1. Invariant kontrolü (execution sonucu başarılı mı?)
 * 2. Proof chain güncelleme (Merkle hash)
 * 3. Health status güncelleme
 * 4. Traceability kaydı
 * 5. Performance metric
 * 6. Immutable log (A6)
 */
export async function runPostExec(
    commandId: string,
    execution: ExecutionResult,
    proof:     ProofResult
): Promise<PostExecResult> {

    // 1. Invariant kontrolü
    const invariantsHeld = execution.status === 'success';

    // 2. Merkle hash zinciri (A6)
    const { merkleRoot, chainValid } = await updateProofChain(commandId, proof);

    // 3. Health status
    const healthStatus: PostExecResult['healthStatus'] =
        invariantsHeld && chainValid ? 'healthy' :
        invariantsHeld               ? 'degraded' : 'down';

    await supabase.from('health_status').upsert({
        module:     'pipeline',
        status:     healthStatus,
        last_check: new Date().toISOString(),
        details:    { commandId, invariantsHeld, chainValid },
    });

    // 4. Traceability
    await supabase.from('traceability').insert({
        command_id:  commandId,
        from_module: 'K8',
        to_module:   'K9',
        data_hash:   merkleRoot,
    });

    // 5. Performance metric
    await supabase.from('performance_metrics').insert({
        module:      'pipeline',
        metric_name: 'total_execution_ms',
        value:       execution.processingMs,
    });

    // 6. Immutable log (A6) — prev_hash zinciri
    const { data: lastLog } = await supabase
        .from('immutable_logs')
        .select('hash')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    await supabase.from('immutable_logs').insert({
        module:     'K9',
        event_type: 'POST_EXEC_COMPLETE',
        severity:   invariantsHeld ? 'info' : 'critical',
        payload:    { commandId, invariantsHeld, merkleRoot, healthStatus },
        hash:       merkleRoot,
        prev_hash:  lastLog?.hash ?? '',
    });

    return {
        commandId, invariantsHeld, merkleRoot,
        proofChainValid: chainValid,
        healthStatus,    timestamp: Date.now(),
    };
}

// ─── Merkle Hash Chain ───────────────────────────────────────

async function updateProofChain(
    commandId: string,
    proof:     ProofResult
): Promise<{ merkleRoot: string; chainValid: boolean }> {

    const { data: lastChain } = await supabase
        .from('proof_chain')
        .select('proof_hash')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const prevHash = lastChain?.proof_hash ?? 'GENESIS';

    const merkleRoot = createHash('sha256')
        .update(prevHash + proof.proofHash + commandId)
        .digest('hex');

    const { error } = await supabase.from('proof_chain').insert({
        command_id:  commandId,
        proof_hash:  proof.proofHash,
        prev_hash:   prevHash,
        merkle_root: merkleRoot,
        signature:   `STP_CHAIN_${merkleRoot.substring(0, 16)}`,
    });

    return { merkleRoot, chainValid: !error };
}
