"use client";

import { useEffect, useState, useCallback } from 'react';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

// ============================================================
// ACTIVITY FEED — AJAN AKTİVİTE AKIŞI
// /api/queue'dan canlı veri çeker, 5sn polling
// ============================================================

interface QueueJob {
  job_id        : string;
  agent_id      : string;
  agent_kod_adi : string;
  agent_katman  : string;
  task          : string;
  status        : 'tamamlandi' | 'hata' | 'reddedildi';
  duration_ms  ?: number;
  created_at    : string;
  completed_at ?: string;
  result       ?: string;
}

interface QueueStats {
  toplam     : number;
  tamamlandi : number;
  hata       : number;
  reddedildi : number;
  ort_sure_ms: number;
}

const KATMAN_RENK: Record<string, string> = {
  KOMUTA: '#f59e0b',
  L1    : '#06b6d4',
  L2    : '#3b82f6',
  L3    : '#a855f7',
  DESTEK: '#22c55e',
};

const STATUS_RENK = {
  tamamlandi: { text: '#4ade80', icon: '✓', label: 'TAMAM' },
  hata       : { text: '#f87171', icon: '✕', label: 'HATA'  },
  reddedildi : { text: '#6b7280', icon: '—', label: 'RED'   },
};

export default function ActivityFeed() {
  const [jobs,     setJobs]     = useState<QueueJob[]>([]);
  const [logs,     setLogs]     = useState<any[]>([]);
  const [stats,    setStats]    = useState<QueueStats | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [error,    setError]    = useState<string | null>(null);

  // LOG_LINE verileri (Hat-2)
  const [hatLogs, setHatLogs] = useState<{id:string;agent_id:string;agent_name:string;katman:string;mesaj:string;tip:string;timestamp:string}[]>([]);

  const fetch_ = useCallback(async () => {
    try {
      // Mevcut queue polling
      const res  = await fetchWithTimeout('/api/queue', undefined, 10_000);
      const data = await res.json() as { jobs: QueueJob[]; stats: QueueStats };
      if (data.jobs)  setJobs(data.jobs);
      if (data.stats) setStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof DOMException && err.name === 'AbortError'
        ? 'Bağlantı zaman aşımı (10s)'
        : 'Sunucu bağlantısı yok');
    }

    // LOG_LINE polling (Hat-2 verileri)
    try {
      const hatRes = await fetchWithTimeout('/api/hat/feed', undefined, 5_000);
      const hatData = await hatRes.json() as { logs: typeof hatLogs };
      if (hatData.logs) setHatLogs(hatData.logs);
    } catch { /* sessiz — hat feed yoksa mevcut akış devam */ }

    finally  { setLoading(false); }
  }, []);

  useEffect(() => {
    void fetch_();
    const iv = setInterval(() => void fetch_(), 5_000);
    return () => {
      clearInterval(iv);
    };
  }, [fetch_]);

  function ago(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60_000)  return `${Math.round(diff/1000)}sn önce`;
    if (diff < 3600_000) return `${Math.round(diff/60_000)}dk önce`;
    return `${Math.round(diff/3600_000)}sa önce`;
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'20px 0', justifyContent:'center' }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:'#06b6d4', animation:'pulse 1.5s infinite' }} />
      <span style={{ color:'#06b6d4', fontSize:10, fontFamily:'monospace', letterSpacing:'0.3em' }}>AKTİVİTE AKIŞI YÜKLENİYOR...</span>
    </div>
  );

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'20px 0', justifyContent:'center' }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:'#f87171' }} />
      <span style={{ color:'#f87171', fontSize:10, fontFamily:'monospace' }}>{error}</span>
      <button onClick={() => void fetch_()} style={{ color:'#06b6d4', fontSize:9, fontFamily:'monospace', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>TEKRAR DENE</button>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* BAşLIK + İSTATİSTİK */}
      <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{
            width:36, height:36, borderRadius:8,
            background:'linear-gradient(135deg, #06b6d4, #3b82f6)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
          }}>📡</div>
          <div>
            <div style={{ color:'#06b6d4', fontSize:10, letterSpacing:'0.2em', fontWeight:700 }}>AKTİVİTE AKIŞI</div>
            <div style={{ color:'#64748b', fontSize:10, fontFamily:'monospace' }}>Son 100 ajan işi — 5sn yenileme</div>
          </div>
        </div>
        {stats && (
          <div style={{ marginLeft:'auto', display:'flex', gap:8, flexWrap:'wrap' }}>
            {[
              { label:'TOPLAM', val: stats.toplam,     col:'#e2e8f0' },
              { label:'TAMAM',  val: stats.tamamlandi, col:'#4ade80' },
              { label:'HATA',   val: stats.hata,       col:'#f87171' },
              { label:'ORT',    val: `${stats.ort_sure_ms}ms`, col:'#06b6d4' },
            ].map(s => (
              <div key={s.label} style={{
                background:'#0f172a', border:'1px solid #1e293b',
                borderRadius:8, padding:'4px 10px', textAlign:'center', minWidth:56,
              }}>
                <div style={{ color:s.col, fontSize:13, fontWeight:900, fontFamily:'monospace' }}>{s.val}</div>
                <div style={{ color:'#475569', fontSize:8, letterSpacing:'0.15em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* İŞ LİSTESİ */}
      {jobs.length === 0 ? (
        <div style={{
          textAlign:'center', padding:'40px 0',
          color:'#374151', fontSize:11, fontFamily:'monospace',
          border:'1px dashed #1e293b', borderRadius:8,
        }}>
          Henüz ajan işi yok — OTO GÖREV ile bir görev çalıştır
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {jobs.map(job => {
            const sc      = STATUS_RENK[job.status] ?? STATUS_RENK.reddedildi;
            const katRenk = KATMAN_RENK[job.agent_katman] ?? '#94a3b8';
            const isOpen  = expanded === job.job_id;

            return (
              <div
                key={job.job_id}
                onClick={() => setExpanded(isOpen ? null : job.job_id)}
                style={{
                  background:'#0f0f1a',
                  border:`1px solid ${isOpen ? sc.text + '40' : '#1e293b'}`,
                  borderLeft:`3px solid ${sc.text}`,
                  borderRadius:8, padding:'10px 14px',
                  cursor:'pointer', transition:'all 0.2s',
                }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:sc.text, fontSize:12, fontWeight:700 }}>{sc.icon}</span>
                  <span style={{
                    background: katRenk + '20', color: katRenk,
                    border:`1px solid ${katRenk}40`,
                    padding:'1px 8px', borderRadius:10,
                    fontSize:9, fontWeight:700, letterSpacing:'0.1em',
                  }}>
                    {job.agent_kod_adi}
                  </span>
                  <span style={{ color:'#94a3b8', fontSize:9, fontFamily:'monospace', flex:1 }}>
                    {job.task.slice(0, 80)}{job.task.length > 80 ? '…' : ''}
                  </span>
                  <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                    {job.duration_ms !== undefined && (
                      <span style={{ color:'#475569', fontSize:8, fontFamily:'monospace' }}>
                        {job.duration_ms}ms
                      </span>
                    )}
                    <span style={{ color:'#374151', fontSize:8, fontFamily:'monospace' }}>
                      {ago(job.completed_at ?? job.created_at)}
                    </span>
                    <span style={{ color:'#374151', fontSize:10 }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Detay */}
                {isOpen && job.result && (
                  <pre style={{
                    marginTop:10, padding:10,
                    background:'#020617', borderRadius:6,
                    border:'1px solid #1e293b',
                    color:'#94a3b8', fontSize:9,
                    fontFamily:'monospace', whiteSpace:'pre-wrap',
                    lineHeight:1.6, maxHeight:200, overflowY:'auto',
                  }}>
                    {job.result.slice(0, 800)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── LOG_LINE AKIŞI (Hat-2) ─────────────────────────────── */}
      {hatLogs.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{
              width:8, height:8, borderRadius:'50%',
              background:'#f59e0b', animation:'pulse 2s infinite',
            }} />
            <span style={{ color:'#f59e0b', fontSize:10, fontWeight:700, letterSpacing:'0.15em' }}>
              HAT-2 LOG_LINE AKIŞI
            </span>
            <span style={{ color:'#475569', fontSize:9, fontFamily:'monospace' }}>
              {hatLogs.length} kayıt
            </span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
            {hatLogs.slice(0, 20).map(log => {
              const tipRenk: Record<string, string> = {
                BASARI: '#4ade80', HATA: '#f87171', UYARI: '#f59e0b', BILGI: '#06b6d4',
              };
              const renk = tipRenk[log.tip] || '#94a3b8';
              return (
                <div key={log.id} style={{
                  background:'#0a0a15', border:'1px solid #1e293b',
                  borderLeft:`3px solid ${renk}`,
                  borderRadius:6, padding:'6px 10px',
                  display:'flex', alignItems:'center', gap:8,
                }}>
                  <span style={{
                    background: renk + '20', color: renk,
                    border:`1px solid ${renk}40`,
                    padding:'1px 6px', borderRadius:8,
                    fontSize:8, fontWeight:700, letterSpacing:'0.1em',
                  }}>
                    {log.katman}
                  </span>
                  <span style={{ color:'#94a3b8', fontSize:9, fontFamily:'monospace', flex:1 }}>
                    {log.mesaj}
                  </span>
                  <span style={{ color:'#374151', fontSize:8, fontFamily:'monospace', flexShrink:0 }}>
                    {new Date(log.timestamp).toLocaleTimeString('tr-TR')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* YENILE */}
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button
          onClick={() => void fetch_()}
          style={{
            background:'none', border:'none',
            color:'#06b6d4', fontSize:9, fontFamily:'monospace',
            cursor:'pointer', letterSpacing:'0.1em',
          }}
        >⟳ YENİLE</button>
      </div>
    </div>
  );
}
