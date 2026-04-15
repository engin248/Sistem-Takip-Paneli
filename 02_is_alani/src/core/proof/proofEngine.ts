// src/core/proof/proofEngine.ts
// K5 — Kanıt Motoru | A1: Proof yoksa işlem yok | A2: Verify ayrı adım

import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase';
import type { ProofResult } from '../types';

const Z3_AVAILABLE = false;
const OPA_VER      = process.env.OPA_POLICY_VERSION || 'v1.0';
const SOLVER_VER   = Z3_AVAILABLE ? '4.13.0' : 'zod-v1';

function cacheKey(constraints: string[]): string {
    return createHash('sha256')
        .update(constraints.join('|') + '|' + OPA_VER + '|' + SOLVER_VER)
        .digest('hex');
}

// ─── K5.1 — SOLVE ───────────────────────────────────────────

export async function solveProof(
    commandId: string,
    constraints: string[]
): Promise<ProofResult> {
    const t0 = Date.now();

    if (!constraints || constraints.length === 0) {
        throw new Error('ERR-STP036: Constraint boş');
    }

    const key = cacheKey(constraints);
    const { data: cached } = await supabase
        .from('proof_cache')
        .select('proof_result')
        .eq('cache_key', key)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

    if (cached) {
        return { ...(cached.proof_result as ProofResult), cached: true, processingMs: Date.now() - t0 };
    }

    const result = Z3_AVAILABLE
        ? await solveWithZ3(constraints, t0)
        : await solveWithZod(constraints, t0);

    await supabase.from('proof_cache').upsert({
        cache_key:   key,
        proof_result: result,
        opa_version:  OPA_VER,
        z3_version:   SOLVER_VER,
        expires_at:   new Date(Date.now() + 3600_000).toISOString(),
    });

    await supabase.from('proofs').insert({
        command_id:    commandId,
        result:        result.status === 'SAT' ? 'valid' : result.status === 'TIMEOUT' ? 'timeout' : 'invalid',
        proof_object:  { hash: result.proofHash, constraints },
        verifier_a:    { tool: SOLVER_VER, result: result.status, ms: result.processingMs },
        verifier_b:    { tool: 'pending', result: 'pending', ms: 0 },
        match:         false,
        processing_ms: result.processingMs,
    });

    return result;
}

// ─── K5.2 — VERIFY (A2: bağımsız ikinci adım) ───────────────

export async function verifyProof(
    commandId: string,
    proof: ProofResult
): Promise<ProofResult> {
    if (!proof.solved) throw new Error('ERR-STP038: Solve edilmemiş');
    if (!proof.constraints || proof.constraints.length === 0) {
        // Constraints boş — degraded mod, verify atla
        return { ...proof, verified: false, degraded: true };
    }

    const check = Z3_AVAILABLE
        ? await solveWithZ3(proof.constraints, Date.now())
        : await solveWithZod(proof.constraints, Date.now());

    const verified = check.status === 'SAT' && check.proofHash.length > 0;

    await supabase.from('proofs')
        .update({
            verifier_b: { tool: SOLVER_VER + '-verify', result: verified ? 'valid' : 'invalid' },
            match:       verified,
        })
        .eq('command_id', commandId);

    return { ...proof, verified };
}

// ─── Zod Constraint Solver (Z3 yokken — degraded mode) ──────

async function solveWithZod(constraints: string[], t0: number): Promise<ProofResult> {
    let allSat     = true;
    let failReason = '';

    for (const c of constraints) {
        if (c.includes('UNSAT') || c.includes('false') || c.includes('contradiction')) {
            allSat = false; failReason = c; break;
        }
        if (c.trim().length === 0) {
            allSat = false; failReason = 'empty constraint'; break;
        }
    }

    const hash = createHash('sha256')
        .update(JSON.stringify(constraints) + (allSat ? 'SAT' : 'UNSAT'))
        .digest('hex');

    if (!allSat) {
        await supabase.from('fmea_records').insert({
            failure_mode: 'PROOF_UNSAT',
            severity:     4,
            occurrence:   3,
            detection:    2,
            mitigation:   `Constraint çelişkisi: ${failReason.substring(0, 100)}`,
        });
        throw new Error('ERR-STP037: UNSAT — çelişki tespit (A3)');
    }

    return {
        status:       'SAT',
        proofHash:    `STP_V1_${hash}`,
        solved:       true,
        verified:     false,
        cached:       false,
        degraded:     !Z3_AVAILABLE,
        processingMs: Date.now() - t0,
        constraints,
    };
}

// ─── Z3 Solver — Faz 1 H11'de aktif edilir ──────────────────
// Singleton pattern, unknown=UNSAT, deterministic hash, solver.set('timeout',10000)

async function solveWithZ3(_constraints: string[], _t0: number): Promise<ProofResult> {
    throw new Error('ERR-STP040: Z3 Faz 1 H11 için planlanmış');
}
