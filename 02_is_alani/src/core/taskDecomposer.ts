// src/core/taskDecomposer.ts
// ============================================================
// GÃ–REV AYRIÅTIRICISI â€” KarmaÅŸÄ±k gÃ¶revi alt-gÃ¶revlere bÃ¶ler
// ============================================================
// Basit gÃ¶rev â†’ direkt icra (tek ajan)
// KarmaÅŸÄ±k gÃ¶rev â†’ plan Ã¼ret â†’ sÄ±ralÄ± alt-gÃ¶revler â†’ birleÅŸtir
//
// KarmaÅŸÄ±klÄ±k kriterleri:
//   - 3+ farklÄ± alan birden ("analiz ET VE kod YAZ VE test YAP")
//   - GÃ¶rev 200 karakter Ã¼zeri
//   - Birden fazla "ve", "sonra", "ardÄ±ndan" baÄŸlacÄ±
// ============================================================

import { agentRegistry } from '@/services/agentRegistry';
import { isSistemTask, applySistemDiscipline, validateSistemPlan } from './sistemProtocol';
import { aiComplete } from '@/lib/aiProvider';
import { enforceTopologicalDiscipline } from './algorithms/dagSorter';
import { enforceSanityAST } from './algorithms/semanticEngine';

// â”€â”€ TÄ°PLER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface AltGorev {
  sira      : number;
  gorev     : string;
  ajan_id   : string;   // Ã–nerilen ajan
  ajan_kodu : string;
  bagimlilik: number[]; // Hangi sÄ±ra tamamlanmadan baÅŸlamaz
  durum     : 'bekliyor' | 'isleniyor' | 'tamamlandi' | 'hata';
  sonuc    ?: string;
}

export interface GorevPlani {
  orijinal_gorev : string;
  karmasik       : boolean;
  complexity_score: number;
  alt_gorevler   : AltGorev[];
  ozet           : string;
}

// â”€â”€ KARMAÅžIKLIK SKORU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const KAMASIKLIK_TETIKLIGI = ['ve ', 'ardÄ±ndan', 'sonra ', 'ayrÄ±ca', 'ek olarak',
  'bunun yanÄ±nda', 'birlikte', 'ile birlikte', 'de ', 'da '];

export function hesaplaKarmasiklik(gorev: string): number {
  const lower = gorev.toLowerCase();
  let skor = 0;

  // Uzunluk
  if (gorev.length > 200) skor += 2;
  if (gorev.length > 400) skor += 2;

  // BaÄŸlaÃ§lar
  for (const tetik of KAMASIKLIK_TETIKLIGI) {
    const olusum = (lower.match(new RegExp(tetik, 'g')) || []).length;
    skor += olusum;
  }

  // FarklÄ± alan gÃ¶stergeleri
  const alanlar = [
    ['analiz', 'araÅŸtÄ±r', 'incele', 'kontrol'],
    ['yaz', 'oluÅŸtur', 'Ã¼ret', 'geliÅŸtir'],
    ['test', 'doÄŸrula', 'denetle', 'sÄ±na'],
    ['gÃ¶nder', 'bildir', 'raporla', 'kaydet'],
    ['ara', 'bul', 'sorgula', 'listele'],
  ];

  let aktifAlan = 0;
  for (const alan of alanlar) {
    if (alan.some(k => lower.includes(k))) aktifAlan++;
  }
  if (aktifAlan >= 2) skor += aktifAlan;

  return skor;
}

// â”€â”€ GÃ–REV PARSER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function goreviAyristir(gorev: string): string[] {
  // Ã–nce noktalÄ± virgÃ¼l / ve / sonra ile bÃ¶l
  const bolucular = /[;]|(?:\s+ve\s+(?=\S))|(?:\s+ardÄ±ndan\s+)|(?:\s+sonra\s+(?=\S))/gi;
  const parcalar = gorev.split(bolucular)
    .map(p => p.trim())
    .filter(p => p.length > 5);

  if (parcalar.length <= 1) {
    // Manuel bÃ¶lme: cÃ¼mle baÅŸÄ±nda fiil varsa
    const cumleler = gorev.split(/[.!,]+/).map(s => s.trim()).filter(s => s.length > 10);
    return cumleler.length > 1 ? cumleler : [gorev];
  }

  return parcalar;
}

// â”€â”€ EN UYGUN AJAN SEÃ‡Ä°CÄ° â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ALAN_AJAN_MAP: Array<{ keywords: string[]; ajan_id: string }> = [
  { keywords: ['kod', 'yaz', 'geliÅŸtir', 'frontend', 'component', 'react', 'ui'],  ajan_id: 'A-01' },
  { keywords: ['api', 'backend', 'servis', 'route', 'endpoint'],                   ajan_id: 'A-02' },
  { keywords: ['veritabanÄ±', 'supabase', 'sql', 'migration', 'tablo'],             ajan_id: 'A-03' },
  { keywords: ['telegram', 'bot', 'bildirim', 'mesaj'],                            ajan_id: 'A-04' },
  { keywords: ['test', 'doÄŸrula', 'sÄ±na', 'kontrol', 'hata'],                     ajan_id: 'A-05' },
  { keywords: ['gÃ¼venlik', 'rls', 'izin', 'koruma'],                              ajan_id: 'A-06' },
  { keywords: ['analiz', 'araÅŸtÄ±r', 'incele', 'rapor', 'istatistik'],             ajan_id: 'D-09' },
  { keywords: ['ara', 'bul', 'sorgula', 'web', 'internet'],                       ajan_id: 'K-3'  },
  { keywords: ['plan', 'strateji', 'Ã¶ncelik', 'organize'],                        ajan_id: 'K-2'  },
];

function enUygunAjanBul(altGorev: string): { ajan_id: string; ajan_kodu: string } {
  const lower = altGorev.toLowerCase();
  let enIyi = { ajan_id: 'A-01', skor: 0 };

  for (const kural of ALAN_AJAN_MAP) {
    const skor = kural.keywords.filter(k => lower.includes(k)).length;
    if (skor > enIyi.skor) enIyi = { ajan_id: kural.ajan_id, skor };
  }

  const ajan = agentRegistry.getById(enIyi.ajan_id);
  return {
    ajan_id  : enIyi.ajan_id,
    ajan_kodu: ajan?.kod_adi ?? 'Ä°CRACI-FE',
  };
}

// â”€â”€ ANA FONKSÄ°YON â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function goreviPlanla(gorev: string): Promise<GorevPlani> {
  // 0️⃣ ZIRH 1: AST (CÜMLE) KONTROL ALGORİTMASI 
  const astCheck = enforceSanityAST(gorev);
  if (!astCheck.isClean) {
       // Cümlede "sil", "drop" vs. varsa veya görev anlamsızsa (Deterministik Yakalama)
       throw new Error(`[SİSTEM ALGORİTMASI YASAKLADI]: ${astCheck.reason}`);
  }

  const complexity_score = hesaplaKarmasiklik(gorev);
  const karmasik = complexity_score >= 4;

  const localPlanla = (): GorevPlani => {
    // Tüm Yapay Zeka Hiyerarşisi Çökerse Devreye Giren Regex/Algoritma (Son Kalekol)
    let sonucPlan: GorevPlani;
    if (!karmasik) {
      const atanan = enUygunAjanBul(gorev);
      sonucPlan = {
        orijinal_gorev: gorev,
        karmasik: false,
        complexity_score,
        alt_gorevler: [{ sira: 1, gorev, ajan_id: atanan.ajan_id, ajan_kodu: atanan.ajan_kodu, bagimlilik: [], durum: 'bekliyor' }],
        ozet: `Tek aşama — ${atanan.ajan_kodu}`,
      };
    } else {
      const parcalar = goreviAyristir(gorev);
      let alt_gorevler: AltGorev[] = parcalar.map((parca, i) => {
        const atanan = enUygunAjanBul(parca);
        return { sira: i + 1, gorev: parca, ajan_id: atanan.ajan_id, ajan_kodu: atanan.ajan_kodu, bagimlilik: i > 0 ? [i] : [], durum: 'bekliyor' };
      });
      
      // ZIRH 2: DAG Sorter (Topolojik Sıralama Algoritması)
      alt_gorevler = enforceTopologicalDiscipline(alt_gorevler) as AltGorev[];
      const ozet = alt_gorevler.map(a => `${a.sira}. ${a.ajan_kodu}: ${a.gorev.slice(0, 60)}`).join(' → ');
      sonucPlan = { orijinal_gorev: gorev, karmasik: true, complexity_score, alt_gorevler, ozet };
    }

    if (isSistemTask(gorev)) {
      const systemSteps = applySistemDiscipline(sonucPlan.alt_gorevler);
      sonucPlan.alt_gorevler = systemSteps;
      validateSistemPlan(systemSteps.map((s: any) => s.ajan_kodu).join(','));
      sonucPlan.ozet = `[NİZAM DİSİPLİNİ] OTONOM EK DENETİM → +8 EKİP ÜYESİ`;
    }
    return sonucPlan;
  };

  const sysPrompt = `Sen 'Sistem Takip Paneli' Planlama Departmanı Müdürü (MasterMind/Kurmay). Gelen görevi analiz edip mantıklı iş adımlarına böl ve EN UYGUN UZMANLARA ATA.
JSON FORMATINDA YANIT VER: 
{ "orijinal_gorev": "...", "karmasik": true/false, "complexity_score": 1-10, "ozet": "kısa özet", "alt_gorevler": [{"sira": 1, "gorev": "iş tanımı", "ajan_id": "A-01", "ajan_kodu": "İCRACI-FE", "bagimlilik": [], "durum": "bekliyor"}] }

AJAN HAVUZU (Sadece bunları kullanabilirsin):
A-01 (İCRACI-FE): Kod, Frontend, Component, UI, React
A-02 (İCRACI-BE): Backend, API, Route, Endpoint
A-03 (İCRACI-DB): Veritabanı, Supabase, Migration, SQL
A-04 (BİLDİRİMCİ): Telegram, Uyarı
A-05 (TESTER): Test, Hata, Doğrulama
A-06 (SECURITY): Güvenlik, RLS, İzin
D-09 (ANALİST): Analiz, İstatistik, Raporlama
K-2 (KURMAY): Planlama, Strateji
K-3 (KAŞİF): Web Arama, Araştırma

MUTLAKA TEMİZ VE SADECE JSON ÇIKART. Başka metin yazma!`;

  try {
    const aiResponse = await aiComplete({
        systemPrompt: sysPrompt,
        userMessage: gorev,
        jsonMode: true,
        temperature: 0.1
    });

    if (aiResponse && aiResponse.content) {
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         const parsedPlan = JSON.parse(jsonMatch[0]) as GorevPlani;
         if (parsedPlan && Array.isArray(parsedPlan.alt_gorevler)) {
             // ZIRH 2: AI YANILIYOR OLABİLİR! DAG Sorter'dan Geçir (Topolojik Algoritma Teyidi)
             parsedPlan.alt_gorevler = enforceTopologicalDiscipline(parsedPlan.alt_gorevler) as AltGorev[];

             if (isSistemTask(gorev)) {
                const systemSteps = applySistemDiscipline(parsedPlan.alt_gorevler);
                parsedPlan.alt_gorevler = systemSteps;
                validateSistemPlan(systemSteps.map((s: any) => s.ajan_kodu).join(','));
                parsedPlan.ozet = `[NİZAM DİSİPLİNİ ONAYLI] OTONOM DAG SIRALAMASI: ` + parsedPlan.alt_gorevler.length + ` AŞAMA.`;
             } else {
                parsedPlan.ozet = `[ALGORİTMA DAG ONAYLI] OTONOM SIRALAMA: ` + parsedPlan.alt_gorevler.map(a => a.ajan_kodu).join(' → ');
             }
             return parsedPlan;
         }
      }
    }
  } catch (err) {
     console.warn('[PLANLAMA] Yapay Zeka Ağı çöktü. Algoritmik Fallback (Lokal Regex) Devreye giriyor!', err);
  }

  // 2️⃣ OTONOM MOTOR ÇÖKER VEYA JSON BOZARSA => LOKAL REGEX DEVREYE GİRER (FALLBACK)
  return localPlanla();
}

