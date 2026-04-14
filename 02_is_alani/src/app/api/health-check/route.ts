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
    const externalInfo = {
      dbConnected: false,
      dbLatencyMs: 0,
      siteReachable: false,
      siteLatencyMs: 0,
      siteUrl: 'https://external-target.com',
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
      const siteCheck = await httpHealthCheck('https://external-target.com', 8000);
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

    // ── GENEL DURUM HESAPLAMA ─────────────────────────────
    const hasDown = systems.some(s => s.status === 'down');
    const hasDegraded = systems.some(s => s.status === 'degraded' || s.status === 'unknown');
    const overallStatus: HealthReport['status'] = hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy';

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
