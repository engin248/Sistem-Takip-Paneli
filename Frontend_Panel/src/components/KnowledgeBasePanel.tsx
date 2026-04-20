"use client";

import { useState, useEffect } from 'react';

// ============================================================
// SCR-11 — BİLGİ TABANI (RAG Arama Paneli)
// ============================================================

interface RagSonuc {
  kategori: string;
  skor    : number;
  excerpt : string;
  dosyaAdi: string;
}

interface ArsivBelge {
  kategori: string;
  dosyaAdi: string;
  boyutKB : number;
}

const KATEGORI_RENKLERI: Record<string, string> = {
  'Sistem Mimarisi'        : 'cyan',
  'Ajan Sistemleri'        : 'amber',
  'Uretim ve Imalat'       : 'orange',
  'Veritabani ve Veri'     : 'blue',
  'Isletme ve Finans'      : 'green',
  'Kalip Tasarim Urun'     : 'purple',
  'Kasa Muhasebe Maliyet'  : 'yellow',
  'Stok ve Sevkiyat'       : 'teal',
  'Personel ve IK'         : 'pink',
  'Telegram ve Bildirimler': 'sky',
  'Guvenlik ve Denetim'    : 'red',
  'Test ve Hata Yonetimi'  : 'rose',
  'AI ve Makine Ogrenmesi' : 'violet',
  'Arastirma ve Analiz'    : 'indigo',
  'Diger'                  : 'slate',
};

function renk(kategori: string) {
  const key = Object.keys(KATEGORI_RENKLERI).find(k =>
    kategori.toLowerCase().includes(k.toLowerCase().split(' ')[0] ?? '')
  );
  return KATEGORI_RENKLERI[key || 'Diger'] || 'slate';
}

export default function KnowledgeBasePanel() {
  const [sorgu,     setSorgu]     = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sonuclar,  setSonuclar]  = useState<RagSonuc[]>([]);
  const [belgeler,  setBelgeler]  = useState<ArsivBelge[]>([]);
  const [toplam,    setToplam]    = useState(0);
  const [aramaDt,   setAramaDt]   = useState(0);

  // Arşiv durumunu yükle
  useEffect(() => {
    fetch('/api/rag?q=__status__')
      .then(r => r.json())
      .then(d => { if (d.belgeler) setBelgeler(d.belgeler); })
      .catch(() => {});
  }, []);

  async function ara(e: React.FormEvent) {
    e.preventDefault();
    if (!sorgu.trim() || sorgu.length < 2) return;

    setYukleniyor(true);
    setSonuclar([]);
    const t0 = Date.now();

    try {
      const res  = await fetch(`/api/rag?q=${encodeURIComponent(sorgu)}&max=8`);
      const data = await res.json();
      if (data.sonuclar) setSonuclar(data.sonuclar);
      if (data.toplam_hit !== undefined) setToplam(data.toplam_hit);
      setAramaDt(Date.now() - t0);
    } catch {
      setSonuclar([]);
    } finally {
      setYukleniyor(false);
    }
  }

  const c = renk;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>

      {/* BAşLIK */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px',
          boxShadow: '0 0 15px rgba(124, 58, 237, 0.5)'
        }}>📚</div>
        <div>
          <div style={{ color: '#c4b5fd', fontSize: '11px', letterSpacing: '2px', fontWeight: 900, textShadow: '0 0 8px rgba(196, 181, 253, 0.5)' }}>
            SCR-11 — BİLGİ TABANI
          </div>
          <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 600 }}>
            KONSOLIDE_ARSIV · {belgeler.length} Kategori
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <span style={{
            background: 'rgba(30, 27, 75, 0.8)', border: '1px solid #6366f1',
            color: '#c7d2fe', padding: '4px 10px', borderRadius: 20,
            fontSize: '11px', fontWeight: 800,
            boxShadow: '0 0 8px rgba(99, 102, 241, 0.3)'
          }}>
            {belgeler.reduce((a, b) => a + b.boyutKB, 0).toLocaleString()} KB
          </span>
          <span style={{
            background: 'rgba(30, 27, 75, 0.8)', border: '1px solid #a855f7',
            color: '#e9d5ff', padding: '4px 10px', borderRadius: 20,
            fontSize: '11px', fontWeight: 800,
            boxShadow: '0 0 8px rgba(168, 85, 247, 0.3)'
          }}>
            RAG AKTİF
          </span>
        </div>
      </div>

      {/* ARAMA KUTUSU */}
      <form onSubmit={ara} style={{ display: 'flex', gap: '10px' }}>
        <input
          value={sorgu}
          onChange={e => setSorgu(e.target.value)}
          placeholder="Bilgi tabanında ara... (ör: sistem mimarisi, ajan protokolleri, veritabanı)"
          style={{
            flex: 1,
            background: 'rgba(15, 15, 26, 0.6)',
            border: '1px solid #6366f1',
            borderRadius: 8,
            color: '#f8fafc',
            padding: '10px 16px',
            fontSize: '14px',
            outline: 'none',
            boxShadow: 'inset 0 0 10px rgba(99, 102, 241, 0.1)',
            transition: 'all 0.3s'
          }}
          onFocus={e => e.target.style.boxShadow = 'inset 0 0 10px rgba(99, 102, 241, 0.2), 0 0 10px rgba(99, 102, 241, 0.3)'}
          onBlur={e => e.target.style.boxShadow = 'inset 0 0 10px rgba(99, 102, 241, 0.1)'}
        />
        <button
          type="submit"
          disabled={yukleniyor || sorgu.length < 2}
          style={{
            background: yukleniyor ? '#1e1b4b' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            border: 'none', borderRadius: 8, color: '#fff',
            padding: '10px 24px', fontSize: '14px', fontWeight: 800,
            cursor: yukleniyor ? 'wait' : 'pointer',
            minWidth: 100,
            boxShadow: yukleniyor ? 'none' : '0 0 15px rgba(124, 58, 237, 0.4)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={e => !yukleniyor && (e.currentTarget.style.boxShadow = '0 0 20px rgba(124, 58, 237, 0.6)')}
          onMouseLeave={e => !yukleniyor && (e.currentTarget.style.boxShadow = '0 0 15px rgba(124, 58, 237, 0.4)')}
        >
          {yukleniyor ? '⏳ Arıyor...' : '🔍 Ara'}
        </button>
      </form>

      {/* SONUÇLAR */}
      {sonuclar.length > 0 && (
        <div>
          <div style={{
            color: '#6b7280', fontSize: '11px', marginBottom: '10px',
            letterSpacing: '1px',
          }}>
            {toplam} kategoride eşleşme bulundu · {belgeler.length} kategori tarandı · {aramaDt}ms
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sonuclar.map((s, i) => (
              <div key={i} style={{
                background: '#0f0f1a',
                border: '1px solid #1e1b4b',
                borderLeft: '3px solid #7c3aed',
                borderRadius: 8, padding: '14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{
                    background: '#1e1b4b', color: '#a78bfa',
                    padding: '2px 10px', borderRadius: 12,
                    fontSize: '10px', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '1px',
                  }}>
                    {s.kategori}
                  </span>
                  <span style={{ color: '#4b5563', fontSize: '10px' }}>
                    Skor: {s.skor} · {s.dosyaAdi}
                  </span>
                </div>
                <div style={{
                  color: '#9ca3af', fontSize: '12px', lineHeight: 1.6,
                  maxHeight: '120px', overflow: 'hidden',
                  WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent)',
                }}>
                  {s.excerpt.slice(0, 400)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ARŞİV KATEGORİLERİ */}
      {sonuclar.length === 0 && (
        <div>
          <div style={{ color: '#4b5563', fontSize: '11px', letterSpacing: '1px', marginBottom: '12px' }}>
            KATEGORİLER
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {belgeler.map((b, i) => (
              <button
                key={i}
                onClick={() => { setSorgu(b.kategori); }}
                style={{
                  background: '#0f0f1a',
                  border: '1px solid #1e1b4b',
                  borderRadius: 20, color: '#818cf8',
                  padding: '4px 14px', fontSize: '11px',
                  cursor: 'pointer', fontWeight: 600,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#7c3aed';
                  (e.currentTarget as HTMLButtonElement).style.color = '#a78bfa';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#1e1b4b';
                  (e.currentTarget as HTMLButtonElement).style.color = '#818cf8';
                }}
              >
                {b.kategori} 
                <span style={{ color: '#4b5563', marginLeft: 6 }}>{b.boyutKB}KB</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
