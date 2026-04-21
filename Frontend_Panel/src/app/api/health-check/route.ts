// ============================================================
// HEALTH CHECK API — SİSTEM SAĞLIK KONTROLÜ
// ============================================================
// İç (STP) ve dış sistemlerin sağlık durumunu
// tek endpoint'ten döndürür.
//
// GET /api/health-check → Tam sağlık raporu
// ============================================================

import { NextResponse } from 'next/server';
import { validateSupabaseConnection } from '@/lib/supabase';
import { isExternalConfigured } from '@/lib/supabaseExternal';
import { pingExternalDB, httpHealthCheck } from '@/services/bridgeService';
import { logAudit } from '@/services/auditService';
import { ERR, processError } from '@/lib/errorCore';
import { getCBDurum } from '@/core/circuitBreaker';
import { checkOllamaHealth } from '@/lib/aiProvider';

export const dynamic = 'force-dynamic';

interface SystemHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  latencyMs: number;
  details?: Record<string, unknown>;
}

interface HealthReport {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  systems: SystemHealth[];
  externalSystem: {
    dbConnected: boolean;
    dbLatencyMs: number;
    siteReachable: boolean;
    siteLatencyMs: number;
    siteUrl: string;
  };
}

export async function GET() {
  const startTime = Date.now();

  try {
    const systems: SystemHealth[] = [];

    // ── 1. STP INTERNAL DB ────────────────────────────────
    const stpConnection = validateSupabaseConnection();
    systems.push({
      name: 'STP Veritabanı (tesxmqhk...)',
      status: stpConnection.isValid ? 'healthy' : 'down',
      latencyMs: Date.now() - startTime,
      details: {
        missing_vars: stpConnection.missingVars,
      },
    });

    // ── 2. DIŞ SİSTEM (KÖPRÜ) ─────────────────────────────
    // NOT: EXTERNAL_SUPABASE_URL tanımlı değilse dış kontrol atlanır.
    // STP bağımsız çalışır — dış bağımlılık olmadan healthy döner.
    const externalSiteUrl = process.env.EXTERNAL_SITE_URL
                         ?? process.env.EXTERNAL_SUPABASE_URL
                         ?? 'not-configured';
    const externalInfo = {
      dbConnected: false,
      dbLatencyMs: 0,
      siteReachable: false,
      siteLatencyMs: 0,
      siteUrl: externalSiteUrl,
    };

    if (isExternalConfigured()) {
      const bridgePing = await pingExternalDB();
      externalInfo.dbConnected = bridgePing.connected;
      externalInfo.dbLatencyMs = bridgePing.latencyMs;

      systems.push({
        name: 'Dış Veritabanı (External)',
        status: bridgePing.connected ? 'healthy' : 'down',
        latencyMs: bridgePing.latencyMs,
        details: {
          projectId: bridgePing.projectId,
          error: bridgePing.error,
        },
      });

      // ── 3. DIŞ WEB SİSTEMİ ─────────────────────────────
      const siteCheck = await httpHealthCheck(externalSiteUrl, 8000);
      externalInfo.siteReachable = siteCheck.reachable;
      externalInfo.siteLatencyMs = siteCheck.latencyMs;

      systems.push({
        name: 'Dış Web Platformu',
        status: siteCheck.reachable ? 'healthy' : 'down',
        latencyMs: siteCheck.latencyMs,
        details: {
          statusCode: siteCheck.statusCode,
          error: siteCheck.error,
        },
      });
    }

    // ── 3. OLLAMA AI ───────────────────────────────────────────────
    // Ollama SADECE lokal ortamda çalışır.
    // Vercel/Production'da Ollama yoktur — kontrol edilmez.
    // Planlama Departmanı kendi lokalinde Ollama kullanır, Frontend'in bilmesine gerek yok.
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
    if (!isProduction) {
      const ollamaHealthy = await checkOllamaHealth();
      const cbDurum = getCBDurum();
      systems.push({
        name: 'Ollama AI (Yerel)',
        status: ollamaHealthy ? 'healthy' : 'down',
        latencyMs: Date.now() - startTime,
        details: {
          url  : process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          model: process.env.OLLAMA_MODEL    || 'llama3:latest',
          circuit_breaker: cbDurum.state,
          toplam_trip    : cbDurum.toplam_trip,
        },
      });
    }

    // ── GENEL DURUM HESAPLAMA ──────────────────────────────────────
    // Kritik: Sadece STP DB. Ollama (Yerel) Vercelde her zaman ulaşılamaz olabilir, opsiyoneldir.
    const kritikSistemler = systems.filter(s => s.name.includes('STP'));
    const opsiyonelSistemler = systems.filter(s => !s.name.includes('STP'));
    const kritikDown = kritikSistemler.some(s => s.status === 'down');
    const opsiyonelDown = opsiyonelSistemler.some(s => s.status === 'down');
    const hasDegraded = systems.some(s => s.status === 'degraded' || s.status === 'unknown');
    const overallStatus: HealthReport['status'] = kritikDown ? 'down' : (opsiyonelDown || hasDegraded) ? 'degraded' : 'healthy';

    const report: HealthReport = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      systems,
      externalSystem: externalInfo,
    };

    // Audit log
    await logAudit({
      operation_type: 'EXECUTE',
      action_description: `Health check: ${overallStatus.toUpperCase()} — ${systems.length} sistem, ${Date.now() - startTime}ms`,
      metadata: {
        action_code: 'HEALTH_CHECK',
        overall_status: overallStatus,
        system_count: systems.length,
        external_db: externalInfo.dbConnected,
        external_site: externalInfo.siteReachable,
        duration_ms: Date.now() - startTime,
      },
    }).catch(() => {});

    return NextResponse.json(report, {
      status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 207 : 503,
    });
  } catch (err) {
    processError(ERR.HEALTH_CHECK, err, {
      kaynak: 'health-check/route.ts',
      islem: 'GET',
    }, 'CRITICAL');

    return NextResponse.json(
      {
        status: 'down',
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
        systems: [],
        externalSystem: { dbConnected: false, dbLatencyMs: 0, siteReachable: false, siteLatencyMs: 0, siteUrl: '' },
      },
      { status: 503 }
    );
  }
}

// trigger rebuild
