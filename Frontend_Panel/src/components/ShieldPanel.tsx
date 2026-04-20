"use client";

import { useState, useEffect, useCallback } from 'react';

// ============================================================
// SCR-14 — SİSTEM KALKAN (Circuit Breaker + Audit Zinciri)
// ============================================================

interface CBDurum {
  state         : 'KAPALI' | 'ACIK' | 'YARI_ACIK';
  hata_sayisi   : number;
  toplam_trip   : number;
  toplam_basari : number;
  sure_kaldi_ms : number;
}

interface AuditEntry {
  seq       : number;
  timestamp : string;
  agent_id  : string;
  action    : string;
  hash      : string;
  prev_hash : string;
  integrity : 'OK' | 'FAIL';
}

interface VerifyResult {
  toplam: number; gecerli: number; bozuk: number;
  bozuk_satirlar: number[]; durum: 'GUVENLI' | 'TEHLIKE';
}

const STATE_CFG = {
  KAPALI   : { color:'#4ade80', label:'KAPALI ✓', bg:'#052e16' },
  ACIK     : { color:'#f87171', label:'AÇIK ⚠',  bg:'#450a0a' },
  YARI_ACIK: { color:'#fbbf24', label:'YARI AÇIK',bg:'#422006' },
};

export default function ShieldPanel() {
  const [cb,       setCb]       = useState<CBDurum | null>(null);
  const [entries,  setEntries]  = useState<AuditEntry[]>([]);
  const [verify,   setVerify]   = useState<VerifyResult | null>(null);
  const [resetting, setResetting] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [cbRes, auditRes, verRes] = await Promise.all([
        fetch('/api/circuit-breaker'),
        fetch('/api/audit-chain?n=15'),
        fetch('/api/audit-chain?action=verify'),
      ]);

      // Defensive: Her response ayrı ayrı kontrol edilir
      if (cbRes.ok) {
        const cbData = await cbRes.json().catch(() => null);
        if (cbData && typeof cbData === 'object') setCb(cbData);
      }

      if (auditRes.ok) {
        const auditData = await auditRes.json().catch(() => null);
        if (auditData?.kayitlar && Array.isArray(auditData.kayitlar)) {
          setEntries(auditData.kayitlar);
        }
      }

      if (verRes.ok) {
        const verData = await verRes.json().catch(() => null);
        if (verData?.durum) setVerify(verData);
      }
    } catch {
      // Ağ hatası — mevcut state korunur, sessiz fail
    }
  }, []);

  useEffect(() => {
    void fetchAll();
    const iv = setInterval(() => void fetchAll(), 8_000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  async function resetCB() {
    setResetting(true);
    await fetch('/api/circuit-breaker', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'reset' }),
    });
    await fetchAll();
    setResetting(false);
  }

  const cfg = cb?.state ? (STATE_CFG[cb.state] ?? STATE_CFG.KAPALI) : STATE_CFG.KAPALI;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* BAşLIK */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{
          width:40, height:40, borderRadius:8, fontSize:22,
          background:'linear-gradient(135deg,#dc2626,#0f172a)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>🛡️</div>
        <div>
          <div style={{ color:'#f87171', fontSize:10, letterSpacing:'0.2em', fontWeight:700 }}>SİSTEM KALKAN</div>
          <div style={{ color:'#475569', fontSize:9, fontFamily:'monospace' }}>Circuit Breaker + SHA-256 Audit Zinciri</div>
        </div>
        {verify && (
          <div style={{
            marginLeft:'auto', padding:'4px 14px', borderRadius:20,
            background: verify.durum === 'GUVENLI' ? '#052e16' : '#450a0a',
            border:`1px solid ${ verify.durum === 'GUVENLI' ? '#4ade80' : '#f87171'}40`,
            color: verify.durum === 'GUVENLI' ? '#4ade80' : '#f87171',
            fontSize:10, fontWeight:700, letterSpacing:'0.1em',
          }}>
            {verify.durum === 'GUVENLI' ? '🔒 ZİNCİR SAĞLAM' : '⚠ ZİNCİR BOZUK'}
          </div>
        )}
      </div>

      {/* CIRCUIT BREAKER KARTI */}
      {cb && (
        <div style={{
          background: cfg.bg, border:`1px solid ${cfg.color}40`,
          borderRadius:10, padding:16,
        }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width:12, height:12, borderRadius:'50%', background:cfg.color,
                boxShadow:`0 0 10px ${cfg.color}`,
                animation: cb.state !== 'KAPALI' ? 'pulse 1s infinite' : 'none',
              }} />
              <span style={{ color:cfg.color, fontSize:14, fontWeight:900, fontFamily:'monospace' }}>
                {cfg.label}
              </span>
            </div>
            <button
              onClick={() => void resetCB()}
              disabled={resetting || cb.state === 'KAPALI'}
              style={{
                background:'#1e293b', border:'1px solid #334155',
                color: cb.state !== 'KAPALI' ? '#fbbf24' : '#475569',
                fontSize:9, fontWeight:700, padding:'4px 12px', borderRadius:6,
                cursor: cb.state !== 'KAPALI' ? 'pointer' : 'not-allowed',
                fontFamily:'monospace', letterSpacing:'0.1em',
              }}
            >
              {resetting ? '⟳' : '⚡ SIFIRLA'}
            </button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
            {[
              { l:'HATA',   v:cb.hata_sayisi,    c:'#f87171' },
              { l:'TRİP',   v:cb.toplam_trip,     c:'#fbbf24' },
              { l:'BAşARI', v:cb.toplam_basari,   c:'#4ade80' },
              { l:'KALAN',  v:`${Math.round(cb.sure_kaldi_ms/1000)}s`, c:'#06b6d4' },
            ].map(s => (
              <div key={s.l} style={{
                background:'#0f172a', borderRadius:8, padding:'8px',
                textAlign:'center', border:'1px solid #1e293b',
              }}>
                <div style={{ color:s.c, fontSize:18, fontWeight:900, fontFamily:'monospace' }}>{s.v}</div>
                <div style={{ color:'#475569', fontSize:8, letterSpacing:'0.15em' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ZİNCİR İSTATİSTİĞİ */}
      {verify && (
        <div style={{ display:'flex', gap:10 }}>
          {[
            { l:'TOPLAM', v:verify.toplam,  c:'#e2e8f0' },
            { l:'GEÇERLİ', v:verify.gecerli, c:'#4ade80' },
            { l:'BOZUK',  v:verify.bozuk,   c:'#f87171' },
          ].map(s => (
            <div key={s.l} style={{
              flex:1, background:'#0f172a', border:'1px solid #1e293b',
              borderRadius:8, padding:'10px', textAlign:'center',
            }}>
              <div style={{ color:s.c, fontSize:20, fontWeight:900, fontFamily:'monospace' }}>{s.v}</div>
              <div style={{ color:'#475569', fontSize:8, letterSpacing:'0.15em' }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* AUDİT ZİNCİR LOG */}
      <div>
        <div style={{ color:'#475569', fontSize:9, letterSpacing:'0.15em', marginBottom:8 }}>SON 15 AUDİT KAYDI</div>
        <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
          {entries.length === 0 && (
            <div style={{ color:'#374151', fontSize:10, fontFamily:'monospace', padding:'20px 0', textAlign:'center' }}>
              Henüz audit kaydı yok
            </div>
          )}
          {entries.map(e => (
            <div key={e.seq} style={{
              background:'#0f0f1a', border:'1px solid #1e293b',
              borderLeft:`3px solid ${e.integrity === 'OK' ? '#4ade80' : '#f87171'}`,
              borderRadius:6, padding:'7px 12px',
              display:'flex', alignItems:'center', gap:10,
            }}>
              <span style={{ color:'#4b5563', fontSize:9, fontFamily:'monospace', minWidth:28 }}>#{e.seq}</span>
              <span style={{ color:'#06b6d4', fontSize:9, fontWeight:700, minWidth:80 }}>{e.agent_id}</span>
              <span style={{ color:'#94a3b8', fontSize:9, fontFamily:'monospace', flex:1 }}>{e.action}</span>
              <span style={{ color:'#374151', fontSize:8, fontFamily:'monospace' }}>
                {e.hash.slice(0,8)}…
              </span>
              <span style={{
                color: e.integrity === 'OK' ? '#4ade80' : '#f87171',
                fontSize:8, fontWeight:700,
              }}>{e.integrity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
