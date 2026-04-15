// src/core/bootstrap.ts
// Sistem başlatma ve sağlık kontrolü

import { supabase } from '@/lib/supabase';

export interface BootstrapResult {
    status:   'READY' | 'DEGRADED' | 'FATAL';
    checks:   BootstrapCheck[];
    timestamp: number;
}

interface BootstrapCheck {
    name:    string;
    passed:  boolean;
    message: string;
}

export async function runBootstrap(): Promise<BootstrapResult> {
    const checks: BootstrapCheck[] = [];

    // 1. Supabase bağlantısı
    try {
        const { error } = await supabase.from('commands').select('id').limit(1);
        checks.push({
            name:    'supabase_connection',
            passed:  !error,
            message: error ? `DB hatası: ${error.message}` : 'Bağlantı OK',
        });
    } catch (e) {
        checks.push({ name: 'supabase_connection', passed: false, message: String(e) });
    }

    // 2. immutable_logs tablosu
    try {
        const { error } = await supabase.from('immutable_logs').select('id').limit(1);
        checks.push({
            name:    'immutable_logs',
            passed:  !error,
            message: error ? error.message : 'Tablo OK',
        });
    } catch (e) {
        checks.push({ name: 'immutable_logs', passed: false, message: String(e) });
    }

    // 3. commands tablosu
    try {
        const { error } = await supabase.from('commands').select('id').limit(1);
        checks.push({
            name:    'commands_table',
            passed:  !error,
            message: error ? error.message : 'Tablo OK',
        });
    } catch (e) {
        checks.push({ name: 'commands_table', passed: false, message: String(e) });
    }

    // 4. proof_chain tablosu
    try {
        const { error } = await supabase.from('proof_chain').select('id').limit(1);
        checks.push({
            name:    'proof_chain',
            passed:  !error,
            message: error ? error.message : 'Tablo OK',
        });
    } catch (e) {
        checks.push({ name: 'proof_chain', passed: false, message: String(e) });
    }

    // 5. ENV kontrol
    const envOk = !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    checks.push({
        name:    'env_vars',
        passed:  envOk,
        message: envOk ? 'ENV OK' : 'SUPABASE env eksik',
    });

    // Sonuç
    const failed  = checks.filter(c => !c.passed).length;
    const status: BootstrapResult['status'] =
        failed === 0          ? 'READY' :
        failed <= 2           ? 'DEGRADED' : 'FATAL';

    return { status, checks, timestamp: Date.now() };
}
