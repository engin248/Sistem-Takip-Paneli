// src/tests/testAlarmIntegration.ts
// ============================================================
// ALARM ENTEGRASYON TESTİ — SCR-16
// ============================================================
// Bu test, taskQueue.ts içindeki alarm tetikleme mantığını
// simüle ederek doğrular.
// ============================================================

import { pushJobHistory, QueueJob, generateJobId } from '../core/taskQueue';
import { getAcikAlarmlar, resetAlarmCache } from '../services/alarmService';

async function runTest() {
  console.log('🚀 Alarm Entegrasyon Testi Başlıyor...');
  
  // 1. Temizle
  resetAlarmCache();
  
  // 2. Hatalı bir iş gönder
  const errorJob: QueueJob = {
    job_id: generateJobId('A-01'),
    agent_id: 'A-01',
    agent_kod_adi: 'İCRACI-FE',
    agent_katman: 'L1',
    task: 'Test hatasız olmalı',
    priority: 5, // Kritik
    status: 'hata',
    error: 'Test Hatası: Manuel tetiklendi',
    created_at: new Date().toISOString(),
  };

  console.log('📥 Hatalı iş gönderiliyor...');
  pushJobHistory(errorJob);

  // 3. Alarmları kontrol et
  setTimeout(async () => {
    const alarmlar = getAcikAlarmlar();
    const isErrorAlarm = alarmlar.find(a => a.modul === 'JOB_MONITOR' && a.baslik.includes('İŞ HATASI'));

    if (isErrorAlarm) {
      console.log('✅ TEST BAŞARILI: Hata alarmı tetiklendi.');
      console.log(`📍 Alarm Seviyesi: ${isErrorAlarm.seviye} (Beklenen: EMERGENCY/CRITICAL)`);
    } else {
      console.error('❌ TEST BAŞARISIZ: Hata alarmı tetiklenmedi.');
    }

    // 4. Düşük başarı oranı testi
    console.log('📥 Dizi halinde hata gönderiliyor (Başarı oranı testi)...');
    for (let i = 0; i < 10; i++) {
        pushJobHistory({
            ...errorJob,
            job_id: generateJobId('A-01') + i,
            status: 'hata'
        });
    }

    setTimeout(() => {
        const alarmlar2 = getAcikAlarmlar();
        const isStatsAlarm = alarmlar2.find(a => a.baslik === 'KRİTİK BAŞARI DÜŞÜŞÜ');
        
        if (isStatsAlarm) {
            console.log('✅ TEST BAŞARILI: Başarı oranı alarmı tetiklendi.');
        } else {
            console.error('❌ TEST BAŞARISIZ: Başarı oranı alarmı tetiklenmedi.');
        }
        
        console.log('🏁 Test Tamamlandı.');
    }, 100);

  }, 100);
}

runTest().catch(console.error);
