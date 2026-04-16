"use client";

import { useState, useEffect } from 'react';

// SCR-15 NİZAMNAME PANELİ — Ajan Kural Sistemi Görüntüleyici
// /api/rules endpointinden canlı kuralları çeker

interface Kural {
  id         : string;
  bolum      : string;
  madde      : number;
  baslik     : string;
  aciklama   : string;
  seviye     : 'MUTLAK' | 'ZORUNLU' | 'ONERILIR';
  ihlal_sonucu?: string;
}

interface RulesData {
  success      : boolean;
  toplam_kural : number;
  evrensel     : { adet: number; kurallar: Kural[] };
  katman_kurali: { adet: number; kurallar: Kural[] };
  calisma      : { adet: number; kurallar: Kural[] };
  katmanlar    : string[];
}

const SEVIYE_CFG = {
  MUTLAK   : { color: 'text-red-400',    border: 'border-red-500/30',    bg: 'bg-red-500/10',    dot: 'bg-red-400'    },
  ZORUNLU  : { color: 'text-amber-400',  border: 'border-amber-500/30',  bg: 'bg-amber-500/10',  dot: 'bg-amber-400'  },
  ONERILIR : { color: 'text-blue-400',   border: 'border-blue-500/30',   bg: 'bg-blue-500/10',   dot: 'bg-blue-400'   },
};

export default function NizamnamePaneli() {
  const [data,        setData]        = useState<RulesData | null>(null);
  const [aktifKatman, setAktifKatman] = useState<string>('TUMU');
  const [aramaMetni,  setAramaMetni]  = useState('');
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    fetch('/api/rules')
      .then(r => r.json() as Promise<RulesData>)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center gap-2 py-8 justify-center">
      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
      <span className="text-[9px] font-mono text-cyan-400 tracking-[0.2em]">NİZAMNAME YÜKLENİYOR...</span>
    </div>
  );

  if (!data) return (
    <div className="text-red-400 text-xs font-mono py-4">❌ Kurallar yüklenemedi</div>
  );

  // Tüm kuralları birleştir
  const tumKurallar: Kural[] = [
    ...data.evrensel.kurallar,
    ...data.katman_kurali.kurallar,
    ...data.calisma.kurallar,
  ];

  // Filtrele
  const filtreliKurallar = tumKurallar.filter(k => {
    const katmanEsles = aktifKatman === 'TUMU' || k.bolum.includes(aktifKatman);
    const aramaEsles  = !aramaMetni ||
      k.baslik.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      k.aciklama.toLowerCase().includes(aramaMetni.toLowerCase());
    return katmanEsles && aramaEsles;
  });

  // Bölümlere grupla
  const bolumler = [...new Set(filtreliKurallar.map(k => k.bolum))];

  return (
    <div className="space-y-4">

      {/* ── Başlık + İstatistik ───────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📜</span>
          <div>
            <div className="text-[10px] font-black tracking-[0.2em] uppercase text-purple-400">NİZAMNAME</div>
            <div className="text-[8px] font-mono text-slate-500">Ajan Disiplin Kural Sistemi</div>
          </div>
        </div>
        <div className="ml-auto flex gap-2 flex-wrap">
          {[
            { l: 'TOPLAM',  v: data.toplam_kural,          c: 'text-cyan-400'   },
            { l: 'EVRENSEL',v: data.evrensel.adet,          c: 'text-red-400'    },
            { l: 'KATMAN',  v: data.katman_kurali.adet,     c: 'text-amber-400'  },
            { l: 'ÇALIŞMA', v: data.calisma.adet,           c: 'text-blue-400'   },
          ].map(s => (
            <div key={s.l} className="rounded-lg border border-slate-700/30 bg-slate-900/50 px-3 py-1.5 text-center">
              <div className={`text-lg font-black font-mono ${s.c}`}>{s.v}</div>
              <div className="text-[8px] text-slate-500 tracking-wider">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Arama + Katman Filtresi ───────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Kural ara..."
          value={aramaMetni}
          onChange={e => setAramaMetni(e.target.value)}
          className="bg-slate-900/50 border border-slate-700/30 rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-300 placeholder-slate-600 outline-none focus:border-purple-500/50 flex-1 min-w-[140px]"
        />
        {['TUMU', 'TEMEL', 'ANALİZ', 'GÜVENLİK', 'TUTANAK', 'HATA', 'GIT', 'KATMAN', 'ÇALIŞMA'].map(k => (
          <button
            key={k}
            onClick={() => setAktifKatman(k)}
            className={`text-[9px] font-black tracking-[0.1em] px-3 py-1.5 rounded-lg border transition-all ${
              aktifKatman === k
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                : 'bg-slate-900/30 border-slate-700/20 text-slate-500 hover:border-slate-600/40'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {/* ── Kural Listesi ────────────────────────────────────── */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {filtreliKurallar.length === 0 && (
          <div className="text-slate-600 text-xs font-mono italic text-center py-8">Eşleşen kural bulunamadı.</div>
        )}

        {bolumler.map(bolum => {
          const bolumKurallari = filtreliKurallar.filter(k => k.bolum === bolum);
          return (
            <div key={bolum}>
              <div className="text-[8px] font-black tracking-[0.25em] uppercase text-slate-500 mb-2 flex items-center gap-2">
                <div className="flex-1 h-px bg-slate-800" />
                {bolum}
                <div className="flex-1 h-px bg-slate-800" />
              </div>
              <div className="space-y-1.5">
                {bolumKurallari.map(k => {
                  const cfg = SEVIYE_CFG[k.seviye] ?? SEVIYE_CFG.ONERILIR;
                  return (
                    <div
                      key={k.id}
                      className={`rounded-lg border ${cfg.border} ${cfg.bg} px-3 py-2.5 flex items-start gap-3`}
                    >
                      {/* Madde No */}
                      <div className={`text-[9px] font-black font-mono ${cfg.color} flex-shrink-0 mt-0.5 min-w-[28px]`}>
                        §{k.madde}
                      </div>
                      {/* İçerik */}
                      <div className="flex-1 min-w-0">
                        <div className={`text-[10px] font-bold ${cfg.color} leading-tight`}>
                          {k.baslik}
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5 leading-relaxed">
                          {k.aciklama}
                        </div>
                        {k.ihlal_sonucu && (
                          <div className="text-[8px] text-red-500/70 mt-1">
                            ⚠ İhlal: {k.ihlal_sonucu}
                          </div>
                        )}
                      </div>
                      {/* Seviye */}
                      <div className={`flex-shrink-0 text-[7px] font-black tracking-[0.15em] px-2 py-0.5 rounded ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                        {k.seviye}
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
