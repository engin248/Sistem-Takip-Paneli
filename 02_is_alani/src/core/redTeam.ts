// src/core/redTeam.ts
// K4 — Red Team / Çürütme Motoru
// Monte Carlo simülasyon + kural tabanlı çürütme

import { supabase } from '@/lib/supabase';
import type { HermAIAnalysis, CriteriaResult } from './types';

export interface RedTeamResult {
    commandId:       string;
    attacks:         Attack[];
    monteCarloScore: number;
    survived:        boolean;
    failedAttacks:   string[];
    timestamp:       number;
}

interface Attack {
    id:     string;
    name:   string;
    type:   'logical' | 'adversarial' | 'edge_case' | 'resource' | 'temporal';
    passed: boolean;
    reason: string;
}

export async function runRedTeam(
    commandId: string,
    input:     string,
    analysis:  HermAIAnalysis,
    criteria:  CriteriaResult
): Promise<RedTeamResult> {
    const attacks: Attack[] = [
        { id: 'RT-001', name: 'Çelişki testi',          type: 'logical',      ...testContradiction(analysis) },
        { id: 'RT-002', name: 'Döngüsel mantık',         type: 'logical',      ...testCircularReasoning(analysis) },
        { id: 'RT-003', name: 'Aşırı güven kontrolü',    type: 'logical',      ...testOverconfidence(analysis) },
        { id: 'RT-004', name: 'Girdi manipülasyonu',     type: 'adversarial',  ...testInputManipulation(input) },
        { id: 'RT-005', name: 'Prompt enjeksiyonu',      type: 'adversarial',  ...testPromptInjection(input) },
        { id: 'RT-006', name: 'Sınır değer testi',       type: 'edge_case',    ...testBoundaryValues(analysis) },
        { id: 'RT-007', name: 'Boş alternatif testi',    type: 'edge_case',    ...testEmptyAlternatives(analysis) },
        { id: 'RT-008', name: 'Büyük payload',           type: 'resource',     ...testLargePayload(input, analysis) },
        { id: 'RT-009', name: 'Zaman tutarlılığı',       type: 'temporal',     ...testTimingConsistency(analysis, criteria) },
        { id: 'RT-010', name: 'Kriter-analiz uyumu',     type: 'logical',      ...testCriteriaAnalysisAlignment(analysis, criteria) },
        { id: 'RT-011', name: 'Entropy-confidence uyumu',type: 'logical',      ...testEntropyConfidence(analysis) },
        { id: 'RT-012', name: 'Risk-alternatif oranı',   type: 'logical',      ...testRiskAlternativeRatio(analysis) },
    ];

    const passedCount      = attacks.filter(a => a.passed).length;
    const monteCarloScore  = Math.round((passedCount / attacks.length) * 100);
    const survived         = monteCarloScore >= 70;
    const failedAttacks    = attacks.filter(a => !a.passed).map(a => a.id);

    const result: RedTeamResult = {
        commandId, attacks, monteCarloScore, survived, failedAttacks,
        timestamp: Date.now(),
    };

    const { error: rtErr } = await supabase.from('refutations').insert({
        command_id:      commandId,
        red_team_result: { attacks: attacks.map(a => ({ id: a.id, passed: a.passed, reason: a.reason })) },
        monte_carlo:     { score: monteCarloScore, total: attacks.length, passed: passedCount },
        consensus_result: survived ? 'proceed' : 'halt',
        quorum_votes:    {},
    });

    if (rtErr) {
        await supabase.from('immutable_logs').insert({
            module: 'K4', event_type: 'RED_TEAM_WRITE_ERROR',
            severity: 'critical',
            payload: { commandId, error: rtErr.message },
            hash: `K4_ERR_${commandId}`, prev_hash: '',
        });
    }

    return result;
}

// ─── Saldırı fonksiyonları ─────────────────────────────────────

function testContradiction(a: HermAIAnalysis): { passed: boolean; reason: string } {
    const has = a.reasoning.includes(a.refutation.substring(0, 30)) && a.refutation.length > 30;
    return { passed: !has, reason: has ? 'Reasoning ve refutation çelişiyor' : 'Çelişki yok' };
}
function testCircularReasoning(a: HermAIAnalysis): { passed: boolean; reason: string } {
    const c = a.methodology.substring(0, 50) === a.reasoning.substring(0, 50);
    return { passed: !c, reason: c ? 'Methodology reasoning ile aynı' : 'Döngüsel mantık yok' };
}
function testOverconfidence(a: HermAIAnalysis): { passed: boolean; reason: string } {
    const o = a.confidence > 0.95 && a.alternatives.length < 2;
    return { passed: !o, reason: o ? 'Aşırı güven + yetersiz alternatif' : 'Güven/alternatif dengesi uygun' };
}
function testInputManipulation(input: string): { passed: boolean; reason: string } {
    const s = /[<>{}|\\`]/.test(input);
    return { passed: !s, reason: s ? 'Şüpheli karakter tespit' : 'Girdi temiz' };
}
function testPromptInjection(input: string): { passed: boolean; reason: string } {
    const i = /ignore|forget|override|system/i.test(input);
    return { passed: !i, reason: i ? 'Prompt injection girişimi' : 'Injection yok' };
}
function testBoundaryValues(a: HermAIAnalysis): { passed: boolean; reason: string } {
    const b = a.confidence === 0 || a.confidence === 1 || a.entropy < 0;
    return { passed: !b, reason: b ? 'Sınır değer ihlali' : 'Değerler aralıkta' };
}
function testEmptyAlternatives(a: HermAIAnalysis): { passed: boolean; reason: string } {
    const e = a.alternatives.some(x => x.trim().length < 5);
    return { passed: !e, reason: e ? 'Boş/kısa alternatif' : 'Alternatifler yeterli' };
}
function testLargePayload(input: string, a: HermAIAnalysis): { passed: boolean; reason: string } {
    const total = input.length + JSON.stringify(a).length;
    return { passed: total <= 20000, reason: total > 20000 ? `Payload büyük: ${total}` : 'Payload uygun' };
}
function testTimingConsistency(_a: HermAIAnalysis, c: CriteriaResult): { passed: boolean; reason: string } {
    const stale = Date.now() - c.timestamp > 30_000;
    return { passed: !stale, reason: stale ? 'Kriter 30s\'den eski' : 'Zaman tutarlı' };
}
function testCriteriaAnalysisAlignment(a: HermAIAnalysis, c: CriteriaResult): { passed: boolean; reason: string } {
    const m = a.confidence > 0.8 && c.score < 50;
    return { passed: !m, reason: m ? 'Yüksek güven + düşük kriter skoru' : 'Uyumlu' };
}
function testEntropyConfidence(a: HermAIAnalysis): { passed: boolean; reason: string } {
    const m = (a.confidence > 0.9 && a.entropyClass === 'high') || (a.confidence < 0.2 && a.entropyClass === 'low');
    return { passed: !m, reason: m ? 'Entropy-confidence çelişkisi' : 'Uyumlu' };
}
function testRiskAlternativeRatio(a: HermAIAnalysis): { passed: boolean; reason: string } {
    const r = /yüksek|kritik|tehlikeli/i.test(a.risks) && a.alternatives.length < 2;
    return { passed: !r, reason: r ? 'Yüksek risk ama yetersiz alternatif' : 'Dengeli' };
}
