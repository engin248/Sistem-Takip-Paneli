"use client";
import React, { useState } from 'react';
import {
    Workflow, PlusCircle, Play, Pause, Save, Trash2,
    ArrowDown, Settings2, Zap, BrainCircuit, Globe,
    Bell, CheckCircle2, AlertCircle, RefreshCw,
    ChevronRight, Database, Code2, Link2, Layers,
    Activity, Power
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// AUTONOMOUS Z-CHAIN ORCHESTRATOR (AZCO)
// ============================================================
// Bu bileşen, ajanların ve platformların birbirine bağlandığı
// "Zincirleme Görev Akışları"nı (Sequences) tasarlamak ve 
// otonom olarak yürütmek için Karargah'ın motorudur.
// ============================================================

type FlowStatus = 'ACTIVE' | 'PAUSED' | 'TESTING' | 'ERROR';

interface AutomationFlow {
    id: string;
    name: string;
    trigger: string;
    aiNode: string;
    target: string;
    status: FlowStatus;
    lastRun: string;
    runCount: number;
}

const MOCK_FLOWS: AutomationFlow[] = [
    { id: 'FL-001', name: 'PAZAR TREND & ÜRETİM ANALİZİ', trigger: 'EVERY-24H', aiNode: 'QWEN-2.5', target: 'ARGE-PANEL', status: 'ACTIVE', lastRun: '08:00', runCount: 142 },
    { id: 'FL-002', name: 'L2 GÜVENLİK MÜHÜRLEME ZİNCİRİ', trigger: 'ALERT-HOOK', aiNode: 'PHI-3-SNIPER', target: 'SMS/SEC', status: 'ACTIVE', lastRun: '16:45', runCount: 12 },
    { id: 'FL-003', name: 'MİZANET STOK SENKRONİZASYONU', trigger: 'DB-CHANGE', aiNode: 'AGENT-WORKER', target: 'TELEGRAM', status: 'PAUSED', lastRun: 'DÜN', runCount: 890 },
    { id: 'FL-004', name: 'MÜŞTERİ SEGMENTASYON TAHMİNİ', trigger: 'MANUAL', aiNode: 'LLAMA-3', target: 'DATABASE', status: 'ACTIVE', lastRun: '9 DK ÖNCE', runCount: 5 },
];

export default function AutomationPanel() {
    const [flows, setFlows] = useState<AutomationFlow[]>(MOCK_FLOWS);
    const [isBuilding, setIsBuilding] = useState(false);
    const [isRunningTest, setIsRunningTest] = useState(false);

    const handleTestFlow = () => {
        setIsRunningTest(true);
        setTimeout(() => {
            setIsRunningTest(false);
            toast.success("Zincir simülasyonu BAŞARILI. Tüm düğümler yanıt verdi.");
        }, 2000);
    };

    const toggleStatus = (id: string) => {
        setFlows(prev => prev.map(f => f.id === id
            ? { ...f, status: f.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }
            : f
        ));
        toast.info("Otomasyon durumu güncellendi.");
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#030712] animate-fade-in overflow-hidden">

            {/* ── HEADER: OTOMASYON KOMUTA MERKEZİ ── */}
            <div className="shrink-0 p-6 border-b border-white/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-[#0b1120]/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        <Workflow className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-[0.2em] uppercase">OTOMASYON ZİNCİR MERKEZİ</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-none animate-pulse"></span>
                            <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest leading-none">3 AKTİF ZİNCİR • 12.4K OPERASYON/AY</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => setIsBuilding(!isBuilding)}
                    className={`px-8 py-3 border font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-3 ${isBuilding ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-600'
                        }`}
                >
                    {isBuilding ? 'TASARIMI İPTAL ET' : <><PlusCircle className="w-4 h-4" /> YENİ ZİNCİR KUR</>}
                </button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">

                {/* ── SOL: ZİNCİR TASARIM YÜZEYİ (FLOW BUILDER) ── */}
                <div className={`flex-1 flex flex-col bg-[#030712] transition-all duration-700 ${!isBuilding && 'opacity-30 pointer-events-none filter grayscale saturate-0'}`}>
                    <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-0 relative border-r border-white/5 custom-scrollbar">

                        {/* Visual Connector Line */}
                        <div className="absolute left-[39px] md:left-[63px] top-20 bottom-20 w-[1px] bg-white/5 border-l border-dashed border-emerald-500/30"></div>

                        {[
                            { step: 1, title: 'TETİKLEYİCİ GİRİŞİ (TRIGGER)', icon: <Zap className="text-amber-500" />, options: ['Planlanmış Görev (CRON-24H)', 'Dış Webhook Alıntısı', 'Veritabanı Değişimi', 'Ajan Emir Çıktısı'] },
                            { step: 2, title: 'PLATFORM / ERP BAĞLANTISI', icon: <Database className="text-blue-500" />, options: ['Mizanet: Stok Verisi Çek', 'Trendyol API: Sipariş Oku', 'Global Pazar Trendi Tara', 'Local Dosya Sistemi'] },
                            { step: 3, title: 'YAPAY ZEKA FİLTRESİ (AI)', icon: <BrainCircuit className="text-purple-500" />, options: ['Qwen 2.5 (Analiz)', 'Llama 3 (Özetleme)', 'Mistral (Karar)', 'Phi-3 (Kod)'] },
                            { step: 4, title: 'KADER / ÇIKTI HEDEFİ', icon: <Globe className="text-cyan-500" />, options: ['Telegram: Karargah Grubu', 'SMS: Kurucuya İlet', 'Karargah Veritabanına Yaz', 'Zinciri Yeniden Başlat'] }
                        ].map((s, i) => (
                            <div key={i} className="relative flex items-start gap-6 mb-12 animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                                <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-900 border border-white/5 flex items-center justify-center shrink-0 z-10 shadow-2xl">
                                    <div className="w-6 h-6 md:w-8 md:h-8">{s.icon}</div>
                                </div>
                                <div className="flex-1 bg-[#0b1120] border border-white/5 p-6 md:p-8 hover:border-emerald-500/30 transition-all">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{s.title}</h4>
                                        <span className="text-[8px] font-mono bg-white/5 px-2 py-1 rounded text-slate-400 font-black tracking-widest">ADIM 0{s.step}</span>
                                    </div>
                                    <select className="w-full bg-[#030712] border border-white/5 p-4 text-xs text-white outline-none focus:border-emerald-500/50 uppercase tracking-widest font-bold appearance-none cursor-pointer">
                                        {s.options.map((opt, idx) => (
                                            <option key={idx} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    {s.step === 3 && (
                                        <textarea
                                            placeholder="AI İÇİN ÖZEL TALİMAT (PROMPT) YAZIN..."
                                            className="w-full mt-4 bg-[#030712] border border-white/5 p-4 text-[10px] text-cyan-400 font-mono outline-none focus:border-purple-500/50 resize-none h-20 placeholder-slate-800"
                                        />
                                    )}
                                </div>
                            </div>
                        ))}

                        <div className="flex justify-end gap-4 pb-12">
                            <button
                                onClick={handleTestFlow}
                                disabled={isRunningTest}
                                className="px-6 py-4 border border-slate-700 bg-slate-900 text-slate-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                            >
                                {isRunningTest ? 'TETİKLENİYOR...' : 'SİMÜLASYONU BAŞLAT'}
                            </button>
                            <button className="px-8 py-4 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-600 transition-all">
                                ZİNCİRİ CANLIYA AL
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── SAĞ: AKTİF ZİNCİRLER LİSTESİ ── */}
                <div className="w-full lg:w-96 bg-[#060912] p-6 space-y-8 overflow-y-auto custom-scrollbar border-t lg:border-t-0 lg:border-l border-white/5">

                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-500" /> AKTİF ZİNCİR DURUMLARI
                        </h3>
                        <div className="space-y-4">
                            {flows.map((flow) => (
                                <div key={flow.id} className="relative bg-[#0b1120] border border-white/5 p-5 group hover:border-emerald-500/20 transition-all">
                                    {/* Status Indicator */}
                                    <div className={`absolute top-0 left-0 w-1 h-full ${flow.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500'
                                        }`} />

                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[11px] font-black text-white tracking-widest uppercase leading-tight">{flow.name}</span>
                                            <span className="text-[8px] font-mono text-slate-600 font-black italic">ID: {flow.id}</span>
                                        </div>
                                        <button
                                            onClick={() => toggleStatus(flow.id)}
                                            className={`p-2 border ${flow.status === 'ACTIVE' ? 'border-amber-500/20 text-amber-500 hover:bg-amber-500/10' : 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10'} transition-all`}
                                        >
                                            {flow.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/5 mb-4 font-mono">
                                        <div className="flex flex-col">
                                            <span className="text-[7px] text-slate-600 uppercase font-black">SON KOŞU</span>
                                            <span className="text-[9px] text-slate-300">{flow.lastRun}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[7px] text-slate-600 uppercase font-black">TOPLAM</span>
                                            <span className="text-[9px] text-slate-300">{flow.runCount} İŞLEM</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <span className="text-[8px] px-2 py-1 bg-white/5 border border-white/10 text-slate-400 font-bold tracking-tighter uppercase">{flow.trigger}</span>
                                        <span className="text-[8px] px-2 py-1 bg-white/5 border border-white/10 text-slate-400 font-bold tracking-tighter uppercase">{flow.aiNode}</span>
                                        <span className="text-[8px] px-2 py-1 bg-white/5 border border-white/10 text-slate-400 font-bold tracking-tighter uppercase">{flow.target}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AUTOMATION ENGINE STATS */}
                    <div className="bg-slate-950 p-5 border border-slate-900 space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                            <Power className="w-4 h-4 text-emerald-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OTOMASYON MOTORU</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">YÜK DURUMU</span>
                                <div className="flex items-center gap-1">
                                    <div className="w-24 h-1.5 bg-slate-900">
                                        <div className="h-full bg-emerald-500 w-[12%]" />
                                    </div>
                                    <span className="text-[8px] font-mono text-emerald-400">%12</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">HATA ORANI</span>
                                <span className="text-[9px] font-mono text-emerald-400">0.002%</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
