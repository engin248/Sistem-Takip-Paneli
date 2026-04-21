"use client";

import { useState, useEffect } from 'react';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

// SCR-15 SİSTEM KURALLARI PANELİ — gerçek agentRules Şemasına uygun
// Alan: no | kategori | ihlal | kaynak | kural | aciklama

interface Kural {
  no       : string;
  kategori : string;
  ihlal    : 'IPTAL' | 'UYARI' | 'DUR';
  kaynak   : string;
  kural    : string;
  aciklama : string;
}

interface RulesData {
  success      : boolean;
  toplam_kural : number;
  evrensel     : { adet: number; kurallar: Kural[] };
  katman_kurali: { adet: number; kurallar: Kural[] };
  calisma      : { adet: number; kurallar: Kural[] };
}

const IHLAL_CFG = {
  IPTAL  : { color: 'text-red-400',   border: 'border-red-500/30',   bg: 'bg-red-500/10'   },
  DUR    : { color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  UYARI  : { color: 'text-blue-400',  border: 'border-blue-500/30',  bg: 'bg-blue-500/10'  },
};

const KAT_RENK: Record<string, string> = {
  EVRENSEL : 'text-cyan-400',
  YONETIM  : 'text-amber-400',
  HATA     : 'text-red-400',
  KOD      : 'text-green-400',
  GIT      : 'text-purple-400',
};

export default function SİSTEM_KURALLARIPaneli() {
  const [data,        setData]        = useState<RulesData | null>(null);
  const [aktifKat,    setAktifKat]    = useState('TUMU');
  const [aramaMetni,  setAramaMetni]  = useState('');
  const [loading,     setLoading]     = useState(true);

  const [error,      setError]      = useState<string | null>(null);

  const fetchRules = () => {
    fetchWithTimeout('/api/rules', undefined, 10_000)
      .then(r => r.json() as Promise<RulesData>)
      .then(d => { setData(d); setLoading(false); setError(null); })
      .catch((err) => {
        setError(err instanceof DOMException && err.name === 'AbortError'
          ? 'Bağlantı zaman aşımı (10s)'
          : 'Kurallar yüklenemedi');
        setLoading(false);
      });
  };

  useEffect(() => { fetchRules(); }, []);

  if (loading) return (
    <div className="flex items-center gap-2 py-8 justify-center">
      <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
      <span className="text-[9px] font-mono text-purple-400 tracking-[0.2em]">SİSTEM KURALLARI YÜKLENİYOR...</span>
    </div>
  );
  if (error) return (
    <div className="flex items-center gap-2 py-6 justify-center">
      <div className="w-2 h-2 rounded-full bg-red-400" />
      <span className="text-[10px] font-mono text-red-400">{error}</span>
      <button onClick={fetchRules} className="text-[9px] font-bold text-cyan-400 underline ml-2 hover:text-cyan-300">TEKRAR DENE</button>
    </div>
  );
  if (!data) return <div className="text-red-400 text-xs font-mono py-4">âŒ Kurallar yüklenemedi</div>;

  // Defensive: API'den gelen alt objeler null/undefined olabilir
  const evrensel      = data.evrensel      ?? { adet: 0, kurallar: [] };
  const katman_kurali = data.katman_kurali  ?? { adet: 0, kurallar: [] };
  const calisma       = data.calisma        ?? { adet: 0, kurallar: [] };

  const tumKurallar: Kural[] = [
    ...(evrensel.kurallar      ?? []),
    ...(katman_kurali.kurallar ?? []),
    ...(calisma.kurallar       ?? []),
  ];

  // Benzersiz kategoriler
  const kategoriler = ['TUMU', ...new Set(tumKurallar.map(k => k.kategori))];

  const filtreliKurallar = tumKurallar.filter(k => {
    const katEsles  = aktifKat === 'TUMU' || k.kategori === aktifKat;
    const aramaEsles = !aramaMetni ||
      k.kural.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      k.aciklama.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      k.no.toLowerCase().includes(aramaMetni.toLowerCase());
    return katEsles && aramaEsles;
  });

  // Kategoriye göre grupla
  const gruplar = [...new Set(filtreliKurallar.map(k => k.kategori))];

  return (
    <div className="space-y-4">

      {/* ── Başlık + İstatistik ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📜</span>
          <div>
            <div className="text-[10px] font-black tracking-[0.2em] uppercase text-purple-400">SİSTEM KURALLARI</div>
            <div className="text-[8px] font-mono text-slate-500">Sistem Geneli Bağlayıcı Kural Motoru</div>
          </div>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          {[
            { l: 'TOPLAM',   v: data.toplam_kural ?? 0,  c: 'text-cyan-400'   },
            { l: 'EVRENSEL', v: evrensel.adet,           c: 'text-red-400'    },
            { l: 'KATMAN',   v: katman_kurali.adet,      c: 'text-amber-400'  },
            { l: 'ÇALIŞMA',  v: calisma.adet,            c: 'text-blue-400'   },
          ].map(s => (
            <div key={s.l} className="rounded-lg border border-slate-700/30 bg-slate-900/50 px-3 py-1.5 text-center min-w-[52px]">
              <div className={`text-base font-black font-mono ${s.c}`}>{s.v}</div>
              <div className="text-[8px] text-slate-500 tracking-wider">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Arama ────────────────────────────────────────────── */}
      <input
        type="text"
        placeholder="No, kural veya açıklama ara..."
        value={aramaMetni}
        onChange={e => setAramaMetni(e.target.value)}
        className="w-full bg-slate-900/50 border border-slate-700/30 rounded-lg px-3 py-2 text-[10px] font-mono text-slate-300 placeholder-slate-600 outline-none focus:border-purple-500/50"
      />

      {/* ── Kategori Filtreleri ──────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {kategoriler.map(k => (
          <button
            key={k}
            onClick={() => setAktifKat(k)}
            className={`text-[8px] font-black tracking-[0.1em] px-2.5 py-1 rounded-lg border transition-all ${
              aktifKat === k
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                : 'bg-slate-900/30 border-slate-700/20 text-slate-500 hover:border-slate-600/40'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {/* ── Kural Listesi ────────────────────────────────────── */}
      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {filtreliKurallar.length === 0 && (
          <div className="text-slate-600 text-xs font-mono italic text-center py-8">Eşleşen kural bulunamadı.</div>
        )}

        {gruplar.map(grup => {
          const grubbunKurallari = filtreliKurallar.filter(k => k.kategori === grup);
          const katRenk = KAT_RENK[grup] ?? 'text-slate-400';
          return (
            <div key={grup}>
              {/* Grup başlığı */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-px bg-slate-800/60" />
                <span className={`text-[8px] font-black tracking-[0.25em] uppercase ${katRenk}`}>{grup}</span>
                <span className="text-[7px] text-slate-600 font-mono">({grubbunKurallari.length})</span>
                <div className="flex-1 h-px bg-slate-800/60" />
              </div>
              <div className="space-y-1.5">
                {grubbunKurallari.map(k => {
                  const cfg = IHLAL_CFG[k.ihlal] ?? IHLAL_CFG.UYARI;
                  return (
                    <div key={k.no} className={`rounded-lg border ${cfg.border} ${cfg.bg} px-3 py-2.5 flex items-start gap-3`}>
                      {/* No */}
                      <div className={`text-[9px] font-black font-mono ${cfg.color} flex-shrink-0 mt-0.5 min-w-[40px]`}>
                        {k.no}
                      </div>
                      {/* İçerik */}
                      <div className="flex-1 min-w-0">
                        <div className={`text-[10px] font-bold ${cfg.color} leading-tight`}>{k.kural}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5 leading-relaxed">{k.aciklama}</div>
                        {k.kaynak && (
                          <div className="text-[7px] text-slate-600 font-mono mt-1">↳ {k.kaynak}</div>
                        )}
                      </div>
                      {/* İhlal sonucu */}
                      <div className={`flex-shrink-0 text-[7px] font-black tracking-[0.1em] px-2 py-0.5 rounded border ${cfg.border} ${cfg.color} ${cfg.bg}`}>
                        {k.ihlal}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

