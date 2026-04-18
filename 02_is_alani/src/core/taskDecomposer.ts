// src/core/taskDecomposer.ts
// ============================================================
// GÖREV AYRIŞTIRICISI — Karmaşık görevi alt-görevlere böler
// ============================================================
// Basit görev → direkt icra (tek ajan)
// Karmaşık görev → plan üret → sıralı alt-görevler → birleştir
//
// Karmaşıklık kriterleri:
//   - 3+ farklı alan birden ("analiz ET VE kod YAZ VE test YAP")
//   - Görev 200 karakter üzeri
//   - Birden fazla "ve", "sonra", "ardından" bağlacı
// ============================================================

import { agentRegistry } from '@/services/agentRegistry';
import { isNizamTask, applyNizamDiscipline, validateNizamPlan } from './nizamProtocol';

// ── TİPLER ────────────────────────────────────────────────────
export interface AltGorev {
  sira      : number;
  gorev     : string;
  ajan_id   : string;   // Önerilen ajan
  ajan_kodu : string;
  bagimlilik: number[]; // Hangi sıra tamamlanmadan başlamaz
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

// ── KARMAŞIKLIK SKORU ─────────────────────────────────────────
const KAMASIKLIK_TETIKLIGI = ['ve ', 'ardından', 'sonra ', 'ayrıca', 'ek olarak',
  'bunun yanında', 'birlikte', 'ile birlikte', 'de ', 'da '];

export function hesaplaKarmasiklik(gorev: string): number {
  const lower = gorev.toLowerCase();
  let skor = 0;

  // Uzunluk
  if (gorev.length > 200) skor += 2;
  if (gorev.length > 400) skor += 2;

  // Bağlaçlar
  for (const tetik of KAMASIKLIK_TETIKLIGI) {
    const olusum = (lower.match(new RegExp(tetik, 'g')) || []).length;
    skor += olusum;
  }

  // Farklı alan göstergeleri
  const alanlar = [
    ['analiz', 'araştır', 'incele', 'kontrol'],
    ['yaz', 'oluştur', 'üret', 'geliştir'],
    ['test', 'doğrula', 'denetle', 'sına'],
    ['gönder', 'bildir', 'raporla', 'kaydet'],
    ['ara', 'bul', 'sorgula', 'listele'],
  ];

  let aktifAlan = 0;
  for (const alan of alanlar) {
    if (alan.some(k => lower.includes(k))) aktifAlan++;
  }
  if (aktifAlan >= 2) skor += aktifAlan;

  return skor;
}

// ── GÖREV PARSER ─────────────────────────────────────────────
function goreviAyristir(gorev: string): string[] {
  // Önce noktalı virgül / ve / sonra ile böl
  const bolucular = /[;]|(?:\s+ve\s+(?=\S))|(?:\s+ardından\s+)|(?:\s+sonra\s+(?=\S))/gi;
  const parcalar = gorev.split(bolucular)
    .map(p => p.trim())
    .filter(p => p.length > 5);

  if (parcalar.length <= 1) {
    // Manuel bölme: cümle başında fiil varsa
    const cumleler = gorev.split(/[.!,]+/).map(s => s.trim()).filter(s => s.length > 10);
    return cumleler.length > 1 ? cumleler : [gorev];
  }

  return parcalar;
}

// ── EN UYGUN AJAN SEÇİCİ ─────────────────────────────────────
const ALAN_AJAN_MAP: Array<{ keywords: string[]; ajan_id: string }> = [
  { keywords: ['kod', 'yaz', 'geliştir', 'frontend', 'component', 'react', 'ui'],  ajan_id: 'A-01' },
  { keywords: ['api', 'backend', 'servis', 'route', 'endpoint'],                   ajan_id: 'A-02' },
  { keywords: ['veritabanı', 'supabase', 'sql', 'migration', 'tablo'],             ajan_id: 'A-03' },
  { keywords: ['telegram', 'bot', 'bildirim', 'mesaj'],                            ajan_id: 'A-04' },
  { keywords: ['test', 'doğrula', 'sına', 'kontrol', 'hata'],                     ajan_id: 'A-05' },
  { keywords: ['güvenlik', 'rls', 'izin', 'koruma'],                              ajan_id: 'A-06' },
  { keywords: ['analiz', 'araştır', 'incele', 'rapor', 'istatistik'],             ajan_id: 'D-09' },
  { keywords: ['ara', 'bul', 'sorgula', 'web', 'internet'],                       ajan_id: 'K-3'  },
  { keywords: ['plan', 'strateji', 'öncelik', 'organize'],                        ajan_id: 'K-2'  },
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
    ajan_kodu: ajan?.kod_adi ?? 'İCRACI-FE',
  };
}

// ── ANA FONKSİYON ─────────────────────────────────────────────
export function goreviPlanla(gorev: string): GorevPlani {
  const complexity_score = hesaplaKarmasiklik(gorev);
  const karmasik = complexity_score >= 4;

  if (!karmasik) {
    const atanan = enUygunAjanBul(gorev);
    return {
      orijinal_gorev: gorev,
      karmasik: false,
      complexity_score,
      alt_gorevler: [{
        sira      : 1,
        gorev,
        ajan_id   : atanan.ajan_id,
        ajan_kodu : atanan.ajan_kodu,
        bagimlilik: [],
        durum     : 'bekliyor',
      }],
      ozet: `Tek aşama — ${atanan.ajan_kodu}`,
    };
  }

  // Karmaşık → alt-görevlere ayır
  const parcalar = goreviAyristir(gorev);
  const alt_gorevler: AltGorev[] = parcalar.map((parca, i) => {
    const atanan = enUygunAjanBul(parca);
    return {
      sira      : i + 1,
      gorev     : parca,
      ajan_id   : atanan.ajan_id,
      ajan_kodu : atanan.ajan_kodu,
      bagimlilik: i > 0 ? [i] : [], // her adım öncekine bağımlı
      durum     : 'bekliyor',
    };
  });

  const ozet = alt_gorevler
    .map(a => `${a.sira}. ${a.ajan_kodu}: ${a.gorev.slice(0, 60)}`)
    .join(' → ');

  // ── NİZAM DİSİPLİNİ UYGULAMA ──
  if (isNizamTask(gorev)) {
    const nizamSteps = applyNizamDiscipline(alt_gorevler);
    const nizamCheck = validateNizamPlan(nizamSteps.map(s => s.ajan_kodu).join(','));
    
    if (nizamCheck.valid) {
      return {
        orijinal_gorev: gorev,
        karmasik: true,
        complexity_score: complexity_score + 10, // Nizam ek yükü
        alt_gorevler: nizamSteps,
        ozet: `[NİZAM DİSİPLİNİ] ${ozet} → +8 EKİP ÜYESİ DENETİMİ`,
      };
    }
  }

  return {
    orijinal_gorev: gorev,
    karmasik: true,
    complexity_score,
    alt_gorevler,
    ozet,
  };
}
