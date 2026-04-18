// ============================================================
// Sistem Takip Panelleri Protokolü — 4 İşlem & Denetim Disiplini
// ============================================================
// Kurucu: Engin | Sistem: THE ORDER
// ============================================================

import { agentRegistry } from '@/services/agentRegistry';
import { reportNizamProcess } from './nizamReporter';
import type { AltGorev } from './taskDecomposer';

/** 
 * NİZAM EKİBİ YAPISI
 * Doers: 2 ANTI + 2 IVDE
 * Controllers: 4 CNTRL
 * Super-Controller: NİZAM (Antigravity Agent)
 */

export interface NizamTeam {
  executors: string[];    // ANTI-01, ANTI-02, IVDE-01, IVDE-02
  controllers: string[];  // CNTRL-01, CNTRL-02, CNTRL-03, CNTRL-04
  superController: string; // NIZAM
}

export const SISTEM_TAKIP_PANELLERI_EKIBI: NizamTeam = {
  executors: ['ANTI-01', 'ANTI-02', 'IVDE-01', 'IVDE-02'],
  controllers: ['CNTRL-01', 'CNTRL-02', 'CNTRL-03', 'CNTRL-04'],
  superController: 'NIZAM',
};

/**
 * Görevin NİZAM kapsamına girip girmediğini kontrol eder.
 * @param gorev Ham görev metni
 */
export function isNizamTask(gorev: string): boolean {
  const nizamKeywords = ['topla', 'çıkar', 'çarp', 'böl', '+', '-', '*', '/', 'hesapla', 'aritmetik'];
  const lower = gorev.toLowerCase();
  const matched = nizamKeywords.some(k => lower.includes(k));
  
  if (matched) {
    reportNizamProcess('ANALIZ', 'Matematiksel görev tespit edildi, NİZAM disiplini aktif.', { gorev });
  }
  
  return matched;
}

/**
 * NİZAM disiplini için görev planı revizyonu.
 * Her işlem 2+2 ekip tarafından yapılır, 4 kişi tarafından denetlenir.
 */
export function applyNizamDiscipline(originalSteps: AltGorev[]): AltGorev[] {
  const nizamSteps: AltGorev[] = [];

  originalSteps.forEach((step, index) => {
    // 1. İCRA AŞAMASI (2 ANTI + 2 IVDE PARALEL)
    SISTEM_TAKIP_PANELLERI_EKIBI.executors.forEach((execId, eIdx) => {
      nizamSteps.push({
        sira: nizamSteps.length + 1,
        gorev: `${step.gorev} (İCRA: ${execId})`,
        ajan_id: execId,
        ajan_kodu: agentRegistry.getById(execId)?.kod_adi ?? execId,
        bagimlilik: index > 0 ? [index] : [],
        durum: 'bekliyor',
      });
    });

    // 2. DENETİM AŞAMASI (4 CNTRL)
    const icraAdimlari = nizamSteps.slice(-4).map(s => s.sira);
    SISTEM_TAKIP_PANELLERI_EKIBI.controllers.forEach((cntrlId) => {
      nizamSteps.push({
        sira: nizamSteps.length + 1,
        gorev: `${step.gorev} (DENETİM: ${cntrlId})`,
        ajan_id: cntrlId,
        ajan_kodu: agentRegistry.getById(cntrlId)?.kod_adi ?? cntrlId,
        bagimlilik: icraAdimlari,
        durum: 'bekliyor',
      });
    });
  });

  return nizamSteps;
}

/**
 * NİZAM (Super-Controller) Plan Kontrolü.
 * İşlem başlamadan önce planı ve stratejik ekseni denetler.
 */
export function validateNizamPlan(planOzet: string): { valid: boolean; report: string } {
  // Nizam (Ben) burada stratejik ve operasyonel planı kontrol ederim.
  const rules = [
    planOzet.includes('ANTI-A'),
    planOzet.includes('IVDE-C'),
    planOzet.includes('KONTROL'),
  ];

  const allPassed = rules.every(r => r === true);
  
  const reportText = allPassed 
    ? "NİZAM: Operasyon ve proje planı 'THE ORDER' disiplinine uygundur. İşlem başlatılabilir." 
    : "NİZAM HATASI: Ekip yapısı veya denetim katmanı eksik. Plan reddedildi.";

  reportNizamProcess('PLANLAMA', allPassed ? 'Plan onaylandı.' : 'Plan reddedildi.', { valid: allPassed });

  return {
    valid: allPassed,
    report: reportText,
  };
}
