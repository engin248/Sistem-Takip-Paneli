// src/instrumentation.ts
// Next.js Instrumentation — Sunucu başlatılırken çalışır
// Watchdog'u otomatik başlatır

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { startWatchdog } = await import('./core/watchdog');
        startWatchdog();
        console.log('[V-FINAL] Sistem başlatıldı — Watchdog aktif');
    }
}
