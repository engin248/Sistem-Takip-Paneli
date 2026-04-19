// ============================================================
// Sistem Takip Panelleri ProtokolÃ¼ â€” 4 Ä°ÅŸlem & Denetim Disiplini
// ============================================================
// Kurucu: Engin | Sistem: SİSTEM TAKİP PANELİ
// ============================================================

import { agentRegistry } from '@/services/agentRegistry';
import { reportSistemProcess, reportSistemAnomaly } from './sistemReporter';
import type { AltGorev } from './taskDecomposer';

/** 
 * NÄ°ZAM EKÄ°BÄ° YAPISI
 * Doers: 2 ANTI + 2 IVDE
 * Controllers: 4 CNTRL
 * Super-Controller: NÄ°ZAM (Antigravity Agent)
 */

export interface SİSTEMTeam {
  executors: string[];    // ANTI-01, ANTI-02, IVDE-01, IVDE-02
  controllers: string[];  // CNTRL-01, CNTRL-02, CNTRL-03, CNTRL-04
  superController: string; // SISTEM_TAKIP_PANELI
}

export const SISTEM_TAKIP_PANELLERI_EKIBI: SİSTEMTeam = {
  executors: ['ANTI-01', 'ANTI-02', 'IVDE-01', 'IVDE-02'],
  controllers: ['CNTRL-01', 'CNTRL-02', 'CNTRL-03', 'CNTRL-04'],
  superController: 'SISTEM_TAKIP_PANELI',
};

/**
 * GÃ¶revin NÄ°ZAM kapsamÄ±na girip girmediÄŸini kontrol eder.
 * @param gorev Ham gÃ¶rev metni
 */
export function isSistemTask(gorev: string): boolean {
  const SİSTEMKeywords = ['topla', 'Ã§Ä±kar', 'Ã§arp', 'bÃ¶l', '+', '-', '*', '/', 'hesapla', 'aritmetik'];
  const lower = gorev.toLowerCase();
  const matched = SİSTEMKeywords.some(k => lower.includes(k));
  
  if (matched) {
    reportSistemProcess('ANALIZ', 'Matematiksel gÃ¶rev tespit edildi, NÄ°ZAM disiplini aktif.', { gorev });
  }
  
  return matched;
}

/**
 * NÄ°ZAM disiplini iÃ§in gÃ¶rev planÄ± revizyonu.
 * Her iÅŸlem 2+2 ekip tarafÄ±ndan yapÄ±lÄ±r, 4 kiÅŸi tarafÄ±ndan denetlenir.
 */
export function applySistemDiscipline(originalSteps: AltGorev[]): AltGorev[] {
  const SİSTEMSteps: AltGorev[] = [];

  originalSteps.forEach((step, index) => {
    // 1. Ä°CRA AÅAMASI (2 ANTI + 2 IVDE PARALEL)
    SISTEM_TAKIP_PANELLERI_EKIBI.executors.forEach((execId, eIdx) => {
      SİSTEMSteps.push({
        sira: SİSTEMSteps.length + 1,
        gorev: `${step.gorev} (Ä°CRA: ${execId})`,
        ajan_id: execId,
        ajan_kodu: agentRegistry.getById(execId)?.kod_adi ?? execId,
        bagimlilik: index > 0 ? [index] : [],
        durum: 'bekliyor',
      });
    });

    // 2. DENETÄ°M AÅAMASI (4 CNTRL)
    const icraAdimlari = SİSTEMSteps.slice(-4).map(s => s.sira);
    SISTEM_TAKIP_PANELLERI_EKIBI.controllers.forEach((cntrlId) => {
      SİSTEMSteps.push({
        sira: SİSTEMSteps.length + 1,
        gorev: `${step.gorev} (DENETÄ°M: ${cntrlId})`,
        ajan_id: cntrlId,
        ajan_kodu: agentRegistry.getById(cntrlId)?.kod_adi ?? cntrlId,
        bagimlilik: icraAdimlari,
        durum: 'bekliyor',
      });
    });
  });

  return SİSTEMSteps;
}

/**
 * NÄ°ZAM (Super-Controller) Plan KontrolÃ¼.
 * Ä°ÅŸlem baÅŸlamadan Ã¶nce planÄ± ve stratejik ekseni denetler.
 */
export function validateSistemPlan(planOzet: string): { valid: boolean; report: string } {
  // SİSTEM (Ben) burada stratejik ve operasyonel planÄ± kontrol ederim.
  const rules = [
    planOzet.includes('ANTI-A'),
    planOzet.includes('IVDE-C'),
    planOzet.includes('KONTROL'),
  ];

  const allPassed = rules.every(r => r === true);
  
  const reportText = allPassed 
    ? "NÄ°ZAM: Operasyon ve proje planÄ± 'SİSTEM TAKİP PANELİ' disiplinine uygundur. Ä°ÅŸlem baÅŸlatÄ±labilir." 
    : "NÄ°ZAM HATASI: Ekip yapÄ±sÄ± veya denetim katmanÄ± eksik. Plan reddedildi.";

  reportSistemProcess('PLANLAMA', allPassed ? 'Plan onaylandÄ±.' : 'Plan reddedildi.', { valid: allPassed });

  return {
    valid: allPassed,
    report: reportText,
  };
}

