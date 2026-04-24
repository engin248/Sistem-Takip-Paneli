
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
  { id: 'STP-00', label: 'ANA SAYFA', subtitle: 'Global Sistem Komuta Merkezi', icon: <LayoutDashboard className="w-5 h-5" />, color: 'amber', status: 'ONLİNE' },
  { id: 'STP-01', label: 'SİSTEM YÖNETİMİ', subtitle: 'Lokal / Canlı Sistemler', icon: <Activity className="w-5 h-5" />, color: 'cyan', status: 'AKTİF' },
  { id: 'STP-02', label: 'PLANLAMA', subtitle: 'Otonom / İnsan Görev Dağıtımı', icon: <Target className="w-5 h-5" />, color: 'amber', status: 'AKTİF' },
  { id: 'STP-03', label: 'AJAN YÖNETİMİ', subtitle: 'Ajan Kadrosu', icon: <Bot className="w-5 h-5" />, color: 'amber', status: 'AKTİF' },
  { id: 'STP-04', label: 'AR-GE İSTİHBARAT', subtitle: 'Global Trend & Pazar Verisi', icon: <Radar className="w-5 h-5" />, color: 'blue', status: 'AKTİF' },
  { id: 'STP-05', label: 'OTOMASYONLAR', subtitle: 'Zincirleme Görev Akışları', icon: <Workflow className="w-5 h-5" />, color: 'green', status: 'AKTİF' },
  { id: 'STP-06', label: 'GÖREV PANOSU', subtitle: 'Aktif Görev Kartları', icon: <Layers className="w-5 h-5" />, color: 'amber', status: 'AKTİF' },
  { id: 'STP-07', label: 'SİSTEM HATALARI', subtitle: 'Hata Logları ve Crash Tespiti', icon: <Bug className="w-5 h-5" />, color: 'red', status: 'AKTİF' },
  { id: 'STP-08', label: 'İLETİŞİM AĞLARI', subtitle: 'WhatsApp, Telegram, SMS Hub', icon: <Radio className="w-5 h-5" />, color: 'blue', status: 'AKTİF' },
  { id: 'STP-10', label: 'ANA SİSTEM', subtitle: 'Temel Motor ve Kontrol', icon: <Cpu className="w-5 h-5" />, color: 'cyan', status: 'AKTİF' },
  { id: 'STP-11', label: 'ALARM MERKEZİ', subtitle: 'Sistem Kritik Uyarıları', icon: <AlertTriangle className="w-5 h-5" />, color: 'amber', status: 'AKTİF' },
  { id: 'STP-12', label: 'KAMERA PERFORMANS', subtitle: 'Personel Takip/Adalet', icon: <Camera className="w-5 h-5" />, color: 'emerald', status: 'AKTİF' },
  { id: 'STP-16', label: 'GÖREV MONİTÖRÜ', subtitle: 'Canlı İşlem Akışı', icon: <Terminal className="w-5 h-5" />, color: 'green', status: 'AKTİF' },
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
      className="hq-screen-wrapper animate-fade-in-up w-full min-h-screen bg-[#030712]"
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
    <div className={`flex h-screen bg-[#030712] text-slate-100 font-sans selection:bg-cyan-500/30 overflow-hidden ${dir === 'rtl' ? 'rtl' : 'ltr'}`}>
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 h-full border-r border-slate-700/50 flex flex-col transition-transform duration-500 bg-[#0b1120]
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-[100px] px-6 border-b border-slate-700/50 flex items-center shrink-0">
          <div className={`flex items-center gap-4 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            {/* Logo: Sabit ve Net */}
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              <LogoSVG />
            </div>
            {/* Yazı Bloğu: Logo ile tam uyumlu 2 satır */}
            <div className="flex flex-col justify-center">
              <span className="font-extrabold text-[16px] text-white tracking-widest uppercase leading-tight">
                SİSTEM
              </span>
              <span className="font-extrabold text-[16px] text-cyan-400 tracking-widest uppercase leading-tight">
                OPERASYON
              </span>
              <span className="font-extrabold text-[16px] text-white tracking-widest uppercase leading-tight">
                MERKEZİ
              </span>
            </div>
          </div>
          <button className="lg:hidden ml-auto text-slate-400" onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin">
          {HQ_SCREENS.map((screen) => {
            const isActive = activeScreen === screen.id;
            const colorClasses: Record<string, string> = {
              cyan: 'text-cyan-400',
              blue: 'text-blue-400',
              purple: 'text-purple-400',
              amber: 'text-amber-400',
              green: 'text-green-400',
              red: 'text-red-400',
              indigo: 'text-indigo-400',
            };
            const iconColor = colorClasses[screen.color] || 'text-slate-400';

            return (
              <button
                key={screen.id}
                onClick={() => scrollToScreen(screen.id)}
                className={`w-full group flex items-center gap-3 p-3 rounded-none transition-all mb-1 hover:scale-[1.02] active:scale-[0.98] ${isActive ? 'bg-cyan-500/15 border border-cyan-500/30' : 'hover:bg-slate-800/50 border border-transparent'}`}
              >
                <span className={`${isActive ? 'text-cyan-400' : `${iconColor} group-hover:text-slate-200`} transition-colors duration-300`}>
                  {screen.icon}
                </span>
                <div className="flex flex-col items-start min-w-0">
                  <span className={`text-[11px] font-black tracking-widest uppercase ${isActive ? 'text-white' : 'text-slate-400'}`}>{screen.label}</span>
                  <span className="text-[9px] font-mono text-slate-500 truncate w-full uppercase">{screen.subtitle}</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative lg:ml-72">
        <NavBar />

        <main className="flex-1 overflow-y-auto w-full bg-[#030712] relative custom-scrollbar">
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

