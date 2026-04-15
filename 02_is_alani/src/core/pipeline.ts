// src/core/pipeline.ts
// V-FINAL Ana Pipeline — K1 → K2.1 → K2.3 → K5 → Karar
// Tüm modülleri doktrin sırasıyla çağırır.

import { createHash } from 'crypto';
import { supabase } from '@/lib/supabase';
import { L0_GATEKEEPER } from './control_engine';
import { runHermAIAnalysis } from './hermAI/analysisEngine';
import { validateK2Criteria } from './hermAI/criteriaEngine';
import { solveProof, verifyProof } from './proof/proofEngine';
import type {
    CommandContext,
    SystemMode,
    L0Result,
    HermAIAnalysis,
    CriteriaResult,
    ProofResult,
} from './types';

// ─── SONUÇ TİPİ ────────────────────────────────────────────

export interface PipelineResult {
    commandId: string;
    status:    'APPROVED' | 'REJECTED' | 'ESCALATED' | 'ERROR';
    l0:        L0Result | null;   // L0 öncesi hata → null olabilir
    analysis:  HermAIAnalysis | null;
    criteria:  CriteriaResult | null;
    proof:     ProofResult | null;
    errors:    string[];
    totalMs:   number;
    timestamp: number;
}

/**
 * V-FINAL EXECUTION PIPELINE
 *
 * Akış:
 *   K1.2 L0 Gatekeeper → sanitize, yetki, replay, hash
 *   K2.1 HermAI Analiz  → 6'lı analiz (Ollama/OpenAI)
 *   K2.3 Kriter Motoru  → 92 kriter doğrulama
 *   K5.1 Proof Solve    → constraint çözümleme
 *   K5.2 Proof Verify   → bağımsız doğrulama (A2)
 *   → KARAR: APPROVED / REJECTED / ESCALATED
 *
 * Aksiyomlar:
 *   A1: Proof yoksa işlem yok
 *   A2: Verify ayrı adım
 *   A3: Çelişki varsa DUR
 *   A4: Veri doğrulanmamışsa iptal
 *   A5: Invariant ihlali → anında müdahale
 *   A6: Tüm işlemler izlenebilir
 */
export async function executePipeline(
    rawInput: string,
    context:  CommandContext,
    mode:     SystemMode = 'NORMAL'
): Promise<PipelineResult> {
    const t0      = Date.now();
    const errors: string[] = [];
    let l0:       L0Result | null       = null;
    let analysis: HermAIAnalysis | null = null;
    let criteria: CriteriaResult | null = null;
    let proof:    ProofResult | null    = null;

    try {
        // ═══ K1.2: L0 GATEKEEPER ═══════════════════════════
        l0 = await L0_GATEKEEPER(rawInput, context);

        if (l0.status === 'VOICE_PENDING_CONFIRM') {
            return {
                commandId: l0.commandId, status: 'ESCALATED',
                l0, analysis, criteria, proof,
                errors:    ['Ses komutu teyit bekliyor'],
                totalMs:   Date.now() - t0, timestamp: Date.now(),
            };
        }

        // ═══ K2.1: HermAI ANALİZ ════════════════════════════
        await updateStatus(l0.commandId, 'analyzing');
        analysis = await runHermAIAnalysis(l0.commandId, rawInput);

        // ═══ K2.3: 92 KRİTER DOĞRULAMA ═════════════════════
        await updateStatus(l0.commandId, 'detecting');
        criteria = await validateK2Criteria(l0.commandId, rawInput, analysis, mode);

        if (!criteria.passed) {
            await updateStatus(l0.commandId, 'failed');
            await logAlert(l0.commandId, 3, 'CRITERIA_FAIL', `Skor: ${criteria.score}/100`);
            return {
                commandId: l0.commandId, status: 'REJECTED',
                l0, analysis, criteria, proof,
                errors:    [`Kriter skoru yetersiz: ${criteria.score}/100 (eşik: 75)`],
                totalMs:   Date.now() - t0, timestamp: Date.now(),
            };
        }

        // ═══ K5.1: PROOF SOLVE ══════════════════════════════
        await updateStatus(l0.commandId, 'proving');

        if (!analysis.constraints || analysis.constraints.length === 0) {
            errors.push('Constraint boş — proof atlanıyor (degraded)');
            await logAlert(l0.commandId, 2, 'NO_CONSTRAINTS', 'HermAI constraint üretemedi');
            return {
                commandId: l0.commandId, status: 'ESCALATED',
                l0, analysis, criteria, proof,
                errors, totalMs: Date.now() - t0, timestamp: Date.now(),
            };
        }

        proof = await solveProof(l0.commandId, analysis.constraints);

        // ═══ K5.2: PROOF VERIFY (A2) ════════════════════════
        await updateStatus(l0.commandId, 'verifying');
        proof = await verifyProof(l0.commandId, proof);

        if (!proof.verified) {
            await updateStatus(l0.commandId, 'failed');
            await logAlert(l0.commandId, 4, 'PROOF_VERIFY_FAIL', 'Proof doğrulanamadı');
            return {
                commandId: l0.commandId, status: 'REJECTED',
                l0, analysis, criteria, proof,
                errors:    ['Proof doğrulama başarısız (A2 ihlali)'],
                totalMs:   Date.now() - t0, timestamp: Date.now(),
            };
        }

        // ═══ ONAY ═══════════════════════════════════════════
        await updateStatus(l0.commandId, 'completed');
        return {
            commandId: l0.commandId, status: 'APPROVED',
            l0, analysis, criteria, proof,
            errors, totalMs: Date.now() - t0, timestamp: Date.now(),
        };

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
        errors.push(msg);

        if (l0) {
            await updateStatus(l0.commandId, 'failed');
            await logAlert(l0.commandId, 5, 'PIPELINE_CRASH', msg);
        }

        return {
            commandId: l0?.commandId ?? 'unknown',
            status:    'ERROR',
            l0, analysis, criteria, proof,
            errors, totalMs: Date.now() - t0, timestamp: Date.now(),
        };
    }
}

// ─── YARDIMCILAR ────────────────────────────────────────────

async function updateStatus(commandId: string, status: string): Promise<void> {
    await supabase
        .from('commands')
        .update({ status })
        .eq('id', commandId);
}

async function logAlert(
    commandId: string,
    severity:  number,
    rule:      string,
    details:   string
): Promise<void> {
    const level = severity >= 4 ? 'critical' : severity >= 3 ? 'high' : 'info';

    await supabase.from('alerts').insert({
        severity,
        rule_triggered: rule,
        fail_level:     level,
        module:         'pipeline',
        details:        { commandId, message: details },
    });

    // A6: immutable_logs zinciri
    const { data: lastLog } = await supabase
        .from('immutable_logs')
        .select('hash')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const hash = createHash('sha256')
        .update(commandId + rule + details + Date.now())
        .digest('hex');

    await supabase.from('immutable_logs').insert({
        module:     'pipeline',
        event_type: 'ALERT',
        severity:   severity >= 4 ? 'critical' : 'warning',
        payload:    { commandId, rule, details },
        hash,
        prev_hash:  lastLog?.hash ?? '',
    });
}
