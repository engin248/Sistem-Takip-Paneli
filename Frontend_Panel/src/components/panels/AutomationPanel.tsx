"use client";
import React, { useState } from 'react';
import {
    Workflow, PlusCircle, Play, Pause, Save,
    Zap, Globe, Activity, Bot, Clock, ArrowRight, ArrowDown,
    CheckCircle2, X, Database, Layers, AlertCircle, Settings2, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

type FlowStatus = 'ACTIVE' | 'PAUSED';

interface AutomationFlow {
    id: string;
    name: string;
    trigger: string;
    agents: string[];
    target: string;
    status: FlowStatus;
    lastRun: string;
    runCount: number;
    description: string;
}

const MOCK_FLOWS: AutomationFlow[] = [
    { 
        id: 'FL-001', 
        name: 'GÜNLÜK RAKİP SİTE ANALİZİ', 
        trigger: 'Her Sabah 08:00', 
        agents: ['RADAR-OSINT', 'PİSAGOR'], 
        target: 'Excel & Telegram', 
        status: 'ACTIVE', 
        lastRun: 'Bugün 08:00', 
        runCount: 142,
        description: 'Belirlenen rakip sitelerdeki fiyat değişimlerini çeker ve dünkü verilerle kıyaslar.'
    },
    { 
        id: 'FL-002', 
        name: 'WHATSAPP KOD DESTEĞİ', 
        trigger: 'Yeni WhatsApp Mesajı', 
        agents: ['MİMAR-X'], 
        target: 'WhatsApp API', 
        status: 'ACTIVE', 
        lastRun: '10 dk önce', 
        runCount: 890,
        description: 'Müşterilerden veya ekipten gelen yazılım hatalarını inceler ve çözüm önerisiyle yanıtlar.'
    },
    { 
        id: 'FL-003', 
        name: 'SUNUCU SAĞLIK DENETİMİ', 
        trigger: 'CPU %80 Üzeri', 
        agents: ['KOD-MÜFETTİŞİ'], 
        target: 'Discord Alarm', 
        status: 'PAUSED', 
        lastRun: 'Dün 23:15', 
        runCount: 12,
        description: 'Sistem kaynaklarını tüketen ölü işlemleri bulur, sonlandırır ve IT ekibini uyarır.'
    },
];

export default function AutomationPanel() {
    const [flows, setFlows] = useState<AutomationFlow[]>(MOCK_FLOWS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Modal State
    const [editingFlow, setEditingFlow] = useState<Partial<AutomationFlow> | null>(null);

    const openNewFlowModal = () => {
        setEditingFlow({
            name: '', trigger: '', agents: [], target: '', description: ''
        });
        setIsModalOpen(true);
    };

    const loadTemplate = (type: string) => {
        if (type === 'SCRAPING') {
            setEditingFlow({
                name: 'GÜNLÜK VERİ ÇEKİMİ (SCRAPING)',
                trigger: 'ZAMAN: Her Sabah 08:00',
                agents: ['RADAR-OSINT (WEB)'],
                description: 'Rakip sitelere gir, dünkü fiyat değişimlerini ve yeni ürünleri çekip analiz et.',
                target: 'Fiyat_Analizi.xlsx ve Telegram'
            });
        } else if (type === 'REPORTING') {
            setEditingFlow({
                name: 'HAFTALIK FİNANS RAPORU',
                trigger: 'ZAMAN: Her Cuma 17:00',
                agents: ['PİSAGOR (AR-GE)'],
                description: 'Veritabanındaki haftalık satış, iade ve ciro kayıtlarını incele. Finansal analiz yap.',
                target: 'PDF Raporu ve Muhasebe Maili'
            });
        } else if (type === 'MAINTENANCE') {
            setEditingFlow({
                name: 'SİSTEM DENETİMİ VE ALARM',
                trigger: 'KOŞUL: Sunucu CPU > %80',
                agents: ['KOD-MÜFETTİŞİ (DENETİM)'],
                description: 'Sistemi yoran ölü işlemleri (zombie process) tespit et ve sonlandır.',
                target: 'Discord "Acil Müdahale" Kanalı'
            });
        }
        toast.success("Şablon Yüklendi!");
    };

    const deleteFlow = (id: string) => {
        if(window.confirm("Bu otomasyonu silmek istediğinize emin misiniz?")) {
            setFlows(prev => prev.filter(f => f.id !== id));
            toast.success("Otomasyon başarıyla silindi.");
        }
    };

    const toggleStatus = (id: string) => {
        setFlows(prev => prev.map(f => f.id === id
            ? { ...f, status: f.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }
            : f
        ));
    };

    return (
        <div className="flex flex-col h-full w-full bg-transparent animate-fade-in relative">
            <style>{`
                @keyframes datastream {
                    0% { transform: translateX(-100%); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateX(300%); opacity: 0; }
                }
                .animate-datastream {
                    animation: datastream 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
            `}</style>
            {/* HEADER */}
            <div className="shrink-0 p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10 border-b border-white/5 bg-black/20">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                        <Workflow className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-white tracking-[0.1em] md:tracking-[0.15em] uppercase drop-shadow-md">OTOMASYON MERKEZİ</h1>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_#f59e0b]"></span>
                            <p className="text-xs font-mono text-amber-400/80 uppercase tracking-widest">SİSTEM İŞ ZEKASI & ZAMANLANMIŞ GÖREVLER</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={openNewFlowModal}
                    className="w-full lg:w-auto px-8 py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)]"
                >
                    <PlusCircle className="w-5 h-5" /> YENİ OTOMASYON KUR
                </button>
            </div>

            {/* CONTENT GRID */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {flows.map(flow => (
                        <div key={flow.id} className="group relative bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 transition-all hover:border-amber-500/30 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)] overflow-hidden">
                            {/* Neon Top Border */}
                            <div className={`absolute top-0 left-0 w-full h-1 ${flow.status === 'ACTIVE' ? 'bg-amber-500 shadow-[0_0_15px_#f59e0b]' : 'bg-white/10'}`} />

                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className={`text-lg font-black tracking-widest uppercase ${flow.status === 'ACTIVE' ? 'text-white' : 'text-slate-400'}`}>{flow.name}</h3>
                                    </div>
                                    <p className="text-xs font-mono text-slate-500 max-w-[80%] leading-relaxed">{flow.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => deleteFlow(flow.id)}
                                        className="w-12 h-12 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center shrink-0 transition-all text-red-500/50 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                                        title="Otomasyonu Sil"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingFlow(flow);
                                            setIsModalOpen(true);
                                        }}
                                        className="w-12 h-12 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center shrink-0 transition-all text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20"
                                        title="Ayarları Düzenle"
                                    >
                                        <Settings2 className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => toggleStatus(flow.id)}
                                        className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                                            flow.status === 'ACTIVE' 
                                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                                            : 'bg-white/5 border-white/10 text-slate-500 hover:text-white hover:bg-white/10'
                                        }`}
                                        title={flow.status === 'ACTIVE' ? "Durdur" : "Başlat"}
                                    >
                                        {flow.status === 'ACTIVE' ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                                    </button>
                                </div>
                            </div>

                            {/* PIPELINE VISUALIZATION */}
                            <div className={`bg-black/40 border rounded-2xl p-4 mb-6 relative overflow-hidden transition-all duration-500 ${flow.status === 'ACTIVE' ? 'border-amber-500/30 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]' : 'border-white/5'}`}>
                                
                                {/* Dynamic Running Visual */}
                                {flow.status === 'ACTIVE' && (
                                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-amber-500/20 -translate-y-1/2 z-0 overflow-hidden hidden sm:block">
                                        <div className="w-1/3 h-full bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-datastream" />
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row items-center justify-between relative z-10 gap-4 sm:gap-0">
                                    <div className="flex flex-col items-center gap-2 w-full sm:w-1/3 text-center">
                                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-500 ${flow.status === 'ACTIVE' ? 'bg-amber-500/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-amber-500/10 border-amber-500/30'}`}>
                                            <Clock className={`w-4 h-4 ${flow.status === 'ACTIVE' ? 'text-amber-300 animate-pulse' : 'text-amber-400'}`} />
                                        </div>
                                        <span className="text-[10px] font-black text-amber-400/80 uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded">{flow.trigger}</span>
                                    </div>
                                    <ArrowRight className={`hidden sm:block w-5 h-5 shrink-0 transition-all duration-500 ${flow.status === 'ACTIVE' ? 'text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]' : 'text-slate-600'}`} />
                                    <ArrowDown className={`block sm:hidden w-5 h-5 shrink-0 transition-all duration-500 ${flow.status === 'ACTIVE' ? 'text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]' : 'text-slate-600'}`} />
                                    <div className="flex flex-col items-center gap-2 w-full sm:w-1/3 text-center">
                                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-500 ${flow.status === 'ACTIVE' ? 'bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-cyan-500/10 border-cyan-500/30'}`}>
                                            <Bot className={`w-4 h-4 ${flow.status === 'ACTIVE' ? 'text-cyan-300 animate-pulse' : 'text-cyan-400'}`} />
                                        </div>
                                        <span className="text-[10px] font-black text-cyan-400/80 uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded">{flow.agents.join(', ')}</span>
                                    </div>
                                    <ArrowRight className={`hidden sm:block w-5 h-5 shrink-0 transition-all duration-500 ${flow.status === 'ACTIVE' ? 'text-cyan-500 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]' : 'text-slate-600'}`} />
                                    <ArrowDown className={`block sm:hidden w-5 h-5 shrink-0 transition-all duration-500 ${flow.status === 'ACTIVE' ? 'text-cyan-500 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]' : 'text-slate-600'}`} />
                                    <div className="flex flex-col items-center gap-2 w-full sm:w-1/3 text-center">
                                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-500 ${flow.status === 'ACTIVE' ? 'bg-fuchsia-500/20 border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.4)]' : 'bg-fuchsia-500/10 border-fuchsia-500/30'}`}>
                                            <Globe className={`w-4 h-4 ${flow.status === 'ACTIVE' ? 'text-fuchsia-300 animate-pulse' : 'text-fuchsia-400'}`} />
                                        </div>
                                        <span className="text-[10px] font-black text-fuchsia-400/80 uppercase tracking-widest bg-black/50 px-2 py-0.5 rounded">{flow.target}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                                <div className="flex items-center gap-3">
                                    <Activity className="w-4 h-4 text-slate-500" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">SON ÇALIŞMA</span>
                                        <span className="text-[11px] font-mono text-slate-300">{flow.lastRun}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 justify-end">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">BAŞARILI İŞLEM</span>
                                        <span className="text-[11px] font-mono text-amber-400">{flow.runCount} ADET</span>
                                    </div>
                                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            </div>

            {/* ── YENİ OTOMASYON MODALI ── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
                    
                    <div className="relative w-full max-w-3xl max-h-[85vh] bg-black/60 border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
                        
                        {/* Modal Header */}
                        <div className="shrink-0 p-5 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white tracking-[0.1em] uppercase">YENİ GÜNLÜK RUTİN / OTOMASYON</h2>
                                    <p className="text-[9px] font-mono text-amber-500/70 uppercase tracking-widest mt-0.5">GÖREV ZİNCİRİ YAPILANDIRMASI</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto min-h-0 p-5 md:p-6 custom-scrollbar">
                            
                            {/* Quick Templates */}
                            <div className="mb-6">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">HIZLI ŞABLON YÜKLE:</label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <button onClick={() => loadTemplate('SCRAPING')} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 text-left group transition-all">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Database className="w-4 h-4 text-emerald-400" />
                                            <span className="text-[11px] font-black text-white tracking-widest group-hover:text-emerald-400 transition-colors">VERİ ÇEKİMİ</span>
                                        </div>
                                        <p className="text-[9px] text-slate-500 font-mono">Rakip analiz ve fiyat takibi şablonu.</p>
                                    </button>
                                    <button onClick={() => loadTemplate('REPORTING')} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 text-left group transition-all">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Layers className="w-4 h-4 text-blue-400" />
                                            <span className="text-[11px] font-black text-white tracking-widest group-hover:text-blue-400 transition-colors">FİNANS RAPORU</span>
                                        </div>
                                        <p className="text-[9px] text-slate-500 font-mono">Haftalık ciro ve bilanço analizi şablonu.</p>
                                    </button>
                                    <button onClick={() => loadTemplate('MAINTENANCE')} className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 text-left group transition-all">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertCircle className="w-4 h-4 text-orange-400" />
                                            <span className="text-[11px] font-black text-white tracking-widest group-hover:text-orange-400 transition-colors">SİSTEM DENETİMİ</span>
                                        </div>
                                        <p className="text-[9px] text-slate-500 font-mono">Sunucu sağlık kontrolü ve alarm şablonu.</p>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-white uppercase tracking-widest block mb-2">OTOMASYON BAŞLIĞI</label>
                                    <input 
                                        type="text" 
                                        value={editingFlow?.name || ''}
                                        onChange={e => setEditingFlow({...editingFlow, name: e.target.value})}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-colors font-bold uppercase tracking-wide"
                                        placeholder="Örn: GÜNLÜK RAKİP SİTE ANALİZİ"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Clock className="w-4 h-4 text-amber-400" />
                                            <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest">NE ZAMAN ÇALIŞACAK? (TETİKLEYİCİ)</label>
                                        </div>
                                        <input 
                                            type="text" 
                                            value={editingFlow?.trigger || ''}
                                            onChange={e => setEditingFlow({...editingFlow, trigger: e.target.value})}
                                            className="w-full bg-black/50 border border-amber-500/30 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors font-mono"
                                            placeholder="Örn: Her Sabah 08:00"
                                        />
                                    </div>

                                    <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Bot className="w-4 h-4 text-cyan-400" />
                                            <label className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">KİM YAPACAK? (GÖREVLİ AJAN)</label>
                                        </div>
                                        <select 
                                            value={editingFlow?.agents?.[0] || ''}
                                            onChange={e => setEditingFlow({...editingFlow, agents: [e.target.value]})}
                                            className="w-full bg-black/50 border border-cyan-500/30 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors uppercase tracking-widest font-bold appearance-none cursor-pointer"
                                        >
                                            <option value="">-- AJAN SEÇİN --</option>
                                            <option value="MİMAR-X (YAZILIM)">MİMAR-X (YAZILIM)</option>
                                            <option value="PİSAGOR (AR-GE)">PİSAGOR (AR-GE)</option>
                                            <option value="RADAR-OSINT (WEB)">RADAR-OSINT (WEB)</option>
                                            <option value="KOD-MÜFETTİŞİ (DENETİM)">KOD-MÜFETTİŞİ (DENETİM)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-2">AJANIN GÜNLÜK GÖREVİ (PROMPT / TALİMAT)</label>
                                    <textarea 
                                        value={editingFlow?.description || ''}
                                        onChange={e => setEditingFlow({...editingFlow, description: e.target.value})}
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-colors font-mono resize-none h-16 custom-scrollbar"
                                        placeholder="Ajana ne yapması gerektiğini detaylıca anlatın..."
                                    />
                                </div>

                                <div className="bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-2xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Globe className="w-4 h-4 text-fuchsia-400" />
                                        <label className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">SONUÇ NEREYE İLETİLECEK? (HEDEF)</label>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={editingFlow?.target || ''}
                                        onChange={e => setEditingFlow({...editingFlow, target: e.target.value})}
                                        className="w-full bg-black/50 border border-fuchsia-500/30 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-fuchsia-500 transition-colors font-mono"
                                        placeholder="Örn: Muhasebe Exceli ve Telegram Grubu"
                                    />
                                </div>

                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="shrink-0 p-5 border-t border-white/5 bg-black/40 flex flex-col sm:flex-row justify-end gap-3">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-white/10 text-white font-black text-[11px] uppercase tracking-widest hover:bg-white/5 transition-colors text-center"
                            >
                                İPTAL ET
                            </button>
                            <button 
                                onClick={() => {
                                    toast.success('Yeni Otomasyon Başarıyla Kaydedildi!');
                                    setIsModalOpen(false);
                                }}
                                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-amber-600 text-white font-black text-[11px] uppercase tracking-widest shadow-[0_0_30px_rgba(245,158,11,0.4)] hover:bg-amber-500 transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-4 h-4" /> KAYDET VE AKTİFLEŞTİR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
