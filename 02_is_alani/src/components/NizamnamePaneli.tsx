'use client';

// ============================================================
// NizamnamePaneli — SCR-15
// SISTEM_KURALLARI.md kaynaklı 54 kural, canlı gösterim
// ============================================================

import { useEffect, useState } from 'react';

interface Kural {
  no        : string;
  kategori  : string;
  kural     : string;
  aciklama  : string;
  ihlal     : 'IPTAL' | 'UYARI' | 'DUR';
  kaynak   ?: string;
}

interface RulesApiResponse {
  success      : boolean;
  toplam_kural : number;
  evrensel     : { adet: number; kurallar: Kural[] };
  katman_kurali: { adet: number; kurallar: Kural[] };
  calisma      : { adet: number; kurallar: Kural[] };
}

const IHLAL_RENK: Record<string, string> = {
  IPTAL: 'text-red-400 bg-red-500/10 border-red-500/30',
  DUR  : 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  UYARI: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
};
const IHLAL_ICON: Record<string, string> = {
  IPTAL: '🚫',
  DUR  : '⏸',
  UYARI: '⚠',
};

export default function NizamnamePaneli() {
  const [data, setData]     = useState<RulesApiResponse | null>(null);
  const [aktifKat, setAktif] = useState<string>('evrensel');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/rules')
      .then(r => r.json())
      .then((d: RulesApiResponse) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center gap-2 text-purple-400 text-[9px] font-mono">
      <span className="animate-pulse">◈</span> YÜKLÜYOR...
    </div>
  );

  if (!data) return (
    <div className="text-red-400 text-[9px] font-mono">⚠ Kural verisi alınamadı</div>
  );

  const katmanlar: Record<string, { label: string; kurallar: Kural[] }> = {
    evrensel: { label: 'TEMEL',   kurallar: data.evrensel?.kurallar ?? [] },
    katman  : { label: 'KATMAN',  kurallar: data.katman_kurali?.kurallar ?? [] },
    calisma : { label: 'ÇALIŞMA', kurallar: data.calisma?.kurallar ?? [] },
  };

  const aktifKurallar = katmanlar[aktifKat]?.kurallar ?? [];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[8px] font-mono text-purple-400 tracking-widest">KAYNAK: SISTEM_KURALLARI.md</div>
          <div className="text-[10px] font-black text-slate-300 tracking-wider">
            {data.toplam_kural} KURAL AKTİF
          </div>
        </div>
        <div className="flex gap-1">
          {[
            { key: 'IPTAL', label: '🚫' },
            { key: 'DUR',   label: '⏸' },
            { key: 'UYARI', label: '⚠' },
          ].map(b => (
            <span key={b.key} className={`text-[8px] px-2 py-0.5 rounded border ${IHLAL_RENK[b.key]} font-mono`}>
              {b.label} {b.key}
            </span>
          ))}
        </div>
      </div>

      {/* Kategori tabs */}
      <div className="flex gap-1 flex-wrap">
        {Object.entries(katmanlar).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setAktif(key)}
            className={`text-[8px] font-black px-3 py-1.5 rounded-lg border tracking-widest transition-all ${
              aktifKat === key
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                : 'bg-slate-800/50 text-slate-500 border-slate-700/30 hover:text-slate-300'
            }`}
          >
            {val.label} ({val.kurallar.length})
          </button>
        ))}
      </div>

      {/* Kural listesi */}
      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
        {aktifKurallar.map(k => (
          <div
            key={k.no}
            className="bg-slate-900/60 border border-slate-700/30 rounded-lg p-2.5 hover:border-purple-500/30 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-mono text-slate-600 shrink-0">{k.no}</span>
                <span className="text-[9px] font-black text-slate-200 tracking-wider">{k.kural}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {k.kaynak && (
                  <span className="text-[7px] font-mono text-slate-600">{k.kaynak}</span>
                )}
                <span className={`text-[7px] px-1.5 py-0.5 rounded border font-black ${IHLAL_RENK[k.ihlal]}`}>
                  {IHLAL_ICON[k.ihlal]} {k.ihlal}
                </span>
              </div>
            </div>
            <p className="text-[8px] text-slate-500 mt-1 leading-relaxed pl-8">{k.aciklama}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-700/30 pt-2 flex justify-between text-[7px] font-mono text-slate-600">
        <span>110 Madde Anayasası — Kurucu: Engin</span>
        <span>v3.0 | {new Date().toLocaleDateString('tr-TR')}</span>
      </div>
    </div>
  );
}
