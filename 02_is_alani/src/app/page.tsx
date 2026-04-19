
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
import PlanningPanel from '@/components/PlanningPanel';
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
import ScreenErrorBoundary from '@/components/ScreenErrorBoundary';
import ActivityFeed from '@/components/ActivityFeed';
import LiveMetrics from '@/components/LiveMetrics';
import SistemKurallariPaneli from '@/components/SistemKurallariPaneli';
import JobMonitorPanel from '@/components/JobMonitorPanel';
import G0ApprovalPanel from '@/components/G0ApprovalPanel';

// ============================================================
// KARARGAH PANÄ°LÄ° â€” 16 EKRANLI FÃœTÃœRÄ°STÄ°K KOMUTA MERKEZÄ°
// ============================================================
// Ekran 01: SÄ°STEM SAÄžLÄ°K       â€” HealthDashboard
// Ekran 02: OPS Ä°STATÄ°STÄ°K      â€” Stats
// Ekran 03: GÃ–REV PANOSU       â€” TaskBoard (Kanban)
// Ekran 04: YÃ–NETÄ°M KURULU     â€” PlanningPanel (Planlama & Atama)
// Ekran 05: L2 DENETÄ°M         â€” L2Panel (Ã–zerk DoÄŸrulama)
// Ekran 06: G-8 Ã–ÄžRENME        â€” SelfLearningPanel (Pattern)
// Ekran 07: ALARM MERKEZÄ°      â€” AlarmPanel
// Ekran 08: TELEGRAM KÃ–PRÃœSÃœ   â€” TelegramSender
// Ekran 09: DENETÄ°M GÃœNLÃœÄžÃœ    â€” AuditLog
// Ekran 10: AJAN KADROSU       â€” AgentPanel
// Ekran 11: BÄ°LGÄ° TABANI       â€” KnowledgeBasePanel (RAG)
// Ekran 12: AKTÄ°VÄ°TE AKIÅžI     â€” ActivityFeed (Ajan CanlÄ± AkÄ±ÅŸ)
// Ekran 13: CANLI METRÄ°KLER    â€” LiveMetrics (Radial Gauge)
// Ekran 14: SÄ°STEM KALKAN      â€” ShieldPanel (Circuit Breaker + Audit Zinciri)
// ============================================================

// â”€â”€ EKRAN META VERÄ°SÄ° â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const HQ_SCREENS = [
  { id: 'SCR-00', label: 'G-0 ONAY AÄžI', icon: 'ğŸ›¡ï¸ ', color: 'amber', status: 'DÄ°KKAT' },
  { id: 'SCR-01', label: 'SÄ°STEM SAÄžLIK', icon: 'â—ˆ', color: 'cyan', status: 'AKTÄ°F' },
  { id: 'SCR-02', label: 'OPS Ä°STATÄ°STÄ°K', icon: 'â—‡', color: 'blue', status: 'AKTÄ°F' },
  { id: 'SCR-03', label: 'GÃ–REV PANOSU', icon: 'â–£', color: 'purple', status: 'AKTÄ°F' },
  { id: 'SCR-04', label: 'YÃ–NETÄ°M KURULU', icon: 'â—Ž', color: 'amber', status: 'AKTÄ°F' },
  { id: 'SCR-05', label: 'L2 DENETÄ°M', icon: 'â¬¡', color: 'green', status: 'AKTÄ°F' },
  { id: 'SCR-06', label: 'G-8 Ã–ÄžRENME', icon: 'â—‰', color: 'purple', status: 'AKTÄ°F' },
  { id: 'SCR-07', label: 'ALARM MERKEZÄ°', icon: 'â–³', color: 'red', status: 'AKTÄ°F' },
  { id: 'SCR-08', label: 'TELEGRAM KÃ–PRÃœSÃœ', icon: 'â—†', color: 'blue', status: 'AKTÄ°F' },
  { id: 'SCR-09', label: 'DENETÄ°M GÃœNLÃœÄžÃœ', icon: 'â–¤', color: 'cyan',   status: 'AKTÄ°F' },
  { id: 'SCR-10', label: 'AJAN KADROSU',    icon: 'â—‰', color: 'amber',  status: 'AKTÄ°F' },
  { id: 'SCR-11', label: 'BÄ°LGÄ° TABANI',    icon: 'â–¦', color: 'purple', status: 'AKTÄ°F' },
  { id: 'SCR-12', label: 'AKTÄ°VÄ°TE AKIÅžI',  icon: 'â—ˆ', color: 'cyan',   status: 'AKTÄ°F' },
  { id: 'SCR-13', label: 'CANLI METRÄ°KLER', icon: 'â—‡', color: 'blue',   status: 'AKTÄ°F' },
  { id: 'SCR-14', label: 'SÄ°STEM KALKAN',   icon: 'ğŸ›¡ï¸ ', color: 'red',    status: 'AKTÄ°F' },
  { id: 'SCR-15', label: 'NÄ°ZAMNAME',        icon: 'ğŸ“™', color: 'purple', status: 'AKTÄ°F' },
  { id: 'SCR-16', label: 'JOB MONITOR',      icon: 'ğŸ“‹', color: 'indigo', status: 'AKTÄ°F' },
] as const;

// â”€â”€ ZAMAN FORMATLAYICI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useSystemClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return time;
}

// â”€â”€ EKRAN WRAPPER BÄ°LEÅžENÄ° â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HQScreen({
  screen,
  children,
  isActive,
  onClick,
  isExpanded,
  isCollapsed,
  onToggleCollapse,
}: {
  screen: typeof HQ_SCREENS[number];
  children: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  isExpanded: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const colorMap: Record<string, { border: string; text: string; bg: string; dot: string; glow: string }> = {
    cyan:   { border: 'border-cyan-500/30',   text: 'text-cyan-400',   bg: 'bg-cyan-500/10',   dot: 'bg-cyan-400',   glow: 'neon-glow-cyan' },
    blue:   { border: 'border-blue-500/30',   text: 'text-blue-400',   bg: 'bg-blue-500/10',   dot: 'bg-blue-400',   glow: 'neon-glow-cyan' },
    purple: { border: 'border-purple-500/30', text: 'text-purple-400', bg: 'bg-purple-500/10', dot: 'bg-purple-400', glow: 'neon-glow-purple' },
    amber:  { border: 'border-amber-500/30',  text: 'text-amber-400',  bg: 'bg-amber-500/10',  dot: 'bg-amber-400',  glow: 'neon-glow-amber' },
    green:  { border: 'border-green-500/30',  text: 'text-green-400',  bg: 'bg-green-500/10',  dot: 'bg-green-400',  glow: 'neon-glow-green' },
    red:    { border: 'border-red-500/30',    text: 'text-red-400',    bg: 'bg-red-500/10',    dot: 'bg-red-400',    glow: 'neon-glow-red' },
    indigo: { border: 'border-indigo-500/30', text: 'text-indigo-400', bg: 'bg-indigo-500/10', dot: 'bg-indigo-400', glow: 'neon-glow-purple' },
  };
  const c = colorMap[screen.color] ?? colorMap.cyan!;

  return (
    <div
      className={`
        hq-screen glass-card
        transition-all duration-500 ease-out
        ${isExpanded ? 'lg:col-span-2' : ''}
        ${isActive ? `${c.glow} animate-glow-breathe` : 'opacity-80 hover:opacity-100'}
      `}
      id={`hq-screen-${screen.id}`}
    >
      {/* â”€â”€ EKRAN HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="screen-header cursor-pointer" onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onClick()}>
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
          {/* â”€â”€ DARALT/GENÄ°ÅžLET BUTONU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
            className={`ml-1 w-6 h-6 flex items-center justify-center rounded-md border transition-all text-[10px] font-bold
              ${isCollapsed
                ? 'border-slate-600 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 bg-slate-800/50'
                : 'border-slate-600 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 bg-slate-800/50'
              }`}
            title={isCollapsed ? 'GeniÅŸlet' : 'Daralt'}
          >
            {isCollapsed ? 'â–¼' : 'â–²'}
          </button>
        </div>
      </div>

      {/* â”€â”€ EKRAN Ä°Ã‡ERÄ°K â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!isCollapsed && (
        <div className={`p-4 ${isExpanded ? '' : 'max-h-[400px] overflow-y-auto'} animate-fade-in-up`}>
          <ScreenErrorBoundary screenId={screen.id}>
            {children}
          </ScreenErrorBoundary>
        </div>
      )}
    </div>
  );
}

// â”€â”€ SÄ°STEM Ã‡EKÄ°RDEÄžÄ° (VÄ°DACILAR) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SystemCore() {
  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 opacity-10">
      <div className="relative w-[600px] h-[600px] flex items-center justify-center">
        {/* BÃ¼yÃ¼k DiÅŸli */}
        <div className="absolute w-full h-full border-[20px] border-dashed border-cyan-500/20 rounded-full animate-gear" />
        {/* Ters DiÅŸli */}
        <div className="absolute w-3/4 h-3/4 border-[15px] border-dotted border-blue-500/20 rounded-full animate-gear-slow" />
        {/* Vidalar / Screws */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <div
            key={deg}
            className="absolute text-2xl text-cyan-400/40 animate-screw"
            style={{
              transform: `rotate(${deg}deg) translateY(-240px)`,
              animationDelay: `${deg * 5}ms`
            }}
          >
            âš™ï¸ 
          </div>
        ))}
        {/* Merkez IÅŸÄ±ma */}
        <div className="w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      </div>
    </div>
  );
}

// â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
// ANA DASHBOARD BÄ°LEÅžENÄ°
// â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
export default function Dashboard() {
  const { tasks, error, setError } = useTaskStore();
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);
  const systemTime = useSystemClock();
  const [isLocked, setIsLocked] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeScreen, setActiveScreen] = useState<string | null>(null);
  const [expandedScreen, setExpandedScreen] = useState<string | null>(null);
  const [collapsedScreens, setCollapsedScreens] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // â”€â”€ PANEL DARALT/GENÄ°ÅžLET â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toggleCollapse = useCallback((screenId: string) => {
    setCollapsedScreens(prev => {
      const next = new Set(prev);
      if (next.has(screenId)) next.delete(screenId);
      else next.add(screenId);
      return next;
    });
  }, []);

  // â”€â”€ SIDEBAR SCROLL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const scrollToScreen = useCallback((screenId: string) => {
    const el = document.getElementById(`hq-screen-${screenId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setActiveScreen(screenId);
  }, []);

  // â”€â”€ FETCH + SUBSCRIBE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    try {
      fetchTasksFromDB();
    } catch (error) {
      processError(ERR.TASK_FETCH, error, { kaynak: 'Dashboard.useEffect', islem: 'INIT_FETCH' });
      setError(`${ERR.TASK_FETCH}: GÃ¶rev listesi yÃ¼klenemedi`);
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

  // â”€â”€ EXPORT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await exportSystemData();
      toast.success('Sistem baÅŸarÄ±yla mÃ¼hÃ¼rlendi (JSON)');
    } catch (error) {
      await handleError(ERR.SYSTEM_EXPORT, error, { kaynak: 'Dashboard.handleExport', islem: 'EXPORT' });
    } finally {
      setIsExporting(false);
    }
  }, []);

  // â”€â”€ EKRAN TOGGLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleScreenClick = useCallback((screenId: string) => {
    setActiveScreen(screenId);
    setExpandedScreen((prev) => prev === screenId ? null : screenId);
  }, []);

  // â”€â”€ CANLI UPTIME HESABI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [uptimeStr, setUptimeStr] = useState('â€”');
  useEffect(() => {
    let mounted = true;
    async function fetchUptime() {
      try {
        const res = await fetch('/api/health-check');
        if (!res.ok) { setUptimeStr('OFFLINE'); return; }
        const data = await res.json();
        // Sunucu baÅŸlangÄ±Ã§ zamanÄ± varsa hesapla
        if (data?.started_at) {
          const startMs = new Date(data.started_at).getTime();
          const nowMs = Date.now();
          const diffMs = nowMs - startMs;
          const hours = Math.floor(diffMs / 3_600_000);
          const mins = Math.floor((diffMs % 3_600_000) / 60_000);
          if (mounted) setUptimeStr(`${hours}sa ${mins}dk`);
        } else if (data?.uptime_seconds) {
          const h = Math.floor(data.uptime_seconds / 3600);
          const m = Math.floor((data.uptime_seconds % 3600) / 60);
          if (mounted) setUptimeStr(`${h}sa ${m}dk`);
        } else {
          if (mounted) setUptimeStr(data?.status === 'healthy' ? 'AKTÄ°F' : 'BÄ°LÄ°NMÄ°YOR');
        }
      } catch {
        if (mounted) setUptimeStr('OFFLINE');
      }
    }
    fetchUptime();
    const interval = setInterval(fetchUptime, 60_000); // Her 60sn gÃ¼ncelle
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const systemMetrics = {
    uptime: uptimeStr,
    activeNodes: HQ_SCREENS.length,
    totalNodes: HQ_SCREENS.length,
    taskCount: tasks.length,
    criticalAlerts: tasks.filter(t => t.priority === 'kritik' && t.status !== 'tamamlandi').length,
  };

  return (
    <div className="flex min-h-[calc(100vh-57px)]">
      {/* â”€â”€ SÄ°STEM ARKAPLAN DÄ°NAMÄ°ÄžÄ° (VÄ°DACILAR) â”€â”€ */}
      {!isLocked && <SystemCore />}
      
      {/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */}
      {/* SOL SIDEBAR â€” EKRAN NAVÄ°GASYON                        */}
      {/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */}
      {!isLocked && (
        <aside className={`hidden lg:flex flex-col transition-all duration-300 sticky top-[57px] h-[calc(100vh-57px)] z-30
          ${sidebarOpen ? 'w-52' : 'w-12'}
        `}>
          <div className="glass-card h-full rounded-none border-r border-cyan-500/10 flex flex-col">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-500 hover:text-cyan-400 transition-colors border-b border-slate-700/30 flex items-center justify-center"
              title={sidebarOpen ? 'Daralt' : 'GeniÅŸlet'}
            >
              <span className="text-xs font-mono">{sidebarOpen ? 'â—‚' : 'â–¸'}</span>
            </button>
            {/* Ekran listesi */}
            <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
              {HQ_SCREENS.map((screen) => {
                const isActive_ = activeScreen === screen.id;
                const colorMap_: Record<string, string> = {
                  cyan: 'text-cyan-400', blue: 'text-blue-400', purple: 'text-purple-400',
                  amber: 'text-amber-400', green: 'text-green-400', red: 'text-red-400',
                };
                const textColor = colorMap_[screen.color] ?? 'text-cyan-400';
                return (
                  <button
                    key={screen.id}
                    onClick={() => scrollToScreen(screen.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-left transition-all group
                      ${isActive_
                        ? 'bg-cyan-500/10 border-r-2 border-cyan-400'
                        : 'hover:bg-slate-800/50 border-r-2 border-transparent'
                      }
                    `}
                    title={screen.label}
                  >
                    <span className={`text-sm ${textColor} ${isActive_ ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'} transition-opacity`}>
                      {screen.icon}
                    </span>
                    {sidebarOpen && (
                      <div className="min-w-0 flex-1">
                        <div className={`text-[8px] font-black tracking-[0.15em] uppercase truncate ${isActive_ ? textColor : 'text-slate-500 group-hover:text-slate-300'} transition-colors`}>
                          {screen.label}
                        </div>
                        <div className="text-[7px] font-mono text-slate-600">{screen.id}</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {/* Sidebar alt â€” tÃ¼m panelleri daralt/geniÅŸlet */}
            {sidebarOpen && (
              <div className="p-2 border-t border-slate-700/30 flex gap-1">
                <button
                  onClick={() => setCollapsedScreens(new Set(HQ_SCREENS.map(s => s.id)))}
                  className="flex-1 text-[7px] font-bold text-slate-500 hover:text-amber-400 py-1 rounded hover:bg-slate-800/50 transition-all uppercase tracking-wider"
                >
                  TÃœMÃœNÃœ DARALT
                </button>
                <button
                  onClick={() => setCollapsedScreens(new Set())}
                  className="flex-1 text-[7px] font-bold text-slate-500 hover:text-cyan-400 py-1 rounded hover:bg-slate-800/50 transition-all uppercase tracking-wider"
                >
                  TÃœMÃœNÃœ AÃ‡
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
      <main className="flex-1 p-4 lg:p-6 max-w-[1920px] mx-auto w-full">

        {/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */}
        {/* ÃœST BAR: KARARGAH BAÅžLIK + KONTROLLER                 */}
        {/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */}
        <header className="mb-4 animate-fade-in-up">
          {/* â”€â”€ TEK SATIRLIK KOMUTA BARI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className={`flex flex-wrap items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            {/* Sol: BaÅŸlÄ±k */}
            <div className="flex items-center gap-2 mr-2">
              <h1 className="text-xl lg:text-2xl font-black tracking-tight text-white whitespace-nowrap">
                <span className="text-slate-300">{tr.dashboardTitle}</span>
              </h1>
            </div>

            {/* Orta: Durum MÃ¼hÃ¼rleri */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="glass-card neon-glow-green px-3 py-1.5 flex items-center gap-2 border border-green-500/30">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[9px] font-black tracking-[0.15em] uppercase text-green-400">
                  BAÄžIMSIZLIK ONAYLANDI
                </span>
              </div>
              <div className="glass-card neon-glow-green px-3 py-1.5 flex items-center gap-2 border border-green-500/30">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[9px] font-black tracking-[0.15em] uppercase text-green-400">
                  SÄ°STEM YEREL
                </span>
              </div>
              <div className="glass-card px-3 py-1.5 flex items-center gap-2 border border-cyan-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-neon" />
                <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-cyan-400">
                  UPTIME {systemMetrics.uptime}
                </span>
              </div>
            </div>

            {/* Alt bilgi: Ekran / GÃ¶rev sayÄ±larÄ± */}
            <p className="text-[9px] font-mono text-slate-500 tracking-wider hidden lg:block">
              {systemMetrics.activeNodes}/{systemMetrics.totalNodes} EKRAN
              <span className="text-slate-600 mx-1">â€¢</span>
              {systemMetrics.taskCount} GÃ–REV
              <span className="text-slate-600 mx-1">â€¢</span>
              {systemMetrics.criticalAlerts} KRÄ°TÄ°K
            </p>

            {/* SaÄŸ: Tarih + Butonlar */}
            <div className={`flex items-center gap-2 ml-auto ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <div className="glass-card px-3 py-1.5 flex items-center gap-2 border border-slate-500/20">
                <span className="text-[9px] font-mono text-slate-400 tracking-wider" suppressHydrationWarning>
                  {systemTime.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                </span>
                <span className="text-[9px] font-mono neon-text-cyan font-bold" suppressHydrationWarning>
                  {systemTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <button
                onClick={() => setIsLocked(!isLocked)}
                className={`
                  text-[9px] font-black px-3 py-1.5 rounded-lg border transition-all duration-300
                  tracking-[0.12em] uppercase
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
                  className="text-[9px] font-black px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all duration-300 tracking-[0.12em] uppercase disabled:opacity-40 neon-glow-cyan"
                >
                  {isExporting ? tr.sealing : tr.sealSystem}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */}
        {/* HATA BANNER                                           */}
        {/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */}
        {error && (
          <div className="mb-4 glass-card neon-glow-red border border-red-500/30 p-4 flex justify-between items-center animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-red-400">{tr.systemError}</span>
              <span className="text-xs font-mono text-red-300">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 font-bold text-lg transition-colors">Ã—</button>
          </div>
        )}

        {/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */}
        {/* 9 EKRANLI KARARGAH GRID                               */}
        {/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */}
        {isLocked ? (
          /* â”€â”€ KÄ°LÄ°TLÄ° DURUM: 9 Ekran HaritasÄ± (minimap) â”€â”€â”€â”€â”€â”€â”€ */
          <section className="animate-fade-in-up">
            {/* Mini Ekran Grid â€” Kilit Modunda TÃ¼m EkranlarÄ±n Ã–zeti */}
            <div className="glass-card p-6 mb-6 border border-slate-700/30">
              <div className="screen-header">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg neon-text-cyan">â—ˆ</span>
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase text-cyan-400">
                    KARARGAH EKRAN HARÄ°TASI
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

            {/* 21 Kriterli GÃ¶rev Kutusu */}
            <div className="glass-card p-6 mb-6 border border-slate-700/30">
              <div className="screen-header">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg text-amber-400">ğŸ“‹</span>
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase text-amber-400">
                    21 KRÄ°TERLÄ° GÃ–REV PROTOKOLÃœ
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

            {/* Kilit UyarÄ±sÄ± */}
            <div className="glass-card p-12 border border-slate-700/20 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 neon-glow-red">
                <span className="text-3xl">ğŸ”’</span>
              </div>
              <p className="text-slate-400 font-black tracking-[0.2em] uppercase text-sm mb-1">
                {tr.systemRestricted}
              </p>
              <p className="text-[10px] text-slate-600 font-mono">{tr.unlockHint}</p>
            </div>
          </section>
        ) : (
          /* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */
          /* AKTÄ°F MOD: 9+ EKRANLI KARARGAH GRID                 */
          /* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in-up">

            {/* â”€â”€ EKRAN 00: G-0 ONAY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[0]!}
              isActive={activeScreen === 'SCR-00'}
              onClick={() => handleScreenClick('SCR-00')}
              isExpanded={expandedScreen === 'SCR-00'}
              isCollapsed={collapsedScreens.has('SCR-00')}
              onToggleCollapse={() => toggleCollapse('SCR-00')}
            >
              <G0ApprovalPanel />
            </HQScreen>

            {/* â”€â”€ EKRAN 01: SÄ°STEM SAÄžLIK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[1]!}
              isActive={activeScreen === 'SCR-01'}
              onClick={() => handleScreenClick('SCR-01')}
              isExpanded={expandedScreen === 'SCR-01'}
              isCollapsed={collapsedScreens.has('SCR-01')}
              onToggleCollapse={() => toggleCollapse('SCR-01')}
            >
              <HealthDashboard />
            </HQScreen>

            {/* â”€â”€ EKRAN 02: OPERASYON Ä°STATÄ°STÄ°K â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[2]!}
              isActive={activeScreen === 'SCR-02'}
              onClick={() => handleScreenClick('SCR-02')}
              isExpanded={expandedScreen === 'SCR-02'}
              isCollapsed={collapsedScreens.has('SCR-02')}
              onToggleCollapse={() => toggleCollapse('SCR-02')}
            >
              <Stats />
            </HQScreen>

            {/* â”€â”€ EKRAN 03: GÃ–REV PANOSU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[3]!}
              isActive={activeScreen === 'SCR-03'}
              onClick={() => handleScreenClick('SCR-03')}
              isExpanded={expandedScreen === 'SCR-03'}
              isCollapsed={collapsedScreens.has('SCR-03')}
              onToggleCollapse={() => toggleCollapse('SCR-03')}
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

            {/* â”€â”€ EKRAN 04: YÃ–NETÄ°M KURULU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[4]!}
              isActive={activeScreen === 'SCR-04'}
              onClick={() => handleScreenClick('SCR-04')}
              isExpanded={expandedScreen === 'SCR-04'}
              isCollapsed={collapsedScreens.has('SCR-04')}
              onToggleCollapse={() => toggleCollapse('SCR-04')}
            >
              <PlanningPanel />
            </HQScreen>

            {/* â”€â”€ EKRAN 05: L2 DENETÄ°M â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[5]!}
              isActive={activeScreen === 'SCR-05'}
              onClick={() => handleScreenClick('SCR-05')}
              isExpanded={expandedScreen === 'SCR-05'}
              isCollapsed={collapsedScreens.has('SCR-05')}
              onToggleCollapse={() => toggleCollapse('SCR-05')}
            >
              <L2Panel />
            </HQScreen>

            {/* â”€â”€ EKRAN 06: G-8 Ã–ÄžRENME â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[6]!}
              isActive={activeScreen === 'SCR-06'}
              onClick={() => handleScreenClick('SCR-06')}
              isExpanded={expandedScreen === 'SCR-06'}
              isCollapsed={collapsedScreens.has('SCR-06')}
              onToggleCollapse={() => toggleCollapse('SCR-06')}
            >
              <SelfLearningPanel />
            </HQScreen>

            {/* â”€â”€ EKRAN 07: ALARM MERKEZÄ° â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[7]!}
              isActive={activeScreen === 'SCR-07'}
              onClick={() => handleScreenClick('SCR-07')}
              isExpanded={expandedScreen === 'SCR-07'}
              isCollapsed={collapsedScreens.has('SCR-07')}
              onToggleCollapse={() => toggleCollapse('SCR-07')}
            >
              <AlarmPanel />
            </HQScreen>

            {/* â”€â”€ EKRAN 08: TELEGRAM KÃ–PRÃœSÃœ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[8]!}
              isActive={activeScreen === 'SCR-08'}
              onClick={() => handleScreenClick('SCR-08')}
              isExpanded={expandedScreen === 'SCR-08'}
              isCollapsed={collapsedScreens.has('SCR-08')}
              onToggleCollapse={() => toggleCollapse('SCR-08')}
            >
              <TelegramSender />
            </HQScreen>

            {/* â”€â”€ EKRAN 09: DENETÄ°M GÃœNLÃœÄžÃœ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[9]!}
              isActive={activeScreen === 'SCR-09'}
              onClick={() => handleScreenClick('SCR-09')}
              isExpanded={expandedScreen === 'SCR-09'}
              isCollapsed={collapsedScreens.has('SCR-09')}
              onToggleCollapse={() => toggleCollapse('SCR-09')}
            >
              <AuditLog />
            </HQScreen>

            {/* â”€â”€ EKRAN 10: AJAN KADROSU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[10]!}
              isActive={activeScreen === 'SCR-10'}
              onClick={() => handleScreenClick('SCR-10')}
              isExpanded={expandedScreen === 'SCR-10'}
              isCollapsed={collapsedScreens.has('SCR-10')}
              onToggleCollapse={() => toggleCollapse('SCR-10')}
            >
              <AgentPanel />
            </HQScreen>

            {/* â”€â”€ EKRAN 11: BÄ°LGÄ° TABANI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[11]!}
              isActive={activeScreen === 'SCR-11'}
              onClick={() => handleScreenClick('SCR-11')}
              isExpanded={expandedScreen === 'SCR-11'}
              isCollapsed={collapsedScreens.has('SCR-11')}
              onToggleCollapse={() => toggleCollapse('SCR-11')}
            >
              <KnowledgeBasePanel />
            </HQScreen>

            {/* â”€â”€ EKRAN 12: AKTÄ°VÄ°TE AKIÅžI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[12]!}
              isActive={activeScreen === 'SCR-12'}
              onClick={() => handleScreenClick('SCR-12')}
              isExpanded={expandedScreen === 'SCR-12'}
              isCollapsed={collapsedScreens.has('SCR-12')}
              onToggleCollapse={() => toggleCollapse('SCR-12')}
            >
              <ActivityFeed />
            </HQScreen>

            {/* â”€â”€ EKRAN 13: CANLI METRÄ°KLER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[13]!}
              isActive={activeScreen === 'SCR-13'}
              onClick={() => handleScreenClick('SCR-13')}
              isExpanded={expandedScreen === 'SCR-13'}
              isCollapsed={collapsedScreens.has('SCR-13')}
              onToggleCollapse={() => toggleCollapse('SCR-13')}
            >
              <LiveMetrics />
            </HQScreen>

            {/* â”€â”€ EKRAN 14: SÄ°STEM KALKAN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[14]!}
              isActive={activeScreen === 'SCR-14'}
              onClick={() => handleScreenClick('SCR-14')}
              isExpanded={expandedScreen === 'SCR-14'}
              isCollapsed={collapsedScreens.has('SCR-14')}
              onToggleCollapse={() => toggleCollapse('SCR-14')}
            >
              <ShieldPanel />
            </HQScreen>

            {/* â”€â”€ EKRAN 15: NÄ°ZAMNAME â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[15]!}
              isActive={activeScreen === 'SCR-15'}
              onClick={() => handleScreenClick('SCR-15')}
              isExpanded={expandedScreen === 'SCR-15'}
              isCollapsed={collapsedScreens.has('SCR-15')}
              onToggleCollapse={() => toggleCollapse('SCR-15')}
            >
              <SistemKurallariPaneli />
            </HQScreen>

            {/* â”€â”€ EKRAN 16: JOB MONITOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <HQScreen
              screen={HQ_SCREENS[15]!}
              isActive={activeScreen === 'SCR-16'}
              onClick={() => handleScreenClick('SCR-16')}
              isExpanded={expandedScreen === 'SCR-16'}
              isCollapsed={collapsedScreens.has('SCR-16')}
              onToggleCollapse={() => toggleCollapse('SCR-16')}
            >
              <JobMonitorPanel />
            </HQScreen>

          </section>
        )}
      </main>

      {/* â”€â”€ ALT: KARARGAH DURUM Ã‡UBUÄU â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              {tasks.length} GÃ–REV
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono text-slate-500 tracking-wider">
              SÄ°STEM TAKÄ°P PANELÄ°
            </span>
            <span className="text-[9px] font-mono neon-text-cyan font-bold">
              v2.0
            </span>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
}

