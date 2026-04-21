"use client";

import { useState, useEffect } from 'react';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

// ============================================================
// SİSTEM KURALLARI PANELİ v2.0
// ============================================================
// Gerçek işlevler:
//   1. Kuralları listeler (31 kural, 8 kategori)
//   2. Kategoriye göre filtreler
//   3. Arama yapar (kural adı, numara, açıklama)
// Sahte işlev: YOK. Her şey gerçek veri.
// ============================================================

interface Kural {
  no       : string;
  kategori : string;
  ihlal    : 'IPTAL' | 'UYARI' | 'DUR';
  kural    : string;
  aciklama : string;
}

interface RulesData {
  success     : boolean;
  toplam_kural: number;
  iptal       : number;
  dur         : number;
  uyari       : number;
  kategoriler : string[];
  kurallar    : Kural[];
}

const IHLAL_RENK = {
  IPTAL : { text: '#ef4444', border: 'rgba(239,68,68,0.3)', bg: 'rgba(239,68,68,0.08)' },
  DUR   : { text: '#f59e0b', border: 'rgba(245,158,11,0.3)', bg: 'rgba(245,158,11,0.08)' },
  UYARI : { text: '#3b82f6', border: 'rgba(59,130,246,0.3)', bg: 'rgba(59,130,246,0.08)' },
};

const KAT_RENK: Record<string, string> = {
  'DÜRÜSTLÜK' : '#f472b6',
  'SORUMLULUK': '#a78bfa',
  'SAYGI'     : '#34d399',
  'ADALET'    : '#fbbf24',
  'KORUMA'    : '#ef4444',
  'KALİTE'    : '#60a5fa',
  'ŞEFFAFLIK' : '#2dd4bf',
  'ÖĞRENME'   : '#fb923c',
};

export default function SİSTEM_KURALLARIPaneli() {
  const [data, setData]             = useState<RulesData | null>(null);
  const [aktifKat, setAktifKat]     = useState('TÜMÜ');
  const [aramaMetni, setAramaMetni] = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const fetchRules = () => {
    setLoading(true);
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '32px 0', justifyContent: 'center' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', animation: 'pulse 1.5s infinite' }} />
      <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#a78bfa', letterSpacing: '0.15em' }}>SİSTEM KURALLARI YÜKLENİYOR...</span>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '24px 0', justifyContent: 'center' }}>
      <span style={{ fontSize: 14, fontFamily: 'monospace', color: '#ef4444' }}>{error}</span>
      <button onClick={fetchRules} style={{ fontSize: 13, fontWeight: 700, color: '#22d3ee', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none' }}>TEKRAR DENE</button>
    </div>
  );

  if (!data) return <div style={{ color: '#ef4444', fontSize: 14, fontFamily: 'monospace', padding: '16px 0' }}>Kurallar yüklenemedi</div>;

  const kurallar = data.kurallar ?? [];
  const kategoriler = ['TÜMÜ', ...(data.kategoriler ?? [])];

  const filtreliKurallar = kurallar.filter(k => {
    const katEsles = aktifKat === 'TÜMÜ' || k.kategori === aktifKat;
    const aramaEsles = !aramaMetni ||
      k.kural.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      k.aciklama.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      k.no.toLowerCase().includes(aramaMetni.toLowerCase());
    return katEsles && aramaEsles;
  });

  const gruplar = [...new Set(filtreliKurallar.map(k => k.kategori))];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Başlık + İstatistik ─────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 28 }}>⚖️</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: '0.15em', color: '#a78bfa' }}>SİSTEM KURALLARI</div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>Her koşulda doğru olanı yapmak</div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { l: 'TOPLAM', v: data.toplam_kural, c: '#22d3ee' },
            { l: 'ENGEL',  v: data.iptal,        c: '#ef4444' },
            { l: 'DUR',    v: data.dur,           c: '#f59e0b' },
            { l: 'UYARI',  v: data.uyari,         c: '#3b82f6' },
          ].map(s => (
            <div key={s.l} style={{ borderRadius: 8, border: `1px solid ${s.c}44`, background: `${s.c}15`, padding: '8px 16px', textAlign: 'center', minWidth: 60 }}>
              <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'monospace', color: s.c, textShadow: `0 0 8px ${s.c}60` }}>{s.v}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.12em', fontWeight: 700 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Arama ─────────────────────────────────────────────── */}
      <input
        type="text"
        placeholder="Kural ara... (numara, isim veya açıklama)"
        value={aramaMetni}
        onChange={e => setAramaMetni(e.target.value)}
        style={{
          width: '100%', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(100,116,139,0.2)',
          borderRadius: 8, padding: '10px 14px', fontSize: 13, fontFamily: 'monospace',
          color: '#cbd5e1', outline: 'none',
        }}
      />

      {/* ── Kategori Filtreleri ────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {kategoriler.map(k => (
          <button
            key={k}
            onClick={() => setAktifKat(k)}
            style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', padding: '5px 12px',
              borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
              border: aktifKat === k ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(100,116,139,0.15)',
              background: aktifKat === k ? 'rgba(167,139,250,0.15)' : 'rgba(15,23,42,0.3)',
              color: aktifKat === k ? '#a78bfa' : (KAT_RENK[k] ?? '#64748b'),
            }}
          >
            {k}
          </button>
        ))}
      </div>

      {/* ── Kural Listesi ─────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 500, overflowY: 'auto', paddingRight: 4 }}>
        {filtreliKurallar.length === 0 && (
          <div style={{ color: '#475569', fontSize: 14, fontFamily: 'monospace', fontStyle: 'italic', textAlign: 'center', padding: '32px 0' }}>
            Eşleşen kural bulunamadı.
          </div>
        )}

        {gruplar.map(grup => {
          const grubbunKurallari = filtreliKurallar.filter(k => k.kategori === grup);
          const renk = KAT_RENK[grup] ?? '#94a3b8';
          return (
            <div key={grup}>
              {/* Grup başlığı */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(100,116,139,0.15)' }} />
                <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.2em', color: renk }}>{grup}</span>
                <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>({grubbunKurallari.length})</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(100,116,139,0.15)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {grubbunKurallari.map(k => {
                  const cfg = IHLAL_RENK[k.ihlal] ?? IHLAL_RENK.UYARI;
                  return (
                    <div key={k.no} style={{
                      borderRadius: 8, border: `1px solid ${cfg.border}`, background: cfg.bg,
                      padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 12,
                    }}>
                      {/* No */}
                      <div style={{ fontSize: 12, fontWeight: 900, fontFamily: 'monospace', color: cfg.text, flexShrink: 0, marginTop: 2, minWidth: 48 }}>
                        {k.no}
                      </div>
                      {/* İçerik */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: cfg.text, lineHeight: 1.3 }}>{k.kural}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, lineHeight: 1.5 }}>{k.aciklama}</div>
                      </div>
                      {/* İhlal sonucu */}
                      <div style={{
                        flexShrink: 0, fontSize: 10, fontWeight: 900, letterSpacing: '0.1em',
                        padding: '3px 8px', borderRadius: 6, border: `1px solid ${cfg.border}`,
                        color: cfg.text, background: cfg.bg,
                      }}>
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
