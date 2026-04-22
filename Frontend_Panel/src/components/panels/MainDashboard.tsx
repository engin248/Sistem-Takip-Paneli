"use client";
import React from 'react';
import {
    ShieldCheck, Bot, Activity, Radio,
    Bug, Workflow, Target, Zap,
    ChevronRight, ArrowRight, Layers,
    Cpu, Database, Network, Globe,
    AlertTriangle, Server, BarChart3,
    ExternalLink, MousePointer2, Terminal
} from 'lucide-react';

// ============================================================
// MISSION CONTROL - OPERATION CENTER (MCOC)
// ============================================================
// Bu bileşen, Karargah'ın "Ana Giriş" ekranıdır. Tüm ana sistemlere
// giden yolları, sistemin otonom yeteneklerini ve "Sıfır İnisiyatif"
// doktrinine dayalı kontrol noktalarını görsel bir hub olarak sunar.
// ============================================================

export default function MainDashboard() {

    // Ana Aksiyon Kartları (Sistemin Ne Yapabildiği)
    const systemCapabilites = [
        {
            id: 'SCR-01',
            title: 'SİSTEM YÖNETİMİ',
            desc: 'Local ERP [Sunucu] ve AI [Ollama] altyapısını otonom olarak denetle ve yönet.',
            icon: <Activity className="w-6 h-6" />,
            color: 'text-cyan-400',
            bg: 'bg-cyan-500/10',
            border: 'border-cyan-500/20'
        },
        {
            id: 'SCR-03',
            title: 'AJAN KOMUTASI',
            desc: '4 tier hiyerarşideki otonom ajan ordusuna emir ver, performanslarını ve sağlıklarını izle.',
            icon: <Bot className="w-6 h-6" />,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20'
        },
        {
            id: 'SCR-08',
            title: 'İLETİŞİM KOMUTASI',
            desc: 'WhatsApp, Telegram ve SMS kanallarını tek merkezden yönet, AI konuşmalarını denetle.',
            icon: <Radio className="w-6 h-6" />,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20'
        },
        {
            id: 'SCR-07',
            title: 'HATA & CRASH TESPİTİ',
            desc: 'Sistem hatalarını anlık yakala ve AI tabanlı "Hot-Patch" teknolojisiyle otonom onar.',
            icon: <Bug className="w-6 h-6" />,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20'
        },
        {
            id: 'SCR-05',
            title: 'OTOMASYON ZİNCİRİ',
            desc: 'Kompleks iş akışlarını otonom ajanlarla otomatize et ve canlı süreçleri izle.',
            icon: <Workflow className="w-6 h-6" />,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20'
        },
        {
            id: 'SCR-02',
            title: 'PLANLAMA & HEDEF',
            desc: 'Operasyonel hedefleri belirle, ajan ve insan kaynaklarını stratejik olarak ata.',
            icon: <Target className="w-6 h-6" />,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20'
        }
    ];

    return (
        <div className="flex flex-col h-full w-full bg-[#030712] animate-fade-in overflow-hidden scrollbar-hide">

            {/* ── CENTRAL WELCOME & STATUS ── */}
            <div className="shrink-0 p-8 md:p-12 border-b border-white/5 relative overflow-hidden bg-gradient-to-b from-[#0b1120]/50 to-transparent">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ShieldCheck className="w-48 h-48 text-cyan-500" />
                </div>

                <div className="max-w-5xl relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-8 h-[2px] bg-cyan-500"></span>
                        <span className="text-[10px] font-black text-cyan-400 tracking-[0.5em] uppercase">SYSTEM OPERATIONAL STATUS: ALPHA-1</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-6">
                        SİSTEM <span className="text-cyan-500">OPERASYON</span> MERKEZİ
                    </h1>
                    <p className="text-sm md:text-base text-slate-400 font-mono leading-relaxed max-w-2xl mb-8">
                        Bu merkez, tüm lokal altyapıların, otonom ajanların ve iletişim kanallarının tek bir noktadan yönetildiği "Karargah"tır. Sisteme doğrudan müdahale edin veya ajanların otonom karar alma süreçlerini denetleyin.
                    </p>

                    <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-none shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            <Zap className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">TÜM SERVİSLER AKTİF</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-none shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                            <Bot className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">42 AJAN ÇEVRİMİÇİ</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── CORE CAPABILITIES GRID ── */}
            <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar bg-[#030712]">
                <div className="max-w-7xl mx-auto space-y-12">

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {systemCapabilites.map((cap) => (
                            <div
                                key={cap.id}
                                className="group relative bg-[#0b1120] border border-white/5 hover:border-white/20 transition-all p-8 flex flex-col justify-between min-h-[240px] cursor-pointer"
                                onClick={() => window.location.hash = cap.id}
                            >
                                {/* Visual Accent */}
                                <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                                <div className={`absolute bottom-0 left-0 w-full h-[2px] bg-white/5 group-hover:bg-cyan-500/30 transition-colors`} />

                                <div>
                                    <div className={`w-12 h-12 ${cap.bg} ${cap.border} border flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300`}>
                                        <div className={cap.color}>{cap.icon}</div>
                                    </div>
                                    <h3 className="text-lg font-black text-white tracking-widest uppercase mb-3">
                                        {cap.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-mono leading-relaxed group-hover:text-slate-300 transition-colors">
                                        {cap.desc}
                                    </p>
                                </div>

                                <div className="flex justify-end mt-4">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-cyan-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 tracking-[0.2em]">
                                        PANELİ AÇ <ArrowRight className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── SECONDARY INTERNAL STATS ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-6 border-t border-white/5">
                        <div className="lg:col-span-2 space-y-4">
                            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
                                <Layers className="w-4 h-4" /> SİSTEM MİMARİSİ
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { name: 'LOCAL ERP (SUNUCU)', status: 'BAĞLI', icon: <Database /> },
                                    { name: 'OLLAMA ENGINE', status: 'HAZIR', icon: <Cpu /> },
                                    { name: 'GROQ CLUSTER', status: 'AKTİF', icon: <Network /> },
                                    { name: 'SUPABASE DB', status: 'SENKRON', icon: <Globe /> }
                                ].map((s, i) => (
                                    <div key={i} className="p-4 bg-slate-950 border border-white/5 flex items-center gap-4">
                                        <div className="text-slate-700">{s.icon}</div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-slate-300">{s.name}</span>
                                            <span className="text-[8px] font-mono text-emerald-400">{s.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-2 space-y-4">
                            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
                                <Terminal className="w-4 h-4" /> SON KRİTİK LOGLAR
                            </h4>
                            <div className="bg-black border border-white/5 p-4 h-[120px] overflow-hidden rounded-none relative">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 pointer-events-none" />
                                <div className="space-y-1.5 font-mono text-[9px]">
                                    <p className="text-red-500/80 leading-none">19:28:45 - CRITICAL: Sunucu Bridge re-connected.</p>
                                    <p className="text-slate-600 leading-none">19:28:42 - INFO: Agent-Sniper patrolling database shards.</p>
                                    <p className="text-emerald-500/80 leading-none">19:28:38 - SUCCESS: Automation sequence #47-S completed.</p>
                                    <p className="text-slate-600 leading-none">19:28:35 - INFO: SİSTEM worker heartbeat: 120bpm.</p>
                                    <p className="text-slate-600 leading-none">19:28:30 - INFO: All comm-channels handshake OK.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}

