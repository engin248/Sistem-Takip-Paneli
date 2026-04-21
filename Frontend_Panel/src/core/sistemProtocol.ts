// ============================================================
// Sistem Takip Panelleri Protokolü — 4 İŞlem & Denetim Disiplini
// ============================================================
// Kurucu: Engin | Sistem: SİSTEM TAKİP PANELİ
// ============================================================

import { agentRegistry } from '@/services/agentRegistry';
import { reportSistemProcess, reportSistemAnomaly } from './sistemReporter';
import type { AltGorev } from './taskDecomposer';

/** 
 * STP EKİBİ YAPISI
 * Doers: 2 ANTI + 2 IVDE
 * Controllers: 4 CNTRL
 * Super-Controller: STP (Antigravity Agent)
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
 * Görevin STP kapsamına girip girmediğini kontrol eder.
 * @param gorev Ham görev metni
 */
export function isSistemTask(gorev: string): boolean {
  const SİSTEMKeywords = ['topla', 'çıkar', 'çarp', 'böl', '+', '-', '*', '/', 'hesapla', 'aritmetik'];
  const lower = gorev.toLowerCase();
  const matched = SİSTEMKeywords.some(k => lower.includes(k));
  
  if (matched) {
    reportSistemProcess('ANALIZ', 'Matematiksel görev tespit edildi, STP disiplini aktif.', { gorev });
  }
  
  return matched;
}

/**
 * STP disiplini için görev planı revizyonu.
 * Her işlem 2+2 ekip tarafından yapılır, 4 kişi tarafından denetlenir.
 */
export function applySistemDiscipline(originalSteps: AltGorev[]): AltGorev[] {
  const SİSTEMSteps: AltGorev[] = [];

  originalSteps.forEach((step, index) => {
    // 1. İCRA AÅAMASI (2 ANTI + 2 IVDE PARALEL)
    SISTEM_TAKIP_PANELLERI_EKIBI.executors.forEach((execId, eIdx) => {
      SİSTEMSteps.push({
        sira: SİSTEMSteps.length + 1,
        gorev: `${step.gorev} (İCRA: ${execId})`,
        ajan_id: execId,
        ajan_kodu: agentRegistry.getById(execId)?.kod_adi ?? execId,
        bagimlilik: index > 0 ? [index] : [],
        durum: 'bekliyor',
      });
    });

    // 2. DENETİM AÅAMASI (4 CNTRL)
    const icraAdimlari = SİSTEMSteps.slice(-4).map(s => s.sira);
    SISTEM_TAKIP_PANELLERI_EKIBI.controllers.forEach((cntrlId) => {
      SİSTEMSteps.push({
        sira: SİSTEMSteps.length + 1,
        gorev: `${step.gorev} (DENETİM: ${cntrlId})`,
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
 * STP (Super-Controller) Plan Kontrolü.
 * İŞlem başlamadan önce planı ve stratejik ekseni denetler.
 */
export function validateSistemPlan(planOzet: string): { valid: boolean; report: string } {
  // SİSTEM (Ben) burada stratejik ve operasyonel planı kontrol ederim.
  const rules = [
    planOzet.includes('ANTI-A'),
    planOzet.includes('IVDE-C'),
    planOzet.includes('KONTROL'),
  ];

  const allPassed = rules.every(r => r === true);
  
  const reportText = allPassed 
    ? "STP: Operasyon ve proje planı 'SİSTEM TAKİP PANELİ' disiplinine uygundur. İŞlem başlatılabilir." 
    : "STP HATASI: Ekip yapısı veya denetim katmanı eksik. Plan reddedildi.";

  reportSistemProcess('PLANLAMA', allPassed ? 'Plan onaylandı.' : 'Plan reddedildi.', { valid: allPassed });

  return {
    valid: allPassed,
    report: reportText,
  };
}

