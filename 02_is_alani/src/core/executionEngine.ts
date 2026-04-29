// src/core/executionEngine.ts
// K8 — Command Execution Engine
// Snapshot → Execute → Rollback (hata halinde)

import { supabase } from '@/lib/supabase';
import { createHash } from 'crypto';

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

  // ── Snapshot al (rollback için) ──────────────────────────
  const { data: snapshot } = await supabase
    .from('commands')
    .select('*')
    .eq('id', commandId)
    .maybeSingle();

  const { error: snapErr } = await supabase.from('snapshots').insert({
    command_id:   commandId,
    state_before: snapshot ?? {},
  });

  if (snapErr) {
    // Snapshot alınamazsa çalıştırma — güvenli hata
    const { data: lastSnapLog } = await supabase
        .from('immutable_logs')
        .select('hash')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const snapHash = createHash('sha256')
        .update(commandId + 'SNAPSHOT_FAILED' + Date.now())
        .digest('hex');

    await supabase.from('immutable_logs').insert({
      module:     'K8',
      event_type: 'SNAPSHOT_FAILED',
      severity:   'critical',
      payload:    { commandId, error: snapErr.message },
      hash:       snapHash,
      prev_hash:  lastSnapLog?.hash ?? '',
    });
    const processingMs = Date.now() - t0;
    return { status: 'failed', output: { error: 'Snapshot alınamadı' }, processingMs, rolledBack: false };
  }

  try {
    const output       = await handler();
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

    // ── Rollback — snapshot'tan geri yükle ──────────────────
    let rolledBack = false;
    if (snapshot) {
      const { error: rbErr } = await supabase
        .from('commands')
        .update({ status: snapshot.status ?? 'failed' })
        .eq('id', commandId);

      rolledBack = !rbErr;
    }

    await supabase.from('executions').insert({
      command_id:    commandId,
      status:        rolledBack ? 'rolled_back' : 'failed',
      result:        { error: errMsg, rolledBack },
      processing_ms: processingMs,
    });

    // A6 log — rollback kaydı (prev_hash zinciri)
    const { data: lastExecLog } = await supabase
        .from('immutable_logs')
        .select('hash')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const execHash = createHash('sha256')
        .update(commandId + (rolledBack ? 'ROLLED_BACK' : 'FAILED') + Date.now())
        .digest('hex');

    await supabase.from('immutable_logs').insert({
      module:     'K8',
      event_type: rolledBack ? 'EXEC_ROLLED_BACK' : 'EXEC_FAILED',
      severity:   'critical',
      payload:    { commandId, error: errMsg, rolledBack },
      hash:       execHash,
      prev_hash:  lastExecLog?.hash ?? '',
    });

    return {
      status:       rolledBack ? 'rolled_back' : 'failed',
      output:       { error: errMsg },
      processingMs,
      rolledBack,
    };
  }
}
