"use client";
// ============================================================
// AGENT PANEL — 50 KİŞİLİK AJAN KOMUTA EKRANI
// SCR-10 | Katman: KOMUTA → L1 → L2 → L3 → DESTEK
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

type AgentStatus = 'aktif' | 'pasif' | 'bakimda' | 'egitimde' | 'devre_disi';
type AgentTier   = 'KOMUTA' | 'L1' | 'L2' | 'L3' | 'DESTEK';

interface AgentCard {
  id: string;
  kod_adi: string;
  rol: string;
  katman: AgentTier;
  beceri_listesi: string[];
  durum: AgentStatus;
  tamamlanan_gorev: number;
  hata_sayisi: number;
  son_aktif: string;
}

interface AgentStats {
  toplam: number;
  komuta: number;
  ajan: number;
  aktif: number;
  pasif: number;
  toplamGorev: number;
  toplamHata: number;
  katmanDagilimi: Record<AgentTier, number>;
}

// ── TEMA KONFİGÜRASYONU ──────────────────────────────────────

const TIER_CONFIG: Record<AgentTier, {
  label: string; icon: string;
  border: string; text: string; bg: string; glow: string;
}> = {
  KOMUTA: { label: 'KOMUTA KADROSU', icon: '★', border: 'border-amber-500/40',  text: 'text-amber-400',  bg: 'bg-amber-500/10',  glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]' },
  L1:     { label: 'L1 İCRAATÇILAR', icon: '◈', border: 'border-cyan-500/30',   text: 'text-cyan-400',   bg: 'bg-cyan-500/10',   glow: 'shadow-[0_0_10px_rgba(6,182,212,0.15)]' },
  L2:     { label: 'L2 DENETÇİLER',  icon: '◇', border: 'border-blue-500/30',   text: 'text-blue-400',   bg: 'bg-blue-500/10',   glow: 'shadow-[0_0_10px_rgba(59,130,246,0.15)]' },
  L3:     { label: 'L3 HAKEMLER',    icon: '◎', border: 'border-purple-500/30', text: 'text-purple-400', bg: 'bg-purple-500/10', glow: 'shadow-[0_0_10px_rgba(168,85,247,0.15)]' },
  DESTEK: { label: 'DESTEK UZMANLAR',icon: '▣', border: 'border-green-500/30',  text: 'text-green-400',  bg: 'bg-green-500/10',  glow: 'shadow-[0_0_10px_rgba(34,197,94,0.15)]' },
};

const STATUS_CONFIG: Record<AgentStatus, { dot: string; text: string; label: string; pulse: boolean }> = {
  aktif:       { dot: 'bg-green-400',  text: 'text-green-400',  label: 'AKTİF',    pulse: true  },
  pasif:       { dot: 'bg-slate-600',  text: 'text-slate-500',  label: 'PASİF',    pulse: false },
  bakimda:     { dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'BAKIM',    pulse: true  },
  egitimde:    { dot: 'bg-blue-400',   text: 'text-blue-400',   label: 'EĞİTİM',  pulse: true  },
  devre_disi:  { dot: 'bg-red-500',    text: 'text-red-400',    label: 'DIŞI',     pulse: false },
};

// ── ANA BİLEŞEN ──────────────────────────────────────────────

export default function AgentPanel() {
  const [agents,        setAgents]        = useState<AgentCard[]>([]);
  const [stats,         setStats]         = useState<AgentStats | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentCard | null>(null);
  const [taskText,      setTaskText]      = useState('');
  const [assigning,     setAssigning]     = useState(false);
  const [activeFilter,  setActiveFilter]  = useState<AgentTier | 'TUMU'>('TUMU');
  const [autoGorev,     setAutoGorev]     = useState('');
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [assignResult,  setAssignResult]  = useState<{
    success      : boolean;
    message      : string;
    ajan        ?: string;
    gerekce     ?: string;
    iterasyon   ?: number;
    araclar     ?: string[];
    result      ?: string;
    l2_denetim  ?: { durum: string; ozet: string; kod_adi: string; duration_ms: number };
  } | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagData, setDiagData] = useState<any>(null);
  const [bootLoading, setBootLoading] = useState(false);
  const [messagesCount, setMessagesCount] = useState<number>(0);

  // ── VERİ ÇEK ───────────────────────────────────────────────
  const fetchAgents = useCallback(async () => {
    try {
      const res  = await fetchWithTimeout('/api/agents', undefined, 10_000);
      const data = await res.json() as { success: boolean; agents: AgentCard[]; stats: AgentStats };
      if (data.success) {
        setAgents(data.agents);
        setStats(data.stats);
        setError(null);
      } else {
        setError('Ajan verisi alınamadı');
      }
    } catch (err) {
      setError(err instanceof DOMException && err.name === 'AbortError'
        ? 'Bağlantı zaman aşımı (10s)'
        : 'Sunucu bağlantısı yok');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 30_000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  // ── GÖREV ATAR (Orchestrator üzerinden) ─────────────────────
  const handleAssignTask = useCallback(async () => {
    if (!selectedAgent || !taskText.trim()) return;
    setAssigning(true);
    setAssignResult(null);
    try {
      const res  = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gorev: taskText.trim(), ajan_id: selectedAgent.id }),
      });
      const data = await res.json() as {
        success: boolean; message?: string;
        atanan_ajan?: string; atama_gerekce?: string;
        worker?: {
          iterasyon?: number; arac_kullandi?: string[]; result?: string;
          l2_denetim?: { durum: string; ozet: string; kod_adi: string; duration_ms: number };
        };
      };
      setAssignResult({
        success    : data.success,
        message    : data.message ?? (data.success ? 'Görev tamamlandı.' : 'Atama başarısız.'),
        ajan       : data.atanan_ajan,
        gerekce    : data.atama_gerekce,
        iterasyon  : data.worker?.iterasyon,
        araclar    : data.worker?.arac_kullandi,
        result     : data.worker?.result?.slice(0, 600),
        l2_denetim : data.worker?.l2_denetim,
      });
      if (data.success) { setTaskText(''); void fetchAgents(); }
    } catch {
      setAssignResult({ success: false, message: 'Bağlantı hatası' });
    } finally {
      setAssigning(false);
    }
  }, [selectedAgent, taskText, fetchAgents]);

  // ── OTO GÖREV (Ajan seçmeden — sistem yönlendirir) ───────────
  const handleAutoGorev = useCallback(async () => {
    if (!autoGorev.trim()) return;
    setAutoAssigning(true);
    setAssignResult(null);
    try {
      const res  = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gorev: autoGorev.trim() }),
      });
      const data = await res.json() as {
        success: boolean; message?: string;
        atanan_ajan?: string; atama_gerekce?: string;
        worker?: {
          iterasyon?: number; arac_kullandi?: string[]; result?: string;
          l2_denetim?: { durum: string; ozet: string; kod_adi: string; duration_ms: number };
        };
      };
      setAssignResult({
        success    : data.success,
        message    : data.message ?? (data.success ? 'Görev tamamlandı.' : 'Hata.'),
        ajan       : data.atanan_ajan,
        gerekce    : data.atama_gerekce,
        iterasyon  : data.worker?.iterasyon,
        araclar    : data.worker?.arac_kullandi,
        result     : data.worker?.result?.slice(0, 600),
        l2_denetim : data.worker?.l2_denetim,
      });
      if (data.success) { setAutoGorev(''); void fetchAgents(); }
    } catch {
      setAssignResult({ success: false, message: 'Bağlantı hatası' });
    } finally {
      setAutoAssigning(false);
    }
  }, [autoGorev, fetchAgents]);

  // ── DIAGNOSTICS ───────────────────────────────────────
  const fetchDiagnostics = useCallback(async () => {
    setDiagLoading(true);
    setDiagData(null);
    try {
      const res = await fetch('/api/diagnostics');
      const data = await res.json();
      setDiagData(data);
    } catch (e) {
      setDiagData({ success: false, error: String(e) });
    } finally {
      setDiagLoading(false);
    }
  }, []);

  // ── DEV BOOTSTRAP — Force registry reload ──────────────
  const runDevBootstrap = useCallback(async () => {
    setBootLoading(true);
    try {
      const res = await fetch('/api/bootstrap/dev', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data?.success) {
        void fetchAgents();
      }
      setAssignResult({ success: !!data?.success, message: data?.success ? 'Bootstrap tamamlandı' : (data?.error ?? 'Bootstrap hata') });
    } catch (e) {
      setAssignResult({ success: false, message: String(e) });
    } finally {
      setBootLoading(false);
    }
  }, [fetchAgents]);

  // ── HUB POLLING (mesaj sayısı) ─────────────────────────
  const fetchMessagesCount = useCallback(async () => {
    try {
      const res = await fetch('/api/hub/messages');
      const data = await res.json();
      if (data?.success && Array.isArray(data.messages)) setMessagesCount(data.messages.length);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void fetchMessagesCount();
    const iv = setInterval(() => void fetchMessagesCount(), 10_000);
    return () => clearInterval(iv);
  }, [fetchMessagesCount]);

  // ── YARDIMCILAR ────────────────────────────────────────────
  const visibleAgents = activeFilter === 'TUMU' ? agents : agents.filter(a => a.katman === activeFilter);
  const agentsByTier  = (tier: AgentTier) => visibleAgents.filter(a => a.katman === tier);
  const tiersToShow   = activeFilter === 'TUMU'
    ? (['KOMUTA', 'L1', 'L2', 'L3', 'DESTEK'] as AgentTier[])
    : [activeFilter];

  // ── YÜKLEME ────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-10 gap-3">
      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
      <span className="text-[10px] font-mono text-cyan-400 tracking-[0.3em] animate-pulse">
        AJAN KADROSU YÜKLENİYOR...
      </span>
    </div>
  );

  if (error) return (
    <div className="flex items-center gap-2 py-6 justify-center">
      <div className="w-2 h-2 rounded-full bg-red-400" />
      <span className="text-[10px] font-mono text-red-400">{error}</span>
      <button onClick={fetchAgents} className="text-[9px] font-bold text-cyan-400 underline ml-2 hover:text-cyan-300">TEKRAR DENE</button>
    </div>
  );

  return (
    <div className="space-y-4" id="agent-panel-root">

      {/* ── İSTATİSTİK BARI ────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { label: 'TOPLAM', value: stats.toplam,      col: 'text-white'         },
            { label: 'AKTİF',  value: stats.aktif,       col: 'text-green-400'     },
            { label: 'PASSİF', value: stats.pasif,       col: 'text-slate-400'     },
            { label: 'KOMUTA', value: stats.komuta,      col: 'text-amber-400'     },
            { label: 'GÖREV',  value: stats.toplamGorev, col: 'text-cyan-400'      },
            { label: 'HATA',   value: stats.toplamHata,  col: 'text-red-400'       },
          ].map(s => (
            <div key={s.label} className="glass-card p-3 border border-slate-700/30 text-center hover:border-slate-600/40 transition-colors">
              <div className={`text-2xl font-black font-mono ${s.col}`}>{s.value}</div>
              <div className="text-[7px] font-bold tracking-[0.2em] text-slate-500 uppercase mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── KATMAN FİLTRE BARI ─────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {(['TUMU', 'KOMUTA', 'L1', 'L2', 'L3', 'DESTEK'] as const).map(f => {
          const cfg  = f === 'TUMU' ? null : TIER_CONFIG[f];
          const isOn = activeFilter === f;
          return (
            <button
              key={f}
              id={`agent-filter-${f}`}
              onClick={() => setActiveFilter(f)}
              className={`
                text-[9px] font-black tracking-[0.15em] uppercase px-3 py-1.5 rounded-lg border transition-all duration-200
                ${isOn
                  ? (cfg ? `${cfg.bg} ${cfg.text} ${cfg.border}` : 'bg-white/10 text-white border-white/20')
                  : 'bg-slate-900/40 text-slate-500 border-slate-700/30 hover:border-slate-600/40 hover:text-slate-400'
                }
              `}
            >
              {f === 'TUMU' ? `TÜMÜ (${agents.length})` : `${f} (${stats?.katmanDagilimi[f] ?? 0})`}
            </button>
          );
        })}
      </div>
        {/* ── HIZLI KONTROLLER: BOOT / DIAGNOSTICS ─────────────── */}
        <div className="glass-card border border-slate-700/30 p-3 flex items-center gap-2">
          {process.env.NODE_ENV === 'development' && (
          <button
            id="boot-agents-btn"
            onClick={() => void runDevBootstrap()}
            disabled={bootLoading}
            className="px-3 py-1 text-[9px] font-black uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg hover:bg-amber-500/20 disabled:opacity-40"
          >
            {bootLoading ? '⟳' : 'BOOT AGENTS'}
          </button>
          )}

          <button
            id="diagnostics-btn"
            onClick={() => void fetchDiagnostics()}
            disabled={diagLoading}
            className="px-3 py-1 text-[9px] font-black uppercase bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500/20 disabled:opacity-40"
          >
            {diagLoading ? '⟳' : 'DIAGNOSTICS'}
          </button>

          <div className="ml-auto text-[8px] font-mono text-slate-500">
            {diagData ? (diagData.success ? `Agents:${diagData.stats?.toplam ?? diagData.agents_count}` : 'Diag: hata') : 'Durum: bekliyor'}
            <span className="mx-2">|</span>
            <span className="text-[8px]">Mesajlar: {messagesCount}</span>
          </div>
        </div>

        {/* ── OTO GÖREV — Orchestrator Direkt ───────────────────── */}
      <div className="glass-card border border-cyan-500/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-cyan-400 text-sm">⚡</span>
          <span className="text-[9px] font-black tracking-[0.2em] text-cyan-400 uppercase">OTO GÖREV — Sistem Doğru Ajana Yönlendirir</span>
        </div>
        <div className="flex gap-2">
          <input
            id="auto-gorev-input"
            value={autoGorev}
            onChange={e => setAutoGorev(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !autoAssigning) void handleAutoGorev(); }}
            placeholder="Görevi yaz — sistem doğru ajana atar (ör: veritabanını kontrol et, frontend tasarla...)"
            className="flex-1 bg-slate-950/80 border border-cyan-500/20 rounded-lg px-3 py-2 text-[10px] font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 transition-colors"
          />
          <button
            id="auto-gorev-submit"
            onClick={() => void handleAutoGorev()}
            disabled={autoAssigning || !autoGorev.trim()}
            className="px-5 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-lg text-[9px] font-black tracking-[0.15em] uppercase hover:bg-cyan-500/20 transition-all disabled:opacity-40 whitespace-nowrap"
          >
            {autoAssigning ? '⟳' : '▶ ÇALIŞTIR'}
          </button>
        </div>
      </div>

      {/* ── GÖREV ATAMA FORMU ──────────────────────────────── */}
      {selectedAgent && (
        <div className="glass-card border border-amber-500/40 p-4 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-base">★</span>
              <div>
                <span className="text-[9px] font-black tracking-[0.2em] text-amber-400 uppercase">GÖREV ATANIYOR →</span>
                <span className="text-[10px] font-mono text-white ml-2 font-bold">{selectedAgent.id} / {selectedAgent.kod_adi}</span>
              </div>
            </div>
            <button
              id="agent-task-close"
              onClick={() => { setSelectedAgent(null); setTaskText(''); setAssignResult(null); }}
              className="text-slate-500 hover:text-white text-xl transition-colors w-7 h-7 flex items-center justify-center rounded hover:bg-slate-700/30"
            >
              ×
            </button>
          </div>
          <p className="text-[8px] font-mono text-slate-500 mb-3 line-clamp-1">ROL: {selectedAgent.rol}</p>
          <div className="flex gap-2">
            <input
              id="agent-task-input"
              value={taskText}
              onChange={e => setTaskText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !assigning) void handleAssignTask(); }}
              placeholder="Görevi yaz — bu ajan çalıştıracak..."
              className="flex-1 bg-slate-950/80 border border-slate-700/50 rounded-lg px-3 py-2 text-[10px] font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
            <button
              id="agent-task-submit"
              onClick={() => void handleAssignTask()}
              disabled={assigning || !taskText.trim()}
              className="px-5 py-2 bg-amber-500/10 border border-amber-500/40 text-amber-400 rounded-lg text-[9px] font-black tracking-[0.15em] uppercase hover:bg-amber-500/20 transition-all disabled:opacity-40 whitespace-nowrap"
            >
              {assigning ? '⟳' : 'EMİR VER'}
            </button>
          </div>
        </div>
      )}

      {/* ── GÖREV SONUCU ────────────────────────────────────── */}
      {assignResult && (
        <div className={`glass-card border p-4 ${
          assignResult.success ? 'border-green-500/30' : 'border-red-500/30'
        }`}>
          <div className={`flex items-center gap-2 mb-2 text-[9px] font-black tracking-wider uppercase ${
            assignResult.success ? 'text-green-400' : 'text-red-400'
          }`}>
            <span>{assignResult.success ? '✓ GÖREV TAMAMLANDI' : '✕ HATA'}</span>
            {assignResult.ajan && <span className="text-slate-500">→ {assignResult.ajan}</span>}
          </div>
          {assignResult.gerekce && (
            <p className="text-[8px] font-mono text-slate-500 mb-2">📍 {assignResult.gerekce}</p>
          )}
          <div className="flex gap-3 mb-2">
            {assignResult.iterasyon !== undefined && (
              <span className="text-[8px] font-mono text-cyan-400">⟳ {assignResult.iterasyon} iterasyon</span>
            )}
            {assignResult.araclar && assignResult.araclar.length > 0 && (
              <span className="text-[8px] font-mono text-amber-400">🔧 {assignResult.araclar.join(', ')}</span>
            )}
          </div>
          {assignResult.result && (
            <pre className="text-[8px] font-mono text-slate-400 whitespace-pre-wrap leading-relaxed bg-slate-950/60 rounded p-2 max-h-48 overflow-y-auto border border-slate-800/50">
              {assignResult.result}
            </pre>
          )}
          {!assignResult.result && (
            <p className="text-[9px] font-mono text-slate-400">{assignResult.message}</p>
          )}

          {/* L2 OTOMATİK DENETİM SONUCU */}
          {assignResult.l2_denetim && (
            <div className={`mt-3 rounded-lg border px-3 py-2.5 ${
              assignResult.l2_denetim.durum === 'ONAYLANDI'
                ? 'border-blue-500/30 bg-blue-500/5'
                : assignResult.l2_denetim.durum === 'HATA_VAR'
                ? 'border-red-500/30 bg-red-500/5'
                : 'border-slate-700/30 bg-slate-900/30'
            }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[8px] font-black tracking-[0.15em] text-blue-400 uppercase">◇ L2 OTOMATİK DENETİM</span>
                <span className={`text-[7px] font-black px-2 py-0.5 rounded border ${
                  assignResult.l2_denetim.durum === 'ONAYLANDI' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                  assignResult.l2_denetim.durum === 'HATA_VAR'  ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                                                                   'text-slate-400 border-slate-600/30'
                }`}>
                  {assignResult.l2_denetim.durum}
                </span>
                <span className="text-[7px] font-mono text-slate-600 ml-auto">{assignResult.l2_denetim.kod_adi} • {assignResult.l2_denetim.duration_ms}ms</span>
              </div>
              <p className="text-[8px] font-mono text-slate-400 leading-relaxed">
                {assignResult.l2_denetim.ozet}
              </p>
            </div>
          )}

          <button
            onClick={() => setAssignResult(null)}
            className="mt-2 text-[8px] text-slate-600 hover:text-slate-400 font-mono"
          >KAPAT ×</button>
        </div>
      )}

      {/* ── AJAN KARTLARI — KATMAN BAZLI ───────────────────── */}
      {tiersToShow.map(tier => {
        const tierAgents = agentsByTier(tier);
        if (tierAgents.length === 0) return null;
        const cfg = TIER_CONFIG[tier];
        return (
          <div key={tier}>
            {/* Katman Başlığı */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className={`text-base ${cfg.text}`}>{cfg.icon}</span>
              <span className={`text-[9px] font-black tracking-[0.25em] uppercase ${cfg.text}`}>{cfg.label}</span>
              <div className={`h-px flex-1 ${cfg.border.replace('border-', 'bg-').replace('/30', '/20').replace('/40', '/20')}`} />
              <span className="text-[8px] font-mono text-slate-600">{tierAgents.length} AJAN</span>
            </div>

            {/* Kartlar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {tierAgents.map(agent => {
                const sc = STATUS_CONFIG[agent.durum] ?? STATUS_CONFIG.pasif;
                const isSelected = selectedAgent?.id === agent.id;
                return (
                  <div
                    key={agent.id}
                    id={`agent-card-${agent.id}`}
                    className={`
                      glass-card p-3 border transition-all duration-300
                      ${isSelected ? `${cfg.border} ${cfg.glow}` : 'border-slate-700/30 hover:border-slate-600/50'}
                    `}
                  >
                    {/* Kart Üst */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                          {agent.id}
                        </span>
                        <div className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${sc.pulse ? 'animate-pulse' : ''}`} />
                      </div>
                      <span className={`text-[7px] font-bold tracking-wider ${sc.text}`}>{sc.label}</span>
                    </div>

                    {/* Ajan Adı */}
                    <div className={`text-[11px] font-black tracking-wide mb-1 ${cfg.text}`}>{agent.kod_adi}</div>

                    {/* Rol */}
                    <p className="text-[8px] font-mono text-slate-500 leading-relaxed mb-2 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {agent.rol.split(' — ')[0]}
                    </p>

                    {/* Alt Bar */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2.5">
                        <span className="text-[8px] font-mono text-green-400 font-bold">✓{agent.tamamlanan_gorev}</span>
                        <span className="text-[8px] font-mono text-red-400 font-bold">✗{agent.hata_sayisi}</span>
                      </div>
                      <button
                        id={`agent-task-btn-${agent.id}`}
                        onClick={() => {
                          setSelectedAgent(isSelected ? null : agent);
                          setTaskText('');
                          setAssignResult(null);
                        }}
                        className={`
                          text-[7px] font-black px-2 py-1 rounded border tracking-wider uppercase transition-all duration-200
                          ${isSelected
                            ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                            : `bg-slate-800/50 text-slate-400 border-slate-700/30 hover:${cfg.bg} hover:${cfg.text} hover:${cfg.border}`
                          }
                        `}
                      >
                        {isSelected ? 'KAPAT' : 'EMİR VER'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── ALT BİLGİ ──────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
        <span className="text-[8px] font-mono text-slate-600">
          SON GÜNCELLEME: {new Date().toLocaleTimeString('tr-TR')} | 30s oto-yenileme
        </span>
        <button
          id="agent-panel-refresh"
          onClick={fetchAgents}
          className="text-[8px] font-bold text-cyan-400/60 hover:text-cyan-400 transition-colors tracking-wider uppercase"
        >
          ⟳ YENİLE
        </button>
      </div>
    </div>
  );
}
