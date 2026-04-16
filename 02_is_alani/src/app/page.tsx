
"use client";
import { useEffect, useState, useCallback } from 'react';
import { fetchTasksFromDB, subscribeToTasks } from '@/services/taskService';
import { useTaskStore } from '@/store/useTaskStore';
import { useLanguageStore } from '@/store/useLanguageStore';
import { supabase } from '@/lib/supabase';
import { ERR, processError } from '@/lib/errorCore';
import { handleError } from '@/lib/errorHandler';
import { t } from '@/lib/i18n';
import TaskForm from '@/components/TaskForm';
import TaskCard from '@/components/TaskCard';
import TaskBoard from '@/components/TaskBoard';
import Stats from '@/components/Stats';
import AuditLog from '@/components/AuditLog';
import BoardPanel from '@/components/BoardPanel';
import HealthDashboard from '@/components/HealthDashboard';
import L2Panel from '@/components/L2Panel';
import SelfLearningPanel from '@/components/SelfLearningPanel';
import AlarmPanel from '@/components/AlarmPanel';
import TelegramSender from '@/components/TelegramSender';
import { exportSystemData } from '@/services/exportService';
import { toast } from 'sonner';
import AgentPanel from '@/components/AgentPanel';
import KnowledgeBasePanel from '@/components/KnowledgeBasePanel';
import ShieldPanel from '@/components/ShieldPanel';
import ActivityFeed from '@/components/ActivityFeed';
import LiveMetrics from '@/components/LiveMetrics';

// ============================================================
// KARARGAH PANİLİ — 14 EKRANLI FÜTÜRİSTİK KOMUTA MERKEZİ
// ============================================================
// Ekran 01: SİSTEM SAĞLİK       — HealthDashboard
// Ekran 02: OPS İSTATİSTİK      — Stats
// Ekran 03: GÖREV PANOSU       — TaskBoard (Kanban)
// Ekran 04: YÖNETİM KURULU     — BoardPanel (Konsensüs)
// Ekran 05: L2 DENETİM         — L2Panel (Özerk Doğrulama)
// Ekran 06: G-8 ÖĞRENME        — SelfLearningPanel (Pattern)
// Ekran 07: ALARM MERKEZİ      — AlarmPanel
// Ekran 08: TELEGRAM KÖPRÜSÜ   — TelegramSender
// Ekran 09: DENETİM GÜNLÜĞÜ    — AuditLog
// Ekran 10: AJAN KADROSU       — AgentPanel
// Ekran 11: BİLGİ TABANI       — KnowledgeBasePanel (RAG)
// Ekran 12: AKTİVİTE AKIŞI     — ActivityFeed (Ajan Canlı Akış)
// Ekran 13: CANLI METRİKLER    — LiveMetrics (Radial Gauge)
// Ekran 14: SİSTEM KALKAN      — ShieldPanel (Circuit Breaker + Audit Zinciri)
// ============================================================

// ── EKRAN META VERİSİ ────────────────────────────────────────
const HQ_SCREENS = [
  { id: 'SCR-01', label: 'SİSTEM SAĞLIK', icon: '◈', color: 'cyan', status: 'AKTİF' },
  { id: 'SCR-02', label: 'OPS İSTATİSTİK', icon: '◇', color: 'blue', status: 'AKTİF' },
  { id: 'SCR-03', label: 'GÖREV PANOSU', icon: '▣', color: 'purple', status: 'AKTİF' },
  { id: 'SCR-04', label: 'YÖNETİM KURULU', icon: '◎', color: 'amber', status: 'AKTİF' },
  { id: 'SCR-05', label: 'L2 DENETİM', icon: '⬡', color: 'green', status: 'AKTİF' },
  { id: 'SCR-06', label: 'G-8 ÖĞRENME', icon: '◉', color: 'purple', status: 'AKTİF' },
  { id: 'SCR-07', label: 'ALARM MERKEZİ', icon: '△', color: 'red', status: 'AKTİF' },
  { id: 'SCR-08', label: 'TELEGRAM KÖPRÜSÜ', icon: '◆', color: 'blue', status: 'AKTİF' },
  { id: 'SCR-09', label: 'DENETİM GÜNLÜĞÜ', icon: '▤', color: 'cyan',   status: 'AKTİF' },
  { id: 'SCR-10', label: 'AJAN KADROSU',    icon: '◉', color: 'amber',  status: 'AKTİF' },
  { id: 'SCR-11', label: 'BİLGİ TABANI',    icon: '▦', color: 'purple', status: 'AKTİF' },
  { id: 'SCR-12', label: 'AKTİVİTE AKIŞI',  icon: '◈', color: 'cyan',   status: 'AKTİF' },
  { id: 'SCR-13', label: 'CANLI METRİKLER', icon: '◇', color: 'blue',   status: 'AKTİF' },
  { id: 'SCR-14', label: 'SİSTEM KALKAN',   icon: '🛡️', color: 'red',    status: 'AKTİF' },
] as const;

// ── ZAMAN FORMATLAYICI ───────────────────────────────────────
function useSystemClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return time;
}

// ── EKRAN WRAPPER BİLEŞENİ ──────────────────────────────────
function HQScreen({
  screen,
  children,
  isActive,
  onClick,
  isExpanded,
}: {
  screen: typeof HQ_SCREENS[number];
  children: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  isExpanded: boolean;
}) {
  const colorMap: Record<string, { border: string; text: string; bg: string; dot: string; glow: string }> = {
    cyan:   { border: 'border-cyan-500/30',   text: 'text-cyan-400',   bg: 'bg-cyan-500/10',   dot: 'bg-cyan-400',   glow: 'neon-glow-cyan' },
    blue:   { border: 'border-blue-500/30',   text: 'text-blue-400',   bg: 'bg-blue-500/10',   dot: 'bg-blue-400',   glow: 'neon-glow-cyan' },
    purple: { border: 'border-purple-500/30', text: 'text-purple-400', bg: 'bg-purple-500/10', dot: 'bg-purple-400', glow: 'neon-glow-purple' },
    amber:  { border: 'border-amber-500/30',  text: 'text-amber-400',  bg: 'bg-amber-500/10',  dot: 'bg-amber-400',  glow: 'neon-glow-amber' },
    green:  { border: 'border-green-500/30',  text: 'text-green-400',  bg: 'bg-green-500/10',  dot: 'bg-green-400',  glow: 'neon-glow-green' },
    red:    { border: 'border-red-500/30',    text: 'text-red-400',    bg: 'bg-red-500/10',    dot: 'bg-red-400',    glow: 'neon-glow-red' },
  };
  const c = colorMap[screen.color] ?? colorMap.cyan!;

  return (
    <div
      className={`
        hq-screen glass-card cursor-pointer
        transition-all duration-500 ease-out
        ${isExpanded ? 'col-span-3 row-span-2' : ''}
        ${isActive ? `${c.glow} animate-glow-breathe` : 'opacity-80 hover:opacity-100'}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      id={`hq-screen-${screen.id}`}
    >
      {/* ── EKRAN HEADER ──────────────────────────────────────── */}
      <div className="screen-header">
        <div className="flex items-center gap-2.5">
          <span className={`text-lg ${c.text}`}>{screen.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black tracking-[0.2em] uppercase ${c.text}`}>
                {screen.label}
              </span>
            </div>
            <span className="text-[8px] font-mono text-slate-500 tracking-wider">{screen.id}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`screen-header-tag ${c.bg} ${c.text} border ${c.border}`}>
            {screen.status}
          </span>
          <div className={`status-dot ${c.dot}`} />
        </div>
      </div>

      {/* ── EKRAN İÇERİK ─────────────────────────────────────── */}
      <div className={`p-4 ${isExpanded ? '' : 'max-h-[320px] overflow-y-auto'}`}>
        {children}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ANA DASHBOARD BİLEŞENİ
// ══════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { tasks, error, setError } = useTaskStore();
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);
  const systemTime = useSystemClock();
  const [isLocked, setIsLocked] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activeScreen, setActiveScreen] = useState<string | null>(null);
  const [expandedScreen, setExpandedScreen] = useState<string | null>(null);

  // ── FETCH + SUBSCRIBE ─────────────────────────────────────
  useEffect(() => {
    try {
      fetchTasksFromDB();
    } catch (error) {
      processError(ERR.TASK_FETCH, error, { kaynak: 'Dashboard.useEffect', islem: 'INIT_FETCH' });
      setError(`${ERR.TASK_FETCH}: Görev listesi yüklenemedi`);
    }

    let channel: ReturnType<typeof subscribeToTasks> | null = null;
    try {
      channel = subscribeToTasks(() => {
        try {
          fetchTasksFromDB();
        } catch (error) {
          processError(ERR.TASK_FETCH, error, { kaynak: 'Dashboard.realtime_callback', islem: 'REALTIME_FETCH' });
        }
      });
    } catch (error) {
      processError(ERR.TASK_REALTIME, error, { kaynak: 'Dashboard.useEffect', islem: 'SUBSCRIBE' });
    }

    return () => {
      try {
        if (channel) {
          supabase.removeChannel(channel);
        }
      } catch (error) {
        processError(ERR.UNIDENTIFIED_COLLAPSE, error, { kaynak: 'Dashboard.cleanup', islem: 'REMOVE_CHANNEL' }, 'FATAL');
      }
    };
  }, [setError]);

  // ── EXPORT ─────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await exportSystemData();
      toast.success('Sistem başarıyla mühürlendi (JSON)');
    } catch (error) {
      await handleError(ERR.SYSTEM_EXPORT, error, { kaynak: 'Dashboard.handleExport', islem: 'EXPORT' });
    } finally {
      setIsExporting(false);
    }
  }, []);

  // ── EKRAN TOGGLE ──────────────────────────────────────────
  const handleScreenClick = useCallback((screenId: string) => {
    setActiveScreen(screenId);
    setExpandedScreen((prev) => prev === screenId ? null : screenId);
  }, []);

  const systemMetrics = {
    uptime: '99.97%',
    activeNodes: HQ_SCREENS.length,
    totalNodes: HQ_SCREENS.length,
    taskCount: tasks.length,
    criticalAlerts: tasks.filter(t => t.priority === 'kritik' && t.status !== 'tamamlandi').length,
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-57px)]">
      <main className="flex-1 p-4 lg:p-6 max-w-[1920px] mx-auto w-full">

        {/* ══════════════════════════════════════════════════════ */}
        {/* ÜST BAR: KARARGAH BAŞLIK + KONTROLLER                 */}
        {/* ══════════════════════════════════════════════════════ */}
        <header className="mb-6 animate-fade-in-up">
          {/* ── Durum Mühürleri ──────────────────────────────── */}
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="glass-card neon-glow-green px-4 py-2 flex items-center gap-2.5 border border-green-500/30">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-green-400">
                BAĞIMSIZLIK ONAYLANDI
              </span>
            </div>
            <div className="glass-card neon-glow-green px-4 py-2 flex items-center gap-2.5 border border-green-500/30">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-green-400">
                SİSTEM YEREL
              </span>
            </div>
            <div className="glass-card px-4 py-2 flex items-center gap-2.5 border border-cyan-500/20">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-neon" />
              <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-cyan-400">
                UPTIME {systemMetrics.uptime}
              </span>
            </div>
            <div className="glass-card px-4 py-2 flex items-center gap-2.5 border border-slate-500/20 ml-auto">
              <span className="text-[10px] font-mono text-slate-400 tracking-wider">
                {systemTime.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </span>
              <span className="text-[10px] font-mono neon-text-cyan font-bold">
                {systemTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>

          {/* ── Başlık Satırı ─────────────────────────────────── */}
          <div className={`flex justify-between items-end ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
                <span className="neon-text-cyan">KARARGAH</span>
                <span className="text-slate-500 mx-2">|</span>
                <span className="text-slate-300">{tr.dashboardTitle}</span>
              </h1>
              <p className="text-[10px] font-mono text-slate-500 mt-1 tracking-wider">
                {systemMetrics.activeNodes}/{systemMetrics.totalNodes} EKRAN AKTİF
                <span className="text-slate-600 mx-2">•</span>
                {systemMetrics.taskCount} GÖREV
                <span className="text-slate-600 mx-2">•</span>
                {systemMetrics.criticalAlerts} KRİTİK ALARM
              </p>
            </div>
            <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => setIsLocked(!isLocked)}
                className={`
                  text-[10px] font-black px-4 py-2 rounded-lg border transition-all duration-300
                  tracking-[0.15em] uppercase
                  ${isLocked
                    ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 neon-glow-red'
                    : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20 neon-glow-green'
                  }
                `}
              >
                {isLocked ? tr.accessLocked : tr.accessOpen}
              </button>
              {!isLocked && (
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="text-[10px] font-black px-4 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300 tracking-[0.15em] uppercase disabled:opacity-40 neon-glow-cyan"
                >
                  {isExporting ? tr.sealing : tr.sealSystem}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════════ */}
        {/* HATA BANNER                                           */}
        {/* ══════════════════════════════════════════════════════ */}
        {error && (
          <div className="mb-4 glass-card neon-glow-red border border-red-500/30 p-4 flex justify-between items-center animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-red-400">{tr.systemError}</span>
              <span className="text-xs font-mono text-red-300">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 font-bold text-lg transition-colors">×</button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* 9 EKRANLI KARARGAH GRID                               */}
        {/* ══════════════════════════════════════════════════════ */}
        {isLocked ? (
          /* ── KİLİTLİ DURUM: 9 Ekran Haritası (minimap) ─────── */
          <section className="animate-fade-in-up">
            {/* Mini Ekran Grid — Kilit Modunda Tüm Ekranların Özeti */}
            <div className="glass-card p-6 mb-6 border border-slate-700/30">
              <div className="screen-header">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg neon-text-cyan">◈</span>
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase text-cyan-400">
                    KARARGAH EKRAN HARİTASI
                  </span>
                </div>
                <span className="screen-header-tag bg-slate-500/10 text-slate-400 border border-slate-500/30">
                  {HQ_SCREENS.length} EKRAN
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {HQ_SCREENS.map((screen, index) => {
                  const colorMap: Record<string, string> = {
                    cyan: 'border-cyan-500/20 text-cyan-400',
                    blue: 'border-blue-500/20 text-blue-400',
                    purple: 'border-purple-500/20 text-purple-400',
                    amber: 'border-amber-500/20 text-amber-400',
                    green: 'border-green-500/20 text-green-400',
                    red: 'border-red-500/20 text-red-400',
                  };
                  const colorClass = colorMap[screen.color] ?? 'border-cyan-500/20 text-cyan-400';

                  return (
                    <div
                      key={screen.id}
                      className={`
                        relative h-28 rounded-xl border-2 ${colorClass}
                        bg-slate-900/50 hover:bg-slate-800/50
                        flex flex-col items-center justify-center
                        transition-all duration-500 cursor-default
                        group overflow-hidden
                      `}
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      {/* Scan line efekti */}
                      <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent animate-shimmer" style={{ top: '30%' }} />
                      </div>
                      <span className={`text-2xl mb-1 opacity-60 group-hover:opacity-100 transition-opacity ${colorClass.split(' ')[1]}`}>
                        {screen.icon}
                      </span>
                      <span className="text-[9px] font-black tracking-[0.2em] uppercase text-slate-400 group-hover:text-slate-300 transition-colors">
                        {screen.label}
                      </span>
                      <span className="text-[7px] font-mono text-slate-600 mt-0.5">{screen.id}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 21 Kriterli Görev Kutusu */}
            <div className="glass-card p-6 mb-6 border border-slate-700/30">
              <div className="screen-header">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg text-amber-400">📋</span>
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase text-amber-400">
                    21 KRİTERLİ GÖREV PROTOKOLÜ
                  </span>
                </div>
                <span className="screen-header-tag bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  PROTOKOL
                </span>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                {Array.from({ length: 21 }, (_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 border border-slate-700/20 hover:border-amber-500/20 transition-all group"
                  >
                    <div className="w-3.5 h-3.5 rounded border border-slate-600 bg-slate-800/50 group-hover:border-amber-500/40 transition-colors flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-sm bg-slate-600 group-hover:bg-amber-400/60 transition-colors" />
                    </div>
                    <span className="text-[8px] font-bold font-mono text-slate-500 group-hover:text-slate-400 transition-colors">
                      K{String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Kilit Uyarısı */}
            <div className="glass-card p-12 border border-slate-700/20 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 neon-glow-red">
                <span className="text-3xl">🔒</span>
              </div>
              <p className="text-slate-400 font-black tracking-[0.2em] uppercase text-sm mb-1">
                {tr.systemRestricted}
              </p>
              <p className="text-[10px] text-slate-600 font-mono">{tr.unlockHint}</p>
            </div>
          </section>
        ) : (
          /* ═══════════════════════════════════════════════════ */
          /* AKTİF MOD: 9 EKRANLI KARARGAH GRID                 */
          /* ═══════════════════════════════════════════════════ */
          <section className="space-y-4 animate-fade-in-up">

            {/* ── EKRAN 01: SİSTEM SAĞLIK ─────────────────────── */}
            <HQScreen
              screen={HQ_SCREENS[0]!}
              isActive={activeScreen === 'SCR-01'}
              onClick={() => handleScreenClick('SCR-01')}
              isExpanded={expandedScreen === 'SCR-01'}
            >
              <HealthDashboard />
            </HQScreen>

            {/* ── EKRAN 02: OPERASYON İSTATİSTİK ──────────────── */}
            <HQScreen
              screen={HQ_SCREENS[1]!}
              isActive={activeScreen === 'SCR-02'}
              onClick={() => handleScreenClick('SCR-02')}
              isExpanded={expandedScreen === 'SCR-02'}
            >
              <Stats />
            </HQScreen>

            {/* ── EKRAN 03: GÖREV PANOSU ──────────────────────── */}
            <HQScreen
              screen={HQ_SCREENS[2]!}
              isActive={activeScreen === 'SCR-03'}
              onClick={() => handleScreenClick('SCR-03')}
              isExpanded={expandedScreen === 'SCR-03'}
            >
              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-bold text-slate-500 mb-3 tracking-[0.15em] uppercase">{tr.newOrder}</h3>
                  <TaskForm />
                </div>
                <TaskBoard />
                {tasks.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-500 mb-3 tracking-[0.15em] uppercase">{tr.taskSchedule}</h3>
                    <div className="space-y-2">
                      {tasks.map((task) => (
                        <TaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  </div>
                )}
                {tasks.length === 0 && (
                  <p className="text-slate-600 italic text-xs font-mono">{tr.noActiveTasks}</p>
                )}
              </div>
            </HQScreen>

            {/* ── EKRAN 04: YÖNETİM KURULU ────────────────────── */}
            <HQScreen
              screen={HQ_SCREENS[3]!}
              isActive={activeScreen === 'SCR-04'}
              onClick={() => handleScreenClick('SCR-04')}
              isExpanded={expandedScreen === 'SCR-04'}
            >
              <BoardPanel />
            </HQScreen>

            {/* ── EKRAN 05: L2 DENETİM ────────────────────────── */}
            <HQScreen
              screen={HQ_SCREENS[4]!}
              isActive={activeScreen === 'SCR-05'}
              onClick={() => handleScreenClick('SCR-05')}
              isExpanded={expandedScreen === 'SCR-05'}
            >
              <L2Panel />
            </HQScreen>

            {/* ── EKRAN 06: G-8 ÖĞRENME ───────────────────────── */}
            <HQScreen
              screen={HQ_SCREENS[5]!}
              isActive={activeScreen === 'SCR-06'}
              onClick={() => handleScreenClick('SCR-06')}
              isExpanded={expandedScreen === 'SCR-06'}
            >
              <SelfLearningPanel />
            </HQScreen>

            {/* ── EKRAN 07: ALARM MERKEZİ ─────────────────────── */}
            <HQScreen
              screen={HQ_SCREENS[6]!}
              isActive={activeScreen === 'SCR-07'}
              onClick={() => handleScreenClick('SCR-07')}
              isExpanded={expandedScreen === 'SCR-07'}
            >
              <AlarmPanel />
            </HQScreen>

            {/* ── EKRAN 08: TELEGRAM KÖPRÜSÜ ──────────────────── */}
            <HQScreen
              screen={HQ_SCREENS[7]!}
              isActive={activeScreen === 'SCR-08'}
              onClick={() => handleScreenClick('SCR-08')}
              isExpanded={expandedScreen === 'SCR-08'}
            >
              <TelegramSender />
            </HQScreen>

            {/* ── EKRAN 09: DENETİM GÜNLÜĞÜ ──────────────────── */}
            <HQScreen
              screen={HQ_SCREENS[8]!}
              isActive={activeScreen === 'SCR-09'}
              onClick={() => handleScreenClick('SCR-09')}
              isExpanded={expandedScreen === 'SCR-09'}
            >
              <AuditLog />
            </HQScreen>

            {/* ── EKRAN 10: AJAN KADROSU ───────────────────────── */}
            <HQScreen
              screen={HQ_SCREENS[9]!}
              isActive={activeScreen === 'SCR-10'}
              onClick={() => handleScreenClick('SCR-10')}
              isExpanded={expandedScreen === 'SCR-10'}
            >
              <AgentPanel />
            </HQScreen>

            {/* ── EKRAN 11: BİLGİ TABANI ───────────────────────── */}
            <HQScreen
              screen={HQ_SCREENS[10]!}
              isActive={activeScreen === 'SCR-11'}
              onClick={() => handleScreenClick('SCR-11')}
              isExpanded={expandedScreen === 'SCR-11'}
            >
              <KnowledgeBasePanel />
            </HQScreen>

            {/* ── EKRAN 12: AKTİVİTE AKIŞI ─────────────────────── */}
            <HQScreen
              screen={HQ_SCREENS[11]!}
              isActive={activeScreen === 'SCR-12'}
              onClick={() => handleScreenClick('SCR-12')}
              isExpanded={expandedScreen === 'SCR-12'}
            >
              <ActivityFeed />
            </HQScreen>

            {/* ── EKRAN 13: CANLI METRİKLER ────────────────────── */}
            <HQScreen
              screen={HQ_SCREENS[12]!}
              isActive={activeScreen === 'SCR-13'}
              onClick={() => handleScreenClick('SCR-13')}
              isExpanded={expandedScreen === 'SCR-13'}
            >
              <LiveMetrics />
            </HQScreen>

            {/* ── EKRAN 14: SİSTEM KALKAN ──────────────────────── */}
            <HQScreen
              screen={HQ_SCREENS[13]!}
              isActive={activeScreen === 'SCR-14'}
              onClick={() => handleScreenClick('SCR-14')}
              isExpanded={expandedScreen === 'SCR-14'}
            >
              <ShieldPanel />
            </HQScreen>

          </section>
        )}
      </main>

      {/* ── ALT: KARARGAH DURUM ÇUBUĞU ──────────────────────── */}
      <footer className="sticky bottom-0 z-40 glass-card border-t border-cyan-500/10 shadow-[0_-4px_30px_rgba(6,182,212,0.05)]">
        <div className="max-w-[1920px] mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] font-mono text-green-400 tracking-wider">STP OPERASYONEL</span>
            </div>
            <span className="text-[9px] font-mono text-slate-600">|</span>
            <span className="text-[9px] font-mono text-slate-500">
              {systemMetrics.activeNodes} EKRAN
            </span>
            <span className="text-[9px] font-mono text-slate-600">|</span>
            <span className="text-[9px] font-mono text-slate-500">
              {tasks.length} GÖREV
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono text-slate-500 tracking-wider">
              SİSTEM TAKİP PANELİ
            </span>
            <span className="text-[9px] font-mono neon-text-cyan font-bold">
              v2.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
