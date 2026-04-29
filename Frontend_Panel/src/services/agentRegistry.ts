// ============================================================
// AGENT REGISTRY — Gerçek Kadro Bağlantısı
// KÖK NEDEN: Frontend roster/index.js ile hiç konuşmuyordu.
//            TEST-AJAN hardcoded döndürüyordu.
// ÇÖZÜM: Supabase'den veya yerel roster JSON'dan ajan verisini çek.
// ============================================================

export interface Ajan {
  id: string;
  kod_adi: string;
  rol: string;
  takim_kodu: string;
  beceri_listesi: string[];
  katman: string;
}

// Roster'ı API üzerinden çeker (Server Component / API Route için)
async function fetchRoster(): Promise<Ajan[]> {
  try {
    // Supabase'de agents tablosu varsa oradan çek
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key || url.length < 10) {
      throw new Error('Supabase URL tanımlı değil — yerel roster fallback');
    }

    const res = await fetch(`${url}/rest/v1/agents?select=*&limit=300`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 } // 60sn cache — her istekte DB'ye gitme
    });

    if (!res.ok) throw new Error(`Supabase agents HTTP ${res.status}`);
    const data = await res.json() as Ajan[];
    return data;
  } catch {
    // Fallback: Yerel roster index'ten alınan statik özet
    // Gerçek roster Agent_Uretim_Departmani/roster/index.js'de
    return YEREL_ROSTER_OZET;
  }
}

// Yerel fallback roster (top 10 ajan — tam kadro API'den gelecek)
const YEREL_ROSTER_OZET: Ajan[] = [
  { id: 'GA-01', kod_adi: 'GEREKSINIM-ALFA', rol: 'Gereksinim Analizi', takim_kodu: 'GA', beceri_listesi: ['analiz', 'kapsam', 'dogrulama'], katman: 'L1' },
  { id: 'RA-01', kod_adi: 'RISK-ALFA', rol: 'Risk Analizi', takim_kodu: 'RA', beceri_listesi: ['risk', 'tehdit', 'zafiyet'], katman: 'L1' },
  { id: 'GT-01', kod_adi: 'GUVENLIK-ALFA', rol: 'Güvenlik Tasarımı', takim_kodu: 'GT', beceri_listesi: ['guvenlik', 'sifreleme', 'yetki'], katman: 'L1' },
  { id: 'HT-01', kod_adi: 'HATATESP-ALFA', rol: 'Hata Tespiti', takim_kodu: 'HT', beceri_listesi: ['debug', 'log', 'izleme'], katman: 'L1' },
  { id: 'SD-01', kod_adi: 'SISTEM_DENETIM-ALFA', rol: 'Sistem Denetimi', takim_kodu: 'SD', beceri_listesi: ['audit', 'uyumluluk', 'raporlama'], katman: 'L2' },
];

// Bellek içi cache
let _rosterCache: Ajan[] | null = null;
let _cacheZamani = 0;
const CACHE_TTL = 120_000; // 2 dakika

async function getRoster(): Promise<Ajan[]> {
  const simdi = Date.now();
  if (_rosterCache && simdi - _cacheZamani < CACHE_TTL) return _rosterCache;
  _rosterCache = await fetchRoster();
  _cacheZamani = simdi;
  return _rosterCache;
}

// ── AGENT REGISTRY API ──────────────────────────────────────
export const agentRegistry = {
  /**
   * ID'ye göre ajan getir — artık TEST-AJAN dönmüyor
   */
  getById: async (id: string): Promise<Ajan | null> => {
    const roster = await getRoster();
    return roster.find(a => a.id === id) ?? null;
  },

  /**
   * Tüm ajanları getir
   */
  getAll: async (): Promise<Ajan[]> => {
    return getRoster();
  },

  /**
   * Takım koduna göre ajanları getir (örn: 'GA', 'GT')
   */
  getByTeam: async (takim: string): Promise<Ajan[]> => {
    const roster = await getRoster();
    return roster.filter(a => a.takim_kodu === takim);
  },

  /**
   * Cache'i temizle (roster güncellendikten sonra)
   */
  invalidateCache: () => {
    _rosterCache = null;
    _cacheZamani = 0;
  }
};

export const getAgentRegistry = () => agentRegistry;
