"use client";

import { useEffect, useState, useCallback } from 'react';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

// ============================================================
// LIVE METRICS — CANLI SİSTEM GÖSTERGELERİ
// /api/health + /api/agents + /api/queue polling (5sn)
// ============================================================

interface Metric {
  label   : string;
  val     : number;
  max     : number;
  unit    : string;
  color   : string;
  icon    : string;
}

// Bar Göstergeleri UI'dan çıkartıldığı için fonksiyona gerek kalmadı.

function RadialGauge({ val, max, color, label, unit }: {
  val: number; max: number; color: string; label: string; unit: string;
}) {
  const pct    = Math.min(100, (val / max) * 100);
  const radius = 30;
  const circ   = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;

  return (
    <div style={{ position:'relative', width:90, height:90, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <svg width="90" height="90" style={{ position:'absolute', top:0, left:0 }}>
        <circle cx="45" cy="45" r={radius} fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle
          cx="45" cy="45" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 45 45)"
          style={{ transition:'stroke-dashoffset 0.8s ease', filter:`drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div style={{ textAlign:'center', zIndex:1 }}>
        <div style={{ color, fontSize:16, fontWeight:900, fontFamily:'monospace', lineHeight:1 }}>
          {Math.round(val)}
        </div>
        <div style={{ color:'#64748b', fontSize:8, letterSpacing:'0.1em' }}>{unit}</div>
      </div>
    </div>
  );
}

export default function LiveMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([
    { label:'AKTİF AJAN',   val:0,  max:100,  unit:'/ 100', color:'#06b6d4', icon:'◈' },
    { label:'TAMAMLANAN',   val:0,  max:1000, unit:'görev', color:'#4ade80', icon:'✓' },
    { label:'HATA',         val:0,  max:100,  unit:'adet',  color:'#f87171', icon:'✕' },
    { label:'ORT YANIT',    val:0,  max:5000, unit:'ms',    color:'#a78bfa', icon:'⟳' },
  ]);
  const [isPulse, setIsPulse] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  // DATA_LINE verileri (Hat-3)
  const [hatStats, setHatStats] = useState<{red_line_push:number;log_line_toplam:number;data_line_toplam:number} | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const [agentRes, queueRes] = await Promise.all([
        fetchWithTimeout('/api/agents', undefined, 10_000),
        fetchWithTimeout('/api/queue', undefined, 10_000),
      ]);
      const agentData = await agentRes.json() as {
        stats?: { aktif?: number; toplamGorev?: number; toplamHata?: number };
      };
      const queueData = await queueRes.json() as {
        stats?: { tamamlandi?: number; hata?: number; ort_sure_ms?: number };
      };

      const aktif        = agentData.stats?.aktif        ?? 0;
      const toplamGorev  = agentData.stats?.toplamGorev  ?? queueData.stats?.tamamlandi ?? 0;
      const toplamHata   = agentData.stats?.toplamHata   ?? queueData.stats?.hata       ?? 0;
      const ortSure      = queueData.stats?.ort_sure_ms  ?? 0;

      setMetrics([
        { label:'AKTİF AJAN',   val:aktif,       max:100,  unit:'/ 100', color:'#06b6d4', icon:'◈' },
        { label:'TAMAMLANAN',   val:toplamGorev, max:1000, unit:'görev', color:'#4ade80', icon:'✓' },
        { label:'HATA',         val:toplamHata,  max:100,  unit:'adet',  color:'#f87171', icon:'✕' },
        { label:'ORT YANIT',    val:ortSure,     max:5000, unit:'ms',    color:'#a78bfa', icon:'⟳' },
      ]);
      setIsPulse(p => !p);
      setLastUpdate(new Date().toLocaleTimeString('tr-TR'));
    } catch { /* sessiz */ }

    // DATA_LINE polling (Hat-3 verileri)
    try {
      const hatRes = await fetchWithTimeout('/api/hat/data', undefined, 5_000);
      const hatData = await hatRes.json() as { stats: typeof hatStats };
      if (hatData.stats) setHatStats(hatData.stats);
    } catch { /* sessiz */ }
  }, []);

  useEffect(() => {
    void fetchMetrics();
    const iv = setInterval(() => void fetchMetrics(), 5_000);
    
    return () => {
      clearInterval(iv);
    };
  }, [fetchMetrics]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, height:'100%' }}>

      {/* BAşLIK */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:36, height:36, borderRadius:8,
            background:'linear-gradient(135deg, #06b6d4, #0f172a)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
          }}>📊</div>
          <div>
            <div style={{ color:'#06b6d4', fontSize:10, letterSpacing:'0.2em', fontWeight:700 }}>CANLI GÖSTERGELER</div>
            <div style={{ color:'#475569', fontSize:9, fontFamily:'monospace' }}>5sn yenileme</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{
            width:6, height:6, borderRadius:'50%',
            background:'#4ade80',
            animation:'pulse 2s infinite',
          }} />
          <span style={{ color:'#475569', fontSize:9, fontFamily:'monospace' }}>{lastUpdate}</span>
        </div>
      </div>

      {/* RADIAL GAUGE'LAR */}
      <div style={{ display:'flex', justifyContent:'space-around', flexWrap:'wrap', gap:12 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <RadialGauge val={m.val} max={m.max} color={m.color} label={m.label} unit={m.unit} />
            <div style={{ color:'#64748b', fontSize:9, fontFamily:'monospace', letterSpacing:'0.1em', textAlign:'center' }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* BAR GÖSTERİMLERİ İPTAL EDİLMİŞTİR (VERİ TEKRARI VE BOŞ KALABALIK ENGELLENDİ) */}

      {/* ── DATA_LINE RAPORLARI (Hat-3) ─────────────────────── */}
      {hatStats && (hatStats.red_line_push > 0 || hatStats.log_line_toplam > 0) && (
        <div style={{
          padding:'10px 14px', borderRadius:8,
          background:'#0a0a15', border:'1px solid #f59e0b30',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#f59e0b', animation:'pulse 2s infinite' }} />
            <span style={{ color:'#f59e0b', fontSize:9, fontWeight:700, letterSpacing:'0.15em' }}>HAT RAPORLARI (DATA_LINE)</span>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {[
              { label:'RED_LINE', val:hatStats.red_line_push, col:'#ef4444' },
              { label:'LOG_LINE', val:hatStats.log_line_toplam, col:'#f59e0b' },
              { label:'DATA_LINE', val:hatStats.data_line_toplam, col:'#06b6d4' },
            ].map(s => (
              <div key={s.label} style={{
                background:'#0f172a', border:`1px solid ${s.col}30`,
                borderRadius:8, padding:'6px 14px', textAlign:'center', minWidth:70,
              }}>
                <div style={{ color:s.col, fontSize:16, fontWeight:900, fontFamily:'monospace' }}>{s.val}</div>
                <div style={{ color:'#475569', fontSize:7, letterSpacing:'0.15em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CANLI PULSE GÖSTERGESİ */}
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        padding:'8px 12px', borderRadius:8,
        background:'#0f172a', border:'1px solid #1e293b',
      }}>
        <div style={{
          width:8, height:8, borderRadius:'50%',
          background: isPulse ? '#4ade80' : '#164e63',
          transition:'background 0.3s',
          boxShadow: isPulse ? '0 0 8px #4ade80' : 'none',
        }} />
        <span style={{ color:'#64748b', fontSize:9, fontFamily:'monospace' }}>
          SİSTEM CANLI — {lastUpdate || 'YÜKLENİYOR'}
        </span>
      </div>
    </div>
  );
}
