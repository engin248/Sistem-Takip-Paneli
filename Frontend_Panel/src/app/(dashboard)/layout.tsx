
"use client";
import { useEffect, useState, useCallback, useMemo } from 'react';

import { useSelectedLayoutSegment, useRouter } from 'next/navigation';
import {
  Activity, LayoutDashboard,
  Target, Bot, Radio, X, Radar, Workflow, Bug, Cpu, Shield,
  Layers, Terminal, AlertTriangle, Camera
} from 'lucide-react';
import { useLanguageStore } from '@/store/useLanguageStore';
import ScreenErrorBoundary from '@/components/layout/ScreenErrorBoundary';
import GlobalBotTrigger from '@/components/shared/GlobalBotTrigger';

const LogoSVG = () => (
  <svg width="40" height="40" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 drop-shadow-[0_0_12px_rgba(56,189,248,0.5)]">
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" fillOpacity="0.3" />
        <stop offset="100%" stopColor="#8b5cf6" fillOpacity="0.4" />
      </linearGradient>
      <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="50%" stopColor="#e879f9" />
        <stop offset="100%" stopColor="#7dd3fc" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <path d="M60 8 L105 32 V88 L60 112 L15 88 V32 Z" fill="url(#shieldGrad)" stroke="url(#borderGrad)" strokeWidth="9" strokeLinejoin="round" />
    <path d="M60 8 V112 M15 32 L105 88 M15 88 L105 32" stroke="#e2e8f0" strokeWidth="1.5" opacity="0.4" />
    <circle cx="60" cy="60" r="24" stroke="#7dd3fc" strokeWidth="4" opacity="0.9" strokeDasharray="8 6" className="origin-center animate-[spin_6s_linear_infinite]" />
    <circle cx="60" cy="60" r="12" fill="#bae6fd" filter="url(#glow)" className="animate-pulse" />
  </svg>
);

import NavBar from '@/components/layout/NavBar';

// ============================================================
// KARARGAH PANELİ — 16 EKRANLI FÜTÜRİSTİK KOMUTA MERKEZİ
// ============================================================
// Ekran 01: SİSTEM SAĞLİK       — HealthDashboard
// Ekran 02: OPS İSTATİSTİK      — Stats
// Ekran 03: GÖREV PANOSU       — TaskBoard (Kanban)
// Ekran 04: YÖNETİM KURULU     — PlanningPanel (Planlama & Atama)
// Ekran 05: L2 DENETİM         — L2Panel (Özerk Doğrulama)
// Ekran 06: G-8 ÖĞRENME        — SelfLearningPanel (Pattern)
// Ekran 07: ALARM MERKEZİ      — AlarmPanel
// Ekran 08: TELEGRAM KÖPRÜSÜ   — TelegramSender
// Ekran 09: DENETİM GÜNLÜĞÜ    — AuditLog
// Ekran 10: ANA SİSTEM    — CoreBrainPanel
// Ekran 11: BİLGİ TABANI       — KnowledgeBasePanel (RAG)
// Ekran 12: AKTİVİTE AKIŞI     — ActivityFeed (Ajan Canlı Akış)
// Ekran 13: CANLI METRİKLER    — LiveMetrics (Radial Gauge)
// Ekran 14: SİSTEM KALKAN      — ShieldPanel (Circuit Breaker + Audit Zinciri)
// ============================================================

type ScreenMeta = {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  status: string;
  subtitle?: string;
};

const HQ_SCREENS: ScreenMeta[] = [
  { id: 'STP-00', label: 'ANA SAYFA', subtitle: 'Global Sistem Komuta Merkezi', icon: <LayoutDashboard className="w-5 h-5" />, color: 'cyan', status: 'ONLİNE' },
  { id: 'STP-01', label: 'SİSTEM YÖNETİMİ', subtitle: 'Lokal / Canlı Sistemler', icon: <Activity className="w-5 h-5" />, color: 'amber', status: 'AKTİF' },
  { id: 'STP-02', label: 'PLANLAMA', subtitle: 'Otonom / İnsan Görev Dağıtımı', icon: <Target className="w-5 h-5" />, color: 'purple', status: 'AKTİF' },
  { id: 'STP-03', label: 'AJAN YÖNETİMİ', subtitle: 'Ajan Kadrosu', icon: <Bot className="w-5 h-5" />, color: 'fuchsia', status: 'AKTİF' },
  { id: 'STP-04', label: 'AR-GE İSTİHBARAT', subtitle: 'Global Trend & Pazar Verisi', icon: <Radar className="w-5 h-5" />, color: 'blue', status: 'AKTİF' },
  { id: 'STP-05', label: 'OTOMASYONLAR', subtitle: 'Zincirleme Görev Akışları', icon: <Workflow className="w-5 h-5" />, color: 'emerald', status: 'AKTİF' },
  { id: 'STP-07', label: 'SİSTEM HATALARI', subtitle: 'Hata Logları ve Crash Tespiti', icon: <Bug className="w-5 h-5" />, color: 'rose', status: 'AKTİF' },
  { id: 'STP-08', label: 'İLETİŞİM AĞLARI', subtitle: 'WhatsApp, Telegram, SMS Hub', icon: <Radio className="w-5 h-5" />, color: 'cyan', status: 'AKTİF' },
  { id: 'STP-12', label: 'KAMERA PERFORMANS', subtitle: 'Personel Takip/Adalet', icon: <Camera className="w-5 h-5" />, color: 'amber', status: 'AKTİF' },
];


function HQScreen({
  children,
  screenId,
}: {
  children: React.ReactNode;
  screenId: string;
}) {
  return (
    <div
      id={`hq-screen-${screenId}`}
      className="hq-screen-wrapper animate-fade-in-up w-full min-h-screen bg-transparent relative z-10"
    >
      <ScreenErrorBoundary screenId={screenId}>
        {children}
      </ScreenErrorBoundary>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { lang, dir } = useLanguageStore();
  const activeSegment = useSelectedLayoutSegment();
  const router = useRouter();
  const activeScreen = activeSegment || 'STP-03';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const scrollToScreen = (id: string) => {
    router.push(`/${id}`);
    setSidebarOpen(false);
  };


  return (
    <div className={`flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-rose-500/30 overflow-hidden relative ${dir === 'rtl' ? 'rtl' : 'ltr'}`}>
      
      {/* ── YENİ: GLOBAL ANİMASYONLU ARKA PLAN (SICAK TONLAR) ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-fuchsia-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-10000" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-rose-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-10000 delay-1000" />
        <div className="absolute top-[30%] left-[50%] w-[30vw] h-[30vw] bg-amber-500/10 rounded-full blur-[100px] mix-blend-screen animate-pulse duration-7000" />
        <div className="absolute inset-0 bg-black/40" /> {/* Kontrast için hafif karartma */}
      </div>

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 h-full border-r border-white/5 flex flex-col transition-transform duration-500 bg-black/40 backdrop-blur-3xl shadow-[4px_0_24px_rgba(0,0,0,0.8)]
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-[100px] px-6 border-b border-white/5 flex items-center shrink-0 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden">
          {/* Subtle logo background glow */}
          <div className="absolute top-0 left-0 w-full h-full bg-cyan-500/10 blur-[50px] pointer-events-none" />
          <div className={`flex items-center gap-4 relative z-10 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            {/* Logo: Sabit ve Net */}
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              <LogoSVG />
            </div>
            {/* Yazı Bloğu: Logo ile tam uyumlu 2 satır */}
            {/* Yazı Bloğu: 2 Satır Kompakt ve Fütüristik */}
            <div className="flex flex-col justify-center gap-0.5">
              <span className="font-extrabold text-[13px] text-white tracking-[0.2em] uppercase leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                SİSTEM <span className="text-slate-400">OPERASYON</span>
              </span>
              <span className="font-black text-[17px] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 tracking-[0.25em] uppercase leading-none drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]">
                MERKEZİ
              </span>
            </div>
          </div>
          <button className="lg:hidden ml-auto text-slate-400 z-10 relative" onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
          {HQ_SCREENS.map((screen) => {
            const isActive = activeScreen === screen.id;
            
            // Map the colors logically
            const colorClasses: Record<string, {text: string, bg: string, border: string, shadow: string, glow: string, lineShadow: string}> = {
              cyan: {text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', shadow: 'shadow-[0_0_15px_rgba(6,182,212,0.4)]', glow: 'bg-cyan-500', lineShadow: 'shadow-[0_0_10px_#06b6d4]'},
              blue: {text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]', glow: 'bg-blue-500', lineShadow: 'shadow-[0_0_10px_#3b82f6]'},
              purple: {text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', shadow: 'shadow-[0_0_15px_rgba(168,85,247,0.4)]', glow: 'bg-purple-500', lineShadow: 'shadow-[0_0_10px_#a855f7]'},
              fuchsia: {text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30', shadow: 'shadow-[0_0_15px_rgba(217,70,239,0.4)]', glow: 'bg-fuchsia-500', lineShadow: 'shadow-[0_0_10px_#d946ef]'},
              amber: {text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', shadow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]', glow: 'bg-amber-500', lineShadow: 'shadow-[0_0_10px_#f59e0b]'},
              emerald: {text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]', glow: 'bg-emerald-500', lineShadow: 'shadow-[0_0_10px_#10b981]'},
              rose: {text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', shadow: 'shadow-[0_0_15px_rgba(244,63,94,0.4)]', glow: 'bg-rose-500', lineShadow: 'shadow-[0_0_10px_#f43f5e]'},
            };
            
            const theme = (colorClasses[screen.color] || colorClasses.cyan)!;

            return (
              <button
                key={screen.id}
                onClick={() => scrollToScreen(screen.id)}
                className={`group relative w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 overflow-hidden text-left
                  ${isActive 
                    ? `bg-white/5 border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]` 
                    : `border border-transparent hover:bg-white-[0.02]`}
                `}
              >
                {/* Active Indicator Line */}
                {isActive && (
                  <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-r-full ${theme.glow} ${theme.lineShadow}`} />
                )}
                
                {/* Hover Gradient Background */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${theme.bg} blur-xl`} />

                <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 
                  ${isActive 
                    ? `${theme.bg} ${theme.border} border ${theme.shadow}` 
                    : `bg-white/5 border border-white/10 group-hover:${theme.bg} group-hover:${theme.border} group-hover:border`
                  }`}
                >
                  <span className={`transition-colors duration-300 ${isActive ? theme.text : 'text-slate-400 group-hover:text-white'}`}>
                    {screen.icon}
                  </span>
                </div>
                
                <div className="relative z-10 flex flex-col items-start min-w-0 flex-1 text-left">
                  <span className={`text-xs font-black tracking-[0.1em] uppercase transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                    {screen.label}
                  </span>
                  <span className={`text-[9px] font-mono truncate w-full uppercase transition-colors duration-300 ${isActive ? theme.text.replace('400', '400/80') : 'text-slate-600 group-hover:text-slate-400'}`}>
                    {screen.subtitle}
                  </span>
                </div>
                
                {/* Small Active Dot */}
                {isActive && (
                   <div className={`w-1.5 h-1.5 rounded-full ${theme.glow} animate-pulse ml-auto ${theme.lineShadow}`} />
                )}
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative lg:ml-72">
        <NavBar />

        <main className="flex-1 overflow-y-auto w-full bg-transparent relative custom-scrollbar z-10">
          <div className="w-full min-h-full">
            <HQScreen screenId={activeScreen}>
              {children}
            </HQScreen>
          </div>
        </main>

        <GlobalBotTrigger />
      </div>
    </div>
  );
}


