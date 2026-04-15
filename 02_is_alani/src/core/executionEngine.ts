// src/core/executionEngine.ts
// K8 — Command Execution Engine

import { supabase } from '@/lib/supabase';

export interface ExecutionResult {
  status:        'success' | 'failed' | 'rolled_back' | 'killed';
  output:        Record<string, unknown>;
  processingMs:  number;
  rolledBack:    boolean;
}

export async function executeCommand(
  commandId: string,
  handler:   () => Promise<Record<string, unknown>>
): Promise<ExecutionResult> {
  const t0 = Date.now();

  // Snapshot al (rollback için)
  const { data: snapshot } = await supabase
    .from('commands')
    .select('*')
    .eq('id', commandId)
    .maybeSingle();

  await supabase.from('snapshots').insert({
    command_id:   commandId,
    state_before: snapshot ?? {},
  });

  try {
    const output      = await handler();
    const processingMs = Date.now() - t0;

    await supabase.from('executions').insert({
      command_id:    commandId,
      status:        'success',
      result:        output,
      processing_ms: processingMs,
    });

    return { status: 'success', output, processingMs, rolledBack: false };

  } catch (err: unknown) {
    const processingMs = Date.now() - t0;
    const errMsg       = err instanceof Error ? err.message : String(err);

    await supabase.from('executions').insert({
      command_id:    commandId,
      status:        'failed',
      result:        { error: errMsg },
      processing_ms: processingMs,
    });

    return { status: 'failed', output: { error: errMsg }, processingMs, rolledBack: false };
  }
}
