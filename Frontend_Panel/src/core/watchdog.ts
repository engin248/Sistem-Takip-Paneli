// src/core/watchdog.ts
// V-FINAL Watchdog — Sistem sağlık izleyicisi
// 60 saniyede bir ping atar, anomali varsa alert açar

import { supabase } from '@/lib/supabase';

let _interval: ReturnType<typeof setInterval> | null = null;

export function startWatchdog(intervalMs = 60_000): void {
    if (_interval) return; // Zaten çalışıyor

    _interval = setInterval(async () => {
        try {
            await pulse();
        } catch (err) {
            console.error('[WATCHDOG] Pulse hatası:', err);
        }
    }, intervalMs);

    // İlk pulse hemen çalışsın
    pulse().catch(console.error);
    console.log(`[WATCHDOG] Başlatıldı — interval: ${intervalMs}ms`);
}

export function stopWatchdog(): void {
    if (_interval) {
        clearInterval(_interval);
        _interval = null;
        console.log('[WATCHDOG] Durduruldu');
    }
}

async function pulse(): Promise<void> {
    const now = new Date().toISOString();

    // 1. Heartbeat güncelle
    await supabase.from('watchdog_heartbeats').upsert({
        module:    'pipeline',
        status:    'alive',
        last_beat: now,
    }, { onConflict: 'module' });

    // 2. Son 5 dakikadaki hata sayısını kontrol et
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { count } = await supabase
        .from('immutable_logs')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .gte('created_at', since);

    if ((count ?? 0) >= 5) {
        await supabase.from('alerts').insert({
            severity:       5,
            rule_triggered: 'WATCHDOG_CRITICAL_SPIKE',
            fail_level:     'critical',
            module:         'watchdog',
            details:        { critical_count: count, since },
        });
        console.warn(`[WATCHDOG] ⚠️ 5 dakikada ${count} kritik hata`);
    }
}
