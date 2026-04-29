// src/core/orchestrator.ts
// ============================================================
// ORCHESTRATOR — GÖREV DAĞITIM MERKEZİ
// ============================================================
// Görevi analiz eder → doğru ajana yönlendirir → sonuç döndürür
//
// Kural:
//   Frontend görevi    → A-01 (İCRACI-FE)
//   Backend/API        → A-02 (İCRACI-BE)
//   Veritabanı         → A-03 (İCRACI-DB)
//   Bot/Bildirim       → A-04 (İCRACI-BOT)
//   Test               → A-05 (İCRACI-TEST)
//   Güvenlik           → A-06 (İCRACI-SEC)
//   AI/ML              → A-07 (İCRACI-AI)
//   Veri/Analiz        → A-08 (İCRACI-DATA)
//   Altyapı/Deploy     → A-09 (İCRACI-INFRA)
//   Pipeline/Otomasyon → A-10 (İCRACI-AKIŞ)
//   Denetim            → B-0x (DENETÇİ)
//   Karar/Strateji     → K-1 / K-2
//   Araştırma          → K-3 / D-03
//   Güvenlik denetimi  → K-4 / B-03
// ============================================================

import { runAgentWorker, type WorkerResult } from '@/core/agentWorker';

// ── YÖNLENDIRME KURALLARI ─────────────────────────────────────
interface YonlendirmeKurali {
  anahtar    : string[];
  birincil   : string;   // Ajan ID
  yedek     ?: string;   // Yedek ajan ID
  aciklama   : string;
}

const YONLENDIRME_KURALLARI: YonlendirmeKurali[] = [
  // KOMUTA
  {
    anahtar  : ['karar', 'onayla', 'reddet', 'strateji', 'komut', 'acil', 'kriz'],
    birincil : 'K-1', yedek: 'K-2',
    aciklama : 'Strateji/Karar → KOMUTAN',
  },
  {
    anahtar  : ['plan', 'sprint', 'öncelik', 'yol haritası', 'kaynak', 'dağıt'],
    birincil : 'K-2', yedek: 'K-1',
    aciklama : 'Planlama → KURMAY',
  },
  {
    anahtar  : ['araştır', 'trend', 'analiz', 'pazar', 'rakip', 'istihbarat', 'keşfet'],
    birincil : 'K-3', yedek: 'D-03',
    aciklama : 'Araştırma/İstihbarat → İSTİHBARAT',
  },
  {
    anahtar  : ['güvenlik', 'izole', 'yetki', 'rls', 'şifre', 'saldırı', 'koru', 'zero-trust'],
    birincil : 'K-4', yedek: 'A-06',
    aciklama : 'Güvenlik → MUHAFIZ',
  },

  // L1 İCRAATÇILAR
  {
    anahtar  : ['frontend', 'react', 'bileşen', 'arayüz', 'ui', 'css', 'panel', 'ekran', 'buton', 'renk', 'tasarım'],
    birincil : 'A-01', yedek: undefined,
    aciklama : 'Frontend/UI → İCRACI-FE',
  },
  {
    anahtar  : ['backend', 'api', 'endpoint', 'route', 'servis', 'http', 'rest', 'server', 'middleware'],
    birincil : 'A-02', yedek: undefined,
    aciklama : 'Backend/API → İCRACI-BE',
  },
  {
    anahtar  : ['veritabanı', 'supabase', 'sql', 'tablo', 'migration', 'schema', 'query', 'sorgu', 'kayıt'],
    birincil : 'A-03', yedek: undefined,
    aciklama : 'Veritabanı → İCRACI-DB',
  },
  {
    anahtar  : ['telegram', 'bot', 'bildirim', 'webhook', 'mesaj', 'kanal', 'whatsapp', 'bildir'],
    birincil : 'A-04', yedek: 'D-08',
    aciklama : 'Bot/Bildirim → İCRACI-BOT',
  },
  {
    anahtar  : ['test', 'vitest', 'playwright', 'unit', 'e2e', 'coverage', 'mock', 'hata testi'],
    birincil : 'A-05', yedek: undefined,
    aciklama : 'Test → İCRACI-TEST',
  },
  {
    anahtar  : ['penetrasyon', 'owasp', 'token', 'jwt', 'kriptografi', 'hash', 'xss', 'sqli', 'zaafiyet'],
    birincil : 'A-06', yedek: 'K-4',
    aciklama : 'Güvenlik Geliştirme → İCRACI-SEC',
  },
  {
    anahtar  : ['ollama', 'llm', 'prompt', 'embedding', 'rag', 'yapay zeka', 'ai', 'model', 'nlp'],
    birincil : 'A-07', yedek: undefined,
    aciklama : 'AI/ML → İCRACI-AI',
  },
  {
    anahtar  : ['veri analiz', 'etl', 'grafik', 'istatistik', 'rapor', 'aggregat', 'dashboard veri', 'metrik'],
    birincil : 'A-08', yedek: 'D-09',
    aciklama : 'Veri/Analiz → İCRACI-DATA',
  },
  {
    anahtar  : ['deploy', 'vercel', 'docker', 'ci/cd', 'environment', '.env', 'altyapı', 'github actions'],
    birincil : 'A-09', yedek: 'D-02',
    aciklama : 'Altyapı/Deploy → İCRACI-INFRA',
  },
  {
    anahtar  : ['otomasyon', 'pipeline', 'cron', 'event', 'tetikleyici', 'akış', 'workflow'],
    birincil : 'A-10', yedek: undefined,
    aciklama : 'Otomasyon/Pipeline → İCRACI-AKIŞ',
  },

  // L2 DENETÇİLER
  {
    anahtar  : ['denetle', 'kod incele', 'review', 'standart', 'lint', 'tip hatası'],
    birincil : 'B-01', yedek: undefined,
    aciklama : 'Kod Denetimi → DENETÇİ-KOD',
  },
  {
    anahtar  : ['doğrula', '5 eksen', 'kalite kontrol', 'uygunluk', 'validasyon'],
    birincil : 'B-02', yedek: undefined,
    aciklama : 'Doğrulama → DENETÇİ-DOĞRULA',
  },
  {
    anahtar  : ['performans ölç', 'latency', 'yavaş', 'bellek sızıntı', 'benchmark'],
    birincil : 'B-04', yedek: undefined,
    aciklama : 'Performans → DENETÇİ-PERF',
  },

  // DESTEK
  {
    anahtar  : ['log', 'sha', 'mühür', 'arşivle', 'kayıt tut', 'audit'],
    birincil : 'D-01', yedek: undefined,
    aciklama : 'Audit/Log → MÜHÜRDAR',
  },
  {
    anahtar  : ['dokümantasyon', 'readme', 'wiki', 'açıklama yaz', 'changelog'],
    birincil : 'D-06', yedek: undefined,
    aciklama : 'Dokümantasyon → DÖKÜMANTER',
  },
  {
    anahtar  : ['izle', 'monitor', 'alarm', 'uyarı', 'eşik', 'anomali'],
    birincil : 'D-05', yedek: undefined,
    aciklama : 'Monitoring → NÖBETÇİ',
  },
];

// ── AJAN TESPİT FONKSİYONU ────────────────────────────────────
function gorevdenAjanBul(gorev: string): { ajanId: string; aciklama: string; skor: number } {
  const gorevLower = gorev.toLowerCase();

  let enIyi = { ajanId: 'K-1', aciklama: 'Varsayılan → KOMUTAN (skor eşiği altında)', skor: 0, specificity: Infinity };

  for (const kural of YONLENDIRME_KURALLARI) {
    let skor = 0;
    for (const anahtar of kural.anahtar) {
      if (gorevLower.includes(anahtar.toLowerCase())) skor++;
    }
    // Tie-breaking: Eşit skorda daha spesifik kural kazanır
    // (daha az anahtar kelimesi = daha spesifik = daha güvenilir eşleşme)
    const specificity = kural.anahtar.length;
    if (skor > enIyi.skor || (skor === enIyi.skor && skor > 0 && specificity < enIyi.specificity)) {
      enIyi = { ajanId: kural.birincil, aciklama: kural.aciklama, skor, specificity };
    }
  }

  return enIyi;
}

// ── ORK ESTR ATÖR TİPLERİ ─────────────────────────────────────
export interface OrkestrasResult {
  gorev           : string;
  atanan_ajan_id  : string;
  atama_gerekce   : string;
  atama_skoru     : number;
  worker_result   : WorkerResult;
}

// ── ANA ORKESTRATöR FONKSİYONU ───────────────────────────────
export async function orkestrat(gorev: string, zorunlu_ajan_id?: string): Promise<OrkestrasResult> {
  let ajanId   : string;
  let aciklama : string;
  let skor     : number;

  if (zorunlu_ajan_id) {
    ajanId   = zorunlu_ajan_id;
    aciklama = 'Manuel atama (zorunlu_ajan_id)';
    skor     = 100;
  } else {
    const tespit = gorevdenAjanBul(gorev);
    ajanId   = tespit.ajanId;
    aciklama = tespit.aciklama;
    skor     = tespit.skor;
  }

  const workerResult = await runAgentWorker({
    agent_id : ajanId,
    task     : gorev,
    use_rag  : true,
    use_web  : false,
  });

  return {
    gorev,
    atanan_ajan_id : ajanId,
    atama_gerekce  : aciklama,
    atama_skoru    : skor,
    worker_result  : workerResult,
  };
}

// ── CENTRAL DISPATCHER (İCRACI HAVUZ YÖNETİCİSİ) ────────────────
export class CentralDispatcher {
  /**
   * Merkez Planlama Departmanından (15 Modüllük Çelik Çekirdek) çıkan 
   * Mühürlü Sözleşmeyi (Task Contract) alır, adımlarını parçalar ve 
   * uygun ajanlara orkestratör üzerinden gönderir.
   */
  static async dispatchContract(contract: any): Promise<void> {
    const planId = contract.plan_id;
    const adimlar = contract.karar?.temel_adimlar || []; // A_HIZLI veya B_GUVENLI yolunun adımları

    if (!Array.isArray(adimlar) || adimlar.length === 0) {
       console.warn(`[Dispatcher] Görev (${planId}) için atılacak adım bulunamadı.`);
       return;
    }

    console.log(`[Dispatcher] Plan (${planId}) yürürlüğe girdi. Toplam ${adimlar.length} asker (ajan) sahaya iniyor...`);

    for (let i = 0; i < adimlar.length; i++) {
      const adim = adimlar[i];
      const gorevKapsami = `[MÜHÜRLÜ PLAN: ${planId} | GÖREV: ${i+1}/${adimlar.length}] Sistem Hedefi: ${adim}`;
      
      // Asker (Ajan) seçimi ve cepheye sürüm işlemi
      await orkestrat(gorevKapsami);
    }
    
    console.log(`[Dispatcher] Plan (${planId}) kapsamındaki tüm askeri birimler görevlerini tamamladı.`);
  }
}
