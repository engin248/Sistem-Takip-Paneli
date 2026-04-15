// src/core/formalSpec.ts
// K3 — Formal Specification Generator

import { supabase } from '@/lib/supabase';
import type { HermAIAnalysis } from './types';

export interface FormalSpec {
  preConditions:  string[];
  postConditions: string[];
  invariants:     string[];
  z3Input:        string;
}

export async function generateFormalSpec(
  commandId: string,
  input:     string,
  analysis:  HermAIAnalysis
): Promise<FormalSpec> {
  const preConditions: string[] = [
    `input.length >= 3`,
    `confidence >= 0.3`,
    ...analysis.constraints,
  ];

  const postConditions: string[] = [
    `status === 'completed'`,
    `proof.verified === true`,
  ];

  const invariants: string[] = [
    `entropy >= 0`,
    `confidence <= 1`,
  ];

  const z3Input = preConditions
    .map((c, i) => `(assert (${c.replace(/[^a-zA-Z0-9._ <>!=]/g, ' ')}) ; pre-${i})`)
    .join('\n');

  const spec: FormalSpec = { preConditions, postConditions, invariants, z3Input };

  await supabase.from('formal_specs').insert({
    command_id:      commandId,
    pre_conditions:  preConditions,
    post_conditions: postConditions,
    invariants,
    z3_input:        z3Input,
  });

  return spec;
}
