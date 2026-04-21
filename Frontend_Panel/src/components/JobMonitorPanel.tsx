"use client";

// SCR-16 — JOB MONITOR
// Gerçek zamanlı iş kuyruğu görüntüleyici
// /api/jobs endpointinden canlı veri çeker

import { useState, useEffect, useCallback } from 'react';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

interface QueueJob {
  job_id       : string;
  agent_id     : string;
  agent_kod_adi: string;
  agent_katman : string;
  task         : string;
  priority     : number;
  status       : 'bekliyor' | 'isleniyor' | 'tamamlandi' | 'hata' | 'reddedildi';
  created_at   : string;
  completed_at ?: string;
  result       ?: string;
  error        ?: string;
  duration_ms  ?: number;
}

interface QueueStats {
  toplam      : number;
  tamamlandi  : number;
  hata        : number;
  reddedildi  : number;
  basari_orani: number;
  ort_sure_ms : number;
}

const STATUS_CFG = {
  tamamlandi : { label: 'TAMAM',   dot: 'bg-green-400',  text: 'text-green-400',  border: 'border-green-500/20',  bg: 'bg-green-500/5'   },
  isleniyor  : { label: 'ÇALIŞIYOR',dot:'bg-cyan-400',   text: 'text-cyan-400',   border: 'border-cyan-500/25',   bg: 'bg-cyan-500/5'    },
  bekliyor   : { label: 'BEKLIYOR',dot: 'bg-amber-400',  text: 'text-amber-400',  border: 'border-amber-500/20',  bg: 'bg-amber-500/5'   },
  hata       : { label: 'HATA',    dot: 'bg-red-400',    text: 'text-red-400',    border: 'border-red-500/20',    bg: 'bg-red-500/5'     },
  reddedildi : { label: 'RED',     dot: 'bg-pink-400',   text: 'text-pink-400',   border: 'border-pink-500/20',   bg: 'bg-pink-500/5'    },
};

const KATMAN_COLOR: Record<string, string> = {
  KOMUTA: 'text-amber-400',
  L1    : 'text-cyan-400',
  L2    : 'text-blue-400',
  L3    : 'text-purple-400',
  DESTEK: 'text-green-400',
};

const PRI_LABEL: Record<number, { l: string; c: string }> = {
  5: { l: '🔴 KRİTİK', c: 'text-red-400' },
  4: { l: '🟠 YÜKSEK',  c: 'text-orange-400' },
  3: { l: '🟡 ORTA',   c: 'text-yellow-400' },
  2: { l: '🟢 NORMAL', c: 'text-green-400' },
  1: { l: '⚪ DÜŞÜK',  c: 'text-slate-400' },
};

export default function JobMonitorPanel() {
  const [jobs,    setJobs]    = useState<QueueJob[]>([]);
  const [stats,   setStats]   = useState<QueueStats | null>(null);
  const [filter,  setFilter]  = useState<string>('TUMU');
  const [detail,  setDetail]  = useState<QueueJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick,    setTick]    = useState(0);

  const [error,   setError]   = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res  = await fetchWithTimeout('/api/jobs', undefined, 10_000);
      const data = await res.json() as { success: boolean; jobs: QueueJob[]; stats: QueueStats };
      if (data.success) { setJobs(data.jobs); setStats(data.stats); setError(null); }
    } catch (err) {
      const errMsg = err instanceof DOMException && err.name === 'AbortError'
        ? 'Bağlantı zaman aşımı (10s)'
        : 'Sunucu bağlantısı yok';
      setError(errMsg);
      
      // ALARM TETİKLE
      fetch('/api/alarms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modul: 'JOB_MONITOR',
          baslik: 'Kuyruk Bağlantı Hatası',
          aciklama: errMsg,
          seviye: 'CRITICAL'
        })
      }).catch(console.error);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void fetchJobs();
    const iv = setInterval(() => { void fetchJobs(); setTick(t => t + 1); }, 5_000);
    return () => clearInterval(iv);
  }, [fetchJobs]);

  const filtreliJobs = filter === 'TUMU'
    ? jobs
    : jobs.filter(j => j.status === filter || j.agent_katman === filter);

  if (loading) return (
    <div className="flex items-center gap-2 justify-center py-10">
      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
      <span className="text-[9px] font-mono text-indigo-400 tracking-[0.2em]">İŞ KUYRUĞU YÜKLENİYOR...</span>
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 py-6 justify-center">
      <div className="w-2 h-2 rounded-full bg-red-400" />
      <span className="text-[10px] font-mono text-red-400">{error}</span>
      <button onClick={() => void fetchJobs()} className="text-[9px] font-bold text-cyan-400 underline ml-2 hover:text-cyan-300">TEKRAR DENE</button>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* ── Başlık ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <div>
            <div className="text-[10px] font-black tracking-[0.2em] uppercase text-indigo-400">JOB MONITOR</div>
            <div className="text-[8px] font-mono text-slate-500">5sn oto-yenileme • tick:{tick}</div>
          </div>
        </div>

        {/* İstatistik */}
        {stats && (
          <div className="ml-auto flex gap-2 flex-wrap">
            {[
              { l: 'TOPLAM',  v: stats.toplam,       c: 'text-white'       },
              { l: 'TAMAM',   v: stats.tamamlandi,   c: 'text-green-400'   },
              { l: 'HATA',    v: stats.hata,          c: 'text-red-400'     },
              { l: 'BAşARI',  v: `${stats.basari_orani}%`, c: 'text-cyan-400' },
              { l: 'ORT.SÜR', v: `${stats.ort_sure_ms}ms`, c: 'text-amber-400' },
            ].map(s => (
              <div key={s.l} className="rounded-lg border border-slate-700/30 bg-slate-900/50 px-2.5 py-1.5 text-center min-w-[48px]">
                <div className={`text-sm font-black font-mono ${s.c}`}>{s.v}</div>
                <div className="text-[7px] text-slate-600 tracking-wider">{s.l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Başarı Çubuğu ─────────────────────────────────── */}
      {stats && stats.toplam > 0 && (
        <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-cyan-500 transition-all duration-700 rounded-full"
            style={{ width: `${stats.basari_orani}%` }}
          />
        </div>
      )}

      {/* ── Filtreler ────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {['TUMU', 'tamamlandi', 'isleniyor', 'hata', 'reddedildi', 'KOMUTA', 'L1', 'L2', 'L3'].map(f => {
          const isStatus = ['tamamlandi', 'isleniyor', 'hata', 'reddedildi'].includes(f);
          const cfg = isStatus ? STATUS_CFG[f as keyof typeof STATUS_CFG] : null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[8px] font-black tracking-[0.1em] px-2.5 py-1 rounded-lg border transition-all ${
                filter === f
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400'
                  : 'bg-slate-900/30 border-slate-700/20 text-slate-500 hover:border-slate-600/40'
              }`}
            >
              {f === 'TUMU' ? `TÜMÜ (${jobs.length})` : cfg
                ? `${cfg.label} (${jobs.filter(j => j.status === f).length})`
                : `${f} (${jobs.filter(j => j.agent_katman === f).length})`
              }
            </button>
          );
        })}
        <button
          onClick={() => void fetchJobs()}
          className="ml-auto text-[8px] font-black text-slate-500 hover:text-cyan-400 transition-colors tracking-wider"
        >
          ⟳ YENİLE
        </button>
      </div>

      {/* ── İş Listesi ───────────────────────────────────── */}
      <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
        {filtreliJobs.length === 0 && (
          <div className="text-center py-10 text-slate-600 text-xs font-mono italic">
            {jobs.length === 0 ? 'Henüz iş yok. OTO GÖREV ile çalıştır.' : 'Filtre eşleşmedi.'}
          </div>
        )}

        {filtreliJobs.map(job => {
          const sc  = STATUS_CFG[job.status] ?? STATUS_CFG.bekliyor;
          const kc  = KATMAN_COLOR[job.agent_katman] ?? 'text-slate-400';
          const pri = PRI_LABEL[job.priority] ?? PRI_LABEL[2]!;
          const isSelected = detail?.job_id === job.job_id;

          return (
            <div key={job.job_id}>
              <div
                onClick={() => setDetail(isSelected ? null : job)}
                className={`rounded-lg border px-3 py-2.5 cursor-pointer transition-all ${sc.border} ${sc.bg} hover:brightness-110`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Durum dot */}
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot} ${job.status === 'isleniyor' ? 'animate-pulse' : ''}`} />

                  {/* Job ID + Ajan */}
                  <span className="text-[8px] font-mono text-slate-600 flex-shrink-0">{job.job_id.slice(-12)}</span>
                  <span className={`text-[9px] font-black ${kc} flex-shrink-0`}>{job.agent_kod_adi}</span>
                  <span className="text-[7px] text-slate-600">[{job.agent_katman}]</span>

                  {/* Görev özeti */}
                  <span className="text-[9px] font-mono text-slate-400 truncate flex-1 min-w-[80px]">
                    {job.task.slice(0, 60)}{job.task.length > 60 ? '…' : ''}
                  </span>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[7px] font-black ${pri.c}`}>{pri.l}</span>
                    {job.duration_ms != null && (
                      <span className="text-[7px] font-mono text-slate-600">{job.duration_ms}ms</span>
                    )}
                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border ${sc.border} ${sc.text}`}>
                      {sc.label}
                    </span>
                  </div>
                </div>

                {/* Detay alanı */}
                {isSelected && (
                  <div className="mt-3 space-y-2 border-t border-slate-700/30 pt-3">
                    <div className="grid grid-cols-2 gap-2 text-[8px] font-mono text-slate-500">
                      <span>Başlangıç: {new Date(job.created_at).toLocaleTimeString('tr-TR')}</span>
                      {job.completed_at && <span>Bitiş: {new Date(job.completed_at).toLocaleTimeString('tr-TR')}</span>}
                      <span>Ajan ID: {job.agent_id}</span>
                      <span>Öncelik: {job.priority}</span>
                    </div>
                    <div className="text-[8px] font-mono text-slate-400 bg-slate-950/50 rounded p-2 border border-slate-800/50">
                      <div className="text-slate-600 mb-1">GÖREV:</div>
                      {job.task}
                    </div>
                    {job.result && (
                      <div className="text-[8px] font-mono text-slate-400 bg-slate-950/50 rounded p-2 border border-slate-800/50 max-h-28 overflow-y-auto">
                        <div className="text-green-600 mb-1">SONUÇ:</div>
                        {job.result}
                      </div>
                    )}
                    {job.error && (
                      <div className="text-[8px] font-mono text-red-400 bg-red-950/30 rounded p-2 border border-red-800/30">
                        <div className="text-red-600 mb-1">HATA:</div>
                        {job.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
