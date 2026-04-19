// src/core/SİSTEMReporter.ts
// ============================================================
// NÄ°ZAM RAPORLAMA KATMANI â€” SÃ¼reÃ§ Ä°zleme ve Bildirim
// ============================================================

import { logAudit } from '@/services/auditService';

export type SİSTEMStage = 'ANALIZ' | 'PLANLAMA' | 'ICRA' | 'DENETIM' | 'ONAY';

/**
 * NÄ°ZAM SÃ¼reÃ§ Raporu GÃ¶nderir.
 * @param stage Ä°lgili aÅŸama
 * @param description Ä°ÅŸlem aÃ§Ä±klamasÄ±
 * @param details Teknik detaylar
 */
export async function reportSistemProcess(
  stage: SİSTEMStage,
  description: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const SİSTEMDescription = `[NÄ°ZAM-CONTROL] [${stage}] ${description}`;
  
  await logAudit({
    operation_type: 'SYSTEM',
    performed_by: 'SISTEM_TAKIP_PANELI',
    action_description: SİSTEMDescription,
    metadata: {
      action_code: `STP_${stage}`,
      SİSTEM_controlled: true,
      ...details
    }
  });

  // GÃ¶zlemci raporu â€” Konsolda da gÃ¶rÃ¼nmesi iÃ§in
  console.log(`\x1b[35m%s\x1b[0m`, SİSTEMDescription);
}

/**
 * NÄ°ZAM Kritik UyarÄ± Raporu.
 */
export async function reportSistemAnomaly(
  description: string,
  severity: 'WARNING' | 'CRITICAL' = 'WARNING'
): Promise<void> {
  await logAudit({
    operation_type: 'ERROR',
    performed_by: 'SISTEM_TAKIP_PANELI',
    action_description: `[NÄ°ZAM-ANOMALI] ${description}`,
    error_severity: severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
    status: 'basarisiz',
    metadata: {
      action_code: 'STP_ANOMALY',
      SİSTEM_controlled: true,
      critical: severity === 'CRITICAL'
    }
  });
}

