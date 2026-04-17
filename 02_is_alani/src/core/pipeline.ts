// src/core/pipeline.ts
// V-FINAL Tam Pipeline — K1 → G1 → K2.1 → G2 → K2.3 → K3 → K5 → K4 → K6 → G6 → K7 → G7 → K8 → K9
// 9 Katman, 6 Aksiyom, 3 Mod, 4 İnsan Kapısı (G1/G2/G6/G7)

import { supabase } from '@/lib/supabase';
import { L0_GATEKEEPER, recordError, clearErrorRecord } from './control_engine';
import { runHermAIAnalysis } from './hermAI/analysisEngine';
import { validateK2Criteria } from './hermAI/criteriaEngine';
import { generateFormalSpec } from './formalSpec';
import { solveProof, verifyProof } from './proof/proofEngine';
import { runRedTeam } from './redTeam';
import { runConsensus } from './consensus';
import { runGateCheck } from './gateCheck';
import { executeCommand } from './executionEngine';
import { runPostExec } from './postExec';
import {
    saveCheckpoint, loadCheckpoint,
    type GateUnderstanding, type GatePlan, type GateApprovalReport,
} from './humanGate';
import type {
    CommandContext, SystemMode, L0Result, HermAIAnalysis,
    CriteriaResult, ProofResult,
} from './types';
import type { FormalSpec } from './formalSpec';
import type { RedTeamResult } from './redTeam';
import type { ConsensusResult } from './consensus';
import type { GateCheckResult } from './gateCheck';
import type { ExecutionResult } from './executionEngine';
import type { PostExecResult } from './postExec';

export interface PipelineResult {
    commandId:       string;
    status:          'APPROVED' | 'REJECTED' | 'ESCALATED' | 'ERROR';
    stage:           string;
    pendingGate?:    string;
    understanding?:  GateUnderstanding;
    plan?:           GatePlan;
    approvalReport?: GateApprovalReport;
    l0:              L0Result | null;
    analysis:        HermAIAnalysis | null;
    criteria:        CriteriaResult | null;
    formalSpec:      FormalSpec | null;
    proof:           ProofResult | null;
    redTeam:         RedTeamResult | null;
    consensus:       ConsensusResult | null;
    gateCheck:       GateCheckResult | null;
    execution:       ExecutionResult | null;
    postExec:        PostExecResult | null;
    errors:          string[];
    totalMs:         number;
    timestamp:       number;
}

/**
 * V-FINAL TAM EXECUTION PIPELINE
 *
 * K1.2 → K2.1 → K2.3 → K3 → K5.1 → K5.2 → K4 → K6 → K7 → K8 → K9
 *
 * handler: Gate Check geçtikten SONRA çalışacak iş mantığı fonksiyonu.
 * Eğer handler verilmezse, pipeline sadece doğrulama yapar (dry-run).
 */
export async function executePipeline(
    rawInput: string,
    context:  CommandContext,
    mode:     SystemMode = 'NORMAL',
    handler?: () => Promise<Record<string, unknown>>
): Promise<PipelineResult> {
    const t0      = Date.now();
    const errors: string[] = [];
    const r: Partial<PipelineResult> = {
        l0: null, analysis: null, criteria: null, formalSpec: null,
        proof: null, redTeam: null, consensus: null, gateCheck: null,
        execution: null, postExec: null,
    };

    try {
        // ═══ K1.2: L0 GATEKEEPER ═══════════════════════════
        r.l0 = await L0_GATEKEEPER(rawInput, context);

        if (r.l0.status === 'VOICE_PENDING_CONFIRM') {
            return finish(r, 'ESCALATED', 'K1', ['Ses komutu teyit bekliyor'], t0);
        }

        // ═══ K2.1: HermAI ANALİZ ════════════════════════════
        await updateStatus(r.l0.commandId, 'analyzing');
        r.analysis = await runHermAIAnalysis(r.l0.commandId, rawInput);

        // ═══ G-1: GÖREV ANLAMA KAPISI ═══════════════════════
        // Doküman: "Görev ne? Hangi sistem? Eksik varsa → DURAK → Kullanıcıya rapor"
        // Pipeline BURADA durur — kullanıcı onayı olmadan devam ETMEZ.
        {
            const g1Existing = await loadCheckpoint(r.l0.commandId, 'G1_UNDERSTANDING');
            if (!g1Existing || g1Existing.status === 'PENDING') {
                // Henüz onay yok — checkpoint kaydet ve ESCALATED dön
                const understanding: GateUnderstanding = {
                    raw_command:     rawInput,
                    understood_as:   r.analysis.reasoning,
                    affected_system: r.analysis.methodology,
                    affected_vars:   r.analysis.constraints,
                    confidence:      r.analysis.confidence,
                    questions:       r.analysis.questions,
                    methodology:     r.analysis.methodology,
                    risks:           r.analysis.risks,
                };

                if (!g1Existing) {
                    await saveCheckpoint({
                        commandId:     r.l0.commandId,
                        gateId:        'G1_UNDERSTANDING',
                        understanding,
                        pipelineState: { rawInput, mode, analysis: r.analysis },
                        mode,
                        createdBy:     context.userId,
                    });
                }

                const result = finish(r, 'ESCALATED', 'G1',
                    ['G-1: Görev anlama onayı bekleniyor — kullanıcı KABUL/RED verecek'], t0);
                result.pendingGate    = 'G1_UNDERSTANDING';
                result.understanding  = understanding;
                return result;
            }

            if (g1Existing.status === 'REJECTED') {
                await updateStatus(r.l0.commandId, 'failed');
                return finish(r, 'REJECTED', 'G1',
                    [`G-1: Kullanıcı görevi REDDETTİ — ${g1Existing.reject_reason ?? 'sebep belirtilmedi'}`], t0);
            }
            // APPROVED → devam
        }

        // ═══ G-2: İŞ PLANI KAPISI ═══════════════════════════
        // Doküman: "İş Planı → Kullanıcı onayı zorunlu → G-3. KURAL: İş planı onaysız G-3'e GEÇİLEMEZ"
        // taskDecomposer ile plan oluştur → kullanıcıya sun → KABUL/RED bekle.
        {
            const g2Existing = await loadCheckpoint(r.l0.commandId, 'G2_PLAN');
            if (!g2Existing || g2Existing.status === 'PENDING') {
                // İş planı oluştur
                const { goreviPlanla } = await import('./taskDecomposer');
                const planResult = goreviPlanla(rawInput);

                const plan: GatePlan = {
                    steps: planResult.alt_gorevler.map((ag: { sira: number; gorev: string; ajan_kodu: string }) => ({
                        no:              ag.sira,
                        description:     ag.gorev,
                        responsible:     ag.ajan_kodu,
                        expected_output: `${ag.ajan_kodu} tarafından tamamlanacak`,
                    })),
                    total_steps:   planResult.alt_gorevler.length,
                    estimated_ms:  planResult.alt_gorevler.length * 5000,
                    requires_ai:   planResult.karmasik,
                    requires_db:   rawInput.toLowerCase().includes('veritabanı') || rawInput.toLowerCase().includes('supabase'),
                    complexity:    planResult.complexity_score >= 8 ? 'high' :
                                   planResult.complexity_score >= 4 ? 'medium' : 'low',
                };

                if (!g2Existing) {
                    await saveCheckpoint({
                        commandId:     r.l0.commandId,
                        gateId:        'G2_PLAN',
                        plan,
                        pipelineState: {
                            rawInput, mode,
                            analysis: r.analysis,
                            planOzet: planResult.ozet,
                            complexity_score: planResult.complexity_score,
                        },
                        mode,
                        createdBy:     context.userId,
                    });
                }

                const result = finish(r, 'ESCALATED', 'G2',
                    ['G-2: İş planı onayı bekleniyor — kullanıcı KABUL/RED verecek'], t0);
                result.pendingGate = 'G2_PLAN';
                result.plan        = plan;
                return result;
            }

            if (g2Existing.status === 'REJECTED') {
                await updateStatus(r.l0.commandId, 'failed');
                return finish(r, 'REJECTED', 'G2',
                    [`G-2: İş planı REDDEDİLDİ — ${g2Existing.reject_reason ?? 'sebep belirtilmedi'}`], t0);
            }
            // APPROVED → devam
        }

        // ═══ K2.3: 92 KRİTER ════════════════════════════════
        await updateStatus(r.l0.commandId, 'detecting');
        r.criteria = await validateK2Criteria(r.l0.commandId, rawInput, r.analysis, mode);

        if (!r.criteria.passed) {
            await updateStatus(r.l0.commandId, 'failed');
            return finish(r, 'REJECTED', 'K2.3',
                [`Kriter skoru: ${r.criteria.score}/100 (eşik: 75)`], t0);
        }

        // ═══ K3: FORMAL SPEC ════════════════════════════════
        await updateStatus(r.l0.commandId, 'specifying');
        r.formalSpec = await generateFormalSpec(r.l0.commandId, rawInput, r.analysis);

        // ═══ K5.1: PROOF SOLVE ══════════════════════════════
        await updateStatus(r.l0.commandId, 'proving');
        const constraints = [
            ...r.analysis.constraints,
            ...r.formalSpec.preConditions.filter(p => !r.analysis!.constraints.includes(p)),
        ];

        if (constraints.length === 0) {
            return finish(r, 'ESCALATED', 'K5',
                ['Constraint boş — proof üretilemez (degraded)'], t0);
        }

        r.proof = await solveProof(r.l0.commandId, constraints);

        // ═══ K5.2: PROOF VERIFY (A2) ════════════════════════
        await updateStatus(r.l0.commandId, 'verifying');
        r.proof = await verifyProof(r.l0.commandId, r.proof);

        // ═══ K4: RED TEAM ════════════════════════════════════
        await updateStatus(r.l0.commandId, 'refuting');
        r.redTeam = await runRedTeam(r.l0.commandId, rawInput, r.analysis, r.criteria);

        // ═══ K6: KONSENSÜS ══════════════════════════════════
        await updateStatus(r.l0.commandId, 'consensus');
        r.consensus = await runConsensus(r.l0.commandId, r.criteria, r.proof, r.redTeam);

        if (r.consensus.decision === 'HALT') {
            await updateStatus(r.l0.commandId, 'failed');
            return finish(r, 'REJECTED', 'K6',
                [`Konsensüs: HALT — ${r.consensus.vetoReason ?? 'Quorum red'}`], t0);
        }
        if (r.consensus.decision === 'ESCALATE') {
            return finish(r, 'ESCALATED', 'K6', ['Konsensüs: ESCALATE — insan müdahalesi'], t0);
        }

        // ═══ K7: 8+1 GATE CHECK ═════════════════════════════
        await updateStatus(r.l0.commandId, 'gate_check');
        r.gateCheck = await runGateCheck(
            r.l0.commandId, r.analysis, r.criteria,
            r.proof, r.redTeam, r.consensus,
            r.formalSpec, mode === 'STRICT'
        );

        if (!r.gateCheck.allPassed) {
            await updateStatus(r.l0.commandId, 'failed');
            return finish(r, 'REJECTED', 'K7',
                [`Gate başarısız: ${r.gateCheck.failedGate}`], t0);
        }

        // ═══ K8: EXECUTION ══════════════════════════════════
        if (handler) {
            await updateStatus(r.l0.commandId, 'executing');
            r.execution = await executeCommand(r.l0.commandId, handler);

            if (r.execution.status !== 'success') {
                return finish(r, 'ERROR', 'K8',
                    [`İcra başarısız: ${r.execution.status}`], t0);
            }

            // ═══ K9: POST-EXEC ═══════════════════════════════
            r.postExec = await runPostExec(r.l0.commandId, r.execution, r.proof);
        }

        // ═══ ONAY ═══════════════════════════════════════════
        await updateStatus(r.l0.commandId, 'completed');

        // Kural #97: Başarılı işlem → operatör kaydı
        await supabase.from('operator_certs').insert({
            user_id:   context.userId,
            cert_type: `PIPELINE_${mode}_APPROVED`,
            issued_at: new Date().toISOString(),
        }).then(({ error }) => {
            if (error) console.warn('[Kural#97] operator_certs yazılamadı:', error.message);
        });

        // Kural #85: Pipeline benchmark metrikleri
        const totalMs = Date.now() - t0;
        await supabase.from('performance_metrics').insert([
            { module: 'pipeline', metric_name: 'total_pipeline_ms',    value: totalMs },
            { module: 'pipeline', metric_name: 'criteria_score',       value: r.criteria?.score ?? 0 },
            { module: 'pipeline', metric_name: 'consensus_confidence', value: r.consensus?.confidence ?? 0 },
        ]).then(({ error }) => {
            if (error) console.warn('[Kural#85] performance_metrics yazılamadı:', error.message);
        });

        // Kural #49: Başarılı işlem → hata sayıcısını sıfırla
        clearErrorRecord(context.userId);

        return finish(r, 'APPROVED', 'K9', errors, t0);

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
        errors.push(msg);

        if (r.l0) {
            await updateStatus(r.l0.commandId, 'failed');
            await supabase.from('alerts').insert({
                severity:        5,
                rule_triggered:  'PIPELINE_CRASH',
                fail_level:      'critical',
                module:          'pipeline',
                details:         { commandId: r.l0.commandId, error: msg },
            });
        }

        // Kural #49: Hata sayıcısını artır
        recordError(context.userId);

        return finish(r, 'ERROR', 'CRASH', errors, t0);
    }
}

// ─── YARDIMCILAR ────────────────────────────────────────────

function finish(
    r:      Partial<PipelineResult>,
    status: PipelineResult['status'],
    stage:  string,
    errors: string[],
    t0:     number
): PipelineResult {
    return {
        commandId:       r.l0?.commandId ?? 'unknown',
        status, stage,
        pendingGate:     r.pendingGate,
        understanding:   r.understanding,
        plan:            r.plan,
        approvalReport:  r.approvalReport,
        l0:              r.l0         ?? null,
        analysis:        r.analysis   ?? null,
        criteria:        r.criteria   ?? null,
        formalSpec:      r.formalSpec ?? null,
        proof:           r.proof      ?? null,
        redTeam:         r.redTeam    ?? null,
        consensus:       r.consensus  ?? null,
        gateCheck:       r.gateCheck  ?? null,
        execution:       r.execution  ?? null,
        postExec:        r.postExec   ?? null,
        errors, totalMs: Date.now() - t0, timestamp: Date.now(),
    };
}

async function updateStatus(commandId: string, status: string): Promise<void> {
    await supabase.from('commands').update({ status }).eq('id', commandId);
}
