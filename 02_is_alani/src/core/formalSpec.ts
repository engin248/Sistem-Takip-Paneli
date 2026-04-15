// src/core/formalSpec.ts
// K3 — Formal Spesifikasyon Üreteci
// HermAI analizinden pre/post condition ve invariant çıkarır

import { supabase } from '@/lib/supabase';
import type { HermAIAnalysis } from './types';

export interface FormalSpec {
    commandId:       string;
    preConditions:   string[];
    postConditions:  string[];
    invariants:      string[];
    z3Input:         string;
    timestamp:       number;
}

export async function generateFormalSpec(
    commandId: string,
    input:     string,
    analysis:  HermAIAnalysis
): Promise<FormalSpec> {
    // Pre-conditions
    const preConditions: string[] = [
        ...analysis.constraints,
        `input_length >= 3`,
        `input_length <= 4096`,
        `confidence >= 0.15`,
    ];

    // Post-conditions
    const postConditions: string[] = [];
    if (analysis.methodology) {
        analysis.methodology
            .split(/\d+[.)]\s*/)
            .filter(s => s.trim().length > 5)
            .forEach((step, i) => {
                postConditions.push(`step_${i + 1}_completed: ${step.trim().substring(0, 100)}`);
            });
    }
    if (postConditions.length === 0) postConditions.push('operation_completed: true');

    // Invariants
    const invariants: string[] = [
        'system_integrity: preserved',
        'data_consistency: maintained',
        'no_unauthorized_access: true',
    ];
    if (/yüksek risk|kritik/i.test(analysis.risks))   invariants.push('high_risk_guard: active');
    if (analysis.confidence < 0.5)                     invariants.push('low_confidence_guard: active');

    const z3Input = generateSMTInput(preConditions, postConditions, invariants);

    const spec: FormalSpec = {
        commandId, preConditions, postConditions, invariants, z3Input,
        timestamp: Date.now(),
    };

    await supabase.from('formal_specs').insert({
        command_id:      commandId,
        pre_conditions:  preConditions,
        post_conditions: postConditions,
        invariants,
        z3_input:        z3Input,
    });

    return spec;
}

function generateSMTInput(pre: string[], post: string[], inv: string[]): string {
    const lines: string[] = [
        '; V-FINAL Formal Specification',
        '(set-logic QF_LIA)',
        '',
        '; Pre-conditions',
    ];
    pre.forEach((p, i) => {
        lines.push(`(declare-const pre_${i} Bool)`);
        lines.push(`(assert pre_${i}) ; ${p}`);
    });
    lines.push('', '; Post-conditions');
    post.forEach((p, i) => {
        lines.push(`(declare-const post_${i} Bool)`);
        lines.push(`(assert post_${i}) ; ${p}`);
    });
    lines.push('', '; Invariants');
    inv.forEach((v, i) => {
        lines.push(`(declare-const inv_${i} Bool)`);
        lines.push(`(assert inv_${i}) ; ${v}`);
    });
    lines.push('', '(check-sat)', '(get-model)');
    return lines.join('\n');
}
