// src/core/SİSTEMReporter.ts
// ============================================================
// NİZAM RAPORLAMA KATMANI — Süreç İzleme ve Bildirim
// ============================================================

import { logAudit } from '@/services/auditService';

export type SİSTEMStage = 'ANALIZ' | 'PLANLAMA' | 'ICRA' | 'DENETIM' | 'ONAY';

/**
 * NİZAM Süreç Raporu Gönderir.
 * @param stage İlgili aşama
 * @param description İŞlem açıklaması
 * @param details Teknik detaylar
 */
export async function reportSistemProcess(
  stage: SİSTEMStage,
  description: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const SİSTEMDescription = `[NİZAM-CONTROL] [${stage}] ${description}`;
  
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

  // Gözlemci raporu — Konsolda da görünmesi için
  console.log(`\x1b[35m%s\x1b[0m`, SİSTEMDescription);
}

/**
 * NİZAM Kritik Uyarı Raporu.
 */
export async function reportSistemAnomaly(
  description: string,
  severity: 'WARNING' | 'CRITICAL' = 'WARNING'
): Promise<void> {
  await logAudit({
    operation_type: 'ERROR',
    performed_by: 'SISTEM_TAKIP_PANELI',
    action_description: `[NİZAM-ANOMALI] ${description}`,
    error_severity: severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
    status: 'basarisiz',
    metadata: {
      action_code: 'STP_ANOMALY',
      SİSTEM_controlled: true,
      critical: severity === 'CRITICAL'
    }
  });
}

