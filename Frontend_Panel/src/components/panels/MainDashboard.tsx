import React, { useState, useEffect } from 'react';
import {
    Activity, Bot, Cpu, Network, ShieldCheck, Zap,
    Terminal, Server, Globe, BarChart3, Database,
    Workflow, Radio, AlertTriangle
} from 'lucide-react';

export default function MainDashboard() {
    const [currentTime, setCurrentTime] = useState('');
    const [metrics, setMetrics] = useState({ cpu: 42, ram: 68, tokens: 84500, ops: 128 });

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('tr-TR', { hour12: false }) + '.' + now.getMilliseconds().toString().padStart(3, '0'));
        };
        const timer = setInterval(updateTime, 47);
        return () => clearInterval(timer);
    }, []);

    // Simüle Edilmiş Canlı Veri Akışı
    useEffect(() => {
        const statTimer = setInterval(() => {
            setMetrics(prev => ({
                cpu: Math.min(100, Math.max(0, prev.cpu + (Math.random() * 10 - 5))),
                ram: Math.min(100, Math.max(0, prev.ram + (Math.random() * 6 - 3))),
                tokens: prev.tokens + Math.floor(Math.random() * 100),
                ops: prev.ops + (Math.random() > 0.8 ? 1 : 0)
            }));
        }, 1500);
        return () => clearInterval(statTimer);
    }, []);

    return (
        <div className="flex flex-col h-full w-full bg-transparent animate-fade-in overflow-hidden relative">
            {/* Arka Plan Efektleri */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-rose-900/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-900/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />

            {/* ── HEADER BÖLÜMÜ ── */}
            <div className="shrink-0 p-8 border-b border-white/5 relative z-10 bg-black/40 backdrop-blur-3xl overflow-hidden">
                {/* Background ambient glow */}
                <div className="absolute top-[-50%] left-[10%] w-[40%] h-[200%] bg-rose-500/10 blur-[80px] pointer-events-none rotate-12" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-300 to-rose-600 tracking-[0.2em] uppercase drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                            GLOBAL KOMUTA MERKEZİ
                        </h1>
                        <p className="text-[11px] font-mono text-rose-400/80 uppercase tracking-[0.3em] mt-3 flex items-center gap-3">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_#f43f5e]"></span>
                            </span>
                            AJAN ORKESTRASYON İŞLETİM SİSTEMİ v2.0
                        </p>
                    </div>
                    <div className="flex items-center gap-6 bg-black/50 border border-white/10 px-6 py-4 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-500 tracking-widest mb-1">SİSTEM SAATİ (UTC+3)</span>
                            <span className="text-xl font-mono font-bold text-amber-400 w-32 text-left tabular-nums drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">{currentTime}</span>
                        </div>
                        <div className="w-px h-10 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-500 tracking-widest mb-1">SİSTEM DURUMU</span>
                            <div className="flex items-center gap-2 text-emerald-400 font-black text-sm tracking-widest drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                                <ShieldCheck className="w-5 h-5" /> OPTİMAL
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar relative z-10">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* ── METRİKLER ── */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: "NÖRAL İŞLEMCİ YÜKÜ", value: `${metrics.cpu.toFixed(1)}%`, icon: Cpu, color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30", fill: "bg-amber-500", glow: "shadow-[0_0_15px_rgba(245,158,11,0.5)]", trend: "+2.4%" },
                            { label: "BELLEK TÜKETİMİ", value: `${metrics.ram.toFixed(1)}%`, icon: Database, color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30", fill: "bg-purple-500", glow: "shadow-[0_0_15px_rgba(168,85,247,0.5)]", trend: "-1.2%" },
                            { label: "İŞLENEN TOKEN", value: metrics.tokens.toLocaleString(), icon: Zap, color: "text-rose-400", bg: "bg-rose-500/20", border: "border-rose-500/30", fill: "bg-rose-500", glow: "shadow-[0_0_15px_rgba(244,63,94,0.5)]", trend: "+14.5K" },
                            { label: "AKTİF OPERASYON", value: metrics.ops, icon: Activity, color: "text-cyan-400", bg: "bg-cyan-500/20", border: "border-cyan-500/30", fill: "bg-cyan-500", glow: "shadow-[0_0_15px_rgba(6,182,212,0.5)]", trend: "+3" }
                        ].map((stat, i) => (
                            <div key={i} className={`bg-black/40 backdrop-blur-2xl border ${stat.border} p-6 rounded-3xl relative overflow-hidden group hover:bg-white/5 transition-all duration-500 shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.6)]`}>
                                {/* Inner Ambient Glow */}
                                <div className={`absolute -top-10 -right-10 w-32 h-32 ${stat.bg} blur-[50px] rounded-full group-hover:scale-150 transition-transform duration-700`} />
                                
                                <div className="flex justify-between items-start mb-5 relative z-10">
                                    <div className={`w-12 h-12 rounded-2xl ${stat.bg} border ${stat.border} flex items-center justify-center shrink-0 shadow-[inset_0_0_15px_rgba(255,255,255,0.05)]`}>
                                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                    </div>
                                    <span className={`text-[10px] font-black ${stat.color} bg-black/50 px-2.5 py-1.5 rounded-lg border ${stat.border} backdrop-blur-md`}>{stat.trend}</span>
                                </div>
                                <h3 className={`text-4xl font-black text-white font-mono tracking-tight mb-2 relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]`}>{stat.value}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">{stat.label}</p>
                                
                                {/* Progress Bar */}
                                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/50">
                                    <div className={`h-full ${stat.fill} ${stat.glow} transition-all duration-1000 ease-out relative`} style={{ width: String(stat.value).includes('%') ? stat.value : '100%' }}>
                                        <div className="absolute inset-0 w-full h-full bg-white/20 animate-shimmer" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── ANA PANELLER VE KISA YOLLAR ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {[
                                { title: 'AJAN KOMUTASI', desc: '4 Tier Otonom Ajan Yönetimi', icon: Bot, href: '#STP-03', color: 'cyan' },
                                { title: 'OTOMASYON ZİNCİRİ', desc: 'Ajan Swarm İş Akışları', icon: Workflow, href: '#STP-05', color: 'emerald' },
                                { title: 'AR-GE İSTİHBARAT', desc: 'Global Pazar ve Veri Taraması', icon: Globe, href: '#STP-04', color: 'purple' },
                                { title: 'İLETİŞİM AĞLARI', desc: 'WhatsApp & Telegram Bot Hub', icon: Radio, href: '#STP-08', color: 'blue' }
                            ].map((card, i) => {
                                const colors: Record<string, any> = {
                                    cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', hoverBg: 'group-hover:bg-cyan-500/20', border: 'border-cyan-500/30', glow: 'shadow-[0_0_15px_rgba(6,182,212,0.4)]', glowBg: 'bg-cyan-500' },
                                    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', hoverBg: 'group-hover:bg-emerald-500/20', border: 'border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]', glowBg: 'bg-emerald-500' },
                                    purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', hoverBg: 'group-hover:bg-purple-500/20', border: 'border-purple-500/30', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.4)]', glowBg: 'bg-purple-500' },
                                    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', hoverBg: 'group-hover:bg-blue-500/20', border: 'border-blue-500/30', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]', glowBg: 'bg-blue-500' }
                                };
                                const theme = colors[card.color];
                                return (
                                <a key={i} href={card.href} className={`block p-6 rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl ${theme.hoverBg} group relative overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.5)] hover:border-white/20`}>
                                    {/* Animated background shape */}
                                    <div className={`absolute -right-10 -top-10 w-32 h-32 ${theme.bg} rounded-full blur-[40px] group-hover:scale-[2] transition-transform duration-700`} />
                                    
                                    <div className={`w-14 h-14 rounded-2xl ${theme.bg} border ${theme.border} flex items-center justify-center mb-6 group-hover:${theme.glow} transition-all duration-500`}>
                                        <card.icon className={`w-7 h-7 ${theme.text}`} />
                                    </div>
                                    <h4 className="text-sm font-black text-white tracking-[0.15em] uppercase mb-2 relative z-10">{card.title}</h4>
                                    <p className="text-[11px] font-mono text-slate-400 relative z-10">{card.desc}</p>
                                    
                                    {/* Bottom Line */}
                                    <div className={`absolute bottom-0 left-0 w-0 h-1 ${theme.glowBg} group-hover:w-full transition-all duration-700 ease-out`} />
                                </a>
                                );
                            })}
                        </div>

                        {/* ── CANLI TERMİNAL ── */}
                        <div className="bg-[#050505] border border-white/10 rounded-3xl p-6 flex flex-col h-full shadow-[0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                            {/* Terminal Header */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                                        <Terminal className="w-4 h-4 text-rose-500" />
                                    </div>
                                    <h4 className="text-[11px] font-black text-rose-100 uppercase tracking-[0.3em] drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">SİSTEM TERMİNALİ</h4>
                                </div>
                                <div className="flex gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden relative font-mono text-[11px] leading-loose">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050505] z-10 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-full animate-slide-up pb-2">
                                    <p className="text-slate-500"><span className="text-rose-500/70">[19:42:01]</span> <span className="text-blue-400">SYS:</span> Memory GC completed.</p>
                                    <p className="text-slate-500"><span className="text-rose-500/70">[19:42:05]</span> <span className="text-cyan-400">AGENT (MİMAR-X):</span> DB index optimizasyonu tamamlandı.</p>
                                    <p className="text-slate-500"><span className="text-rose-500/70">[19:42:12]</span> <span className="text-emerald-400">API:</span> WhatsApp webhook received.</p>
                                    <p className="text-slate-500"><span className="text-rose-500/70">[19:42:15]</span> <span className="text-blue-400">SYS:</span> Neural Core routing traffic.</p>
                                    <p className="text-amber-400/90 bg-amber-500/10 px-3 py-1 my-2 border-l-2 border-amber-500"><span className="text-amber-500/70">[19:42:22]</span> WARN: Ollama response latency &gt; 2000ms.</p>
                                    <p className="text-slate-500"><span className="text-rose-500/70">[19:42:28]</span> <span className="text-purple-400">AGENT (PİSAGOR):</span> Rapor hazırlandı. <span className="animate-pulse text-white">_</span></p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ── DONANIM DURUMU ── */}
                    <div className="bg-black/40 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl flex flex-wrap lg:flex-nowrap gap-6 items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.3)] mt-6">
                        <div className="flex items-center gap-5 w-full lg:w-1/3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 relative group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all">
                                <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-[0_0_8px_#3b82f6]" />
                                <Server className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black text-white uppercase tracking-widest">LOCAL ERP SUNUCUSU</h4>
                                <p className="text-[10px] font-mono text-slate-400 mt-1">BAĞLANTI STABİL <span className="text-blue-400 font-bold">(12ms)</span></p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-5 w-full lg:w-1/3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                            <div className="w-14 h-14 bg-fuchsia-500/10 rounded-2xl flex items-center justify-center border border-fuchsia-500/20 relative group-hover:shadow-[0_0_15px_rgba(217,70,239,0.3)] transition-all">
                                <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse shadow-[0_0_8px_#d946ef]" />
                                <Network className="w-6 h-6 text-fuchsia-400" />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black text-white uppercase tracking-widest">OLLAMA NEURAL ENGINE</h4>
                                <p className="text-[10px] font-mono text-slate-400 mt-1">10 MODEL YÜKLÜ VE <span className="text-fuchsia-400 font-bold">AKTİF</span></p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-5 w-full lg:w-1/3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 relative group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
                                <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black text-white uppercase tracking-widest">L2 GÜVENLİK MÜHRÜ</h4>
                                <p className="text-[10px] font-mono text-slate-400 mt-1">SİSTEM KORUMASI <span className="text-emerald-400 font-bold">OPTİMAL</span></p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}


