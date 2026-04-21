"use client";
import React, { useState, useEffect } from 'react';
import {
  Target, ShieldCheck, Bug,
  Cpu, CheckCircle2, RefreshCw,
  Layers, BrainCircuit,
  ChevronRight, Bot, Radio, Terminal, Settings, Sliders,
  Clock, Timer, X, Gauge, Zap
} from 'lucide-react';

export default function PlanningPanel() {
  const [mainPrompt, setMainPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [finalOutput, setFinalOutput] = useState("");
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [isJobStarted, setIsJobStarted] = useState(false);
  const [showBotModal, setShowBotModal] = useState(false);
  const [activeTab, setActiveTab] = useState('CALIB');
  const [elapsedTime, setElapsedTime] = useState(0);

  const [agentFilters, setAgentFilters] = useState([
    { id: 1, name: 'MİMARİ', icon: <Layers />, state: 'IDLE', output: '', time: '0.8s' },
    { id: 2, name: 'SNIPER', icon: <ShieldCheck />, state: 'IDLE', output: '', time: '1.2s' },
    { id: 3, name: 'MATEMATİK', icon: <Cpu />, state: 'IDLE', output: '', time: '0.5s' },
    { id: 4, name: 'GÖLGE', icon: <Bug />, state: 'IDLE', output: '', time: '1.0s' },
    { id: 5, name: 'KURMAY', icon: <Target />, state: 'IDLE', output: '', time: '0.5s' },
  ]);

  useEffect(() => {
    let interval: any;
    if (isProcessing) {
      interval = setInterval(() => setElapsedTime(prev => prev + 0.1), 100);
    } else if (!isProcessing && elapsedTime > 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const simulateProcessing = async () => {
    if (!mainPrompt.trim()) return;
    setIsProcessing(true);
    setFinalOutput("");
    setElapsedTime(0);
    setHealthScore(null);
    const outputs = ["✓ MİMARİ OK", "✓ GÜVENLİK OK", "✓ VERİ OK", "✓ ANALİZ OK", "✓ ONAY VERİLDİ"];
    for (let i = 0; i < agentFilters.length; i++) {
      setAgentFilters(p => p.map(a => a.id === i + 1 ? { ...a, state: 'THINKING' } : a));
      await new Promise(r => setTimeout(r, 800));
      setAgentFilters(p => p.map(a => a.id === i + 1 ? { ...a, state: 'DONE', output: outputs[i] } : a));
    }
    setFinalOutput(outputs.join("\n"));
    setIsProcessing(false);
  };

  return (
    <div className="h-full flex flex-col bg-[#02040a] p-2 gap-3 box-border overflow-hidden relative">

      {/* COMPACT MODAL WINDOW - FIXED CENTERED */}
      {showBotModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowBotModal(false)}></div>
          <div className="bg-[#0b1120] border border-white/10 w-80 shadow-2xl relative z-[10000] animate-scale-in overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.2)]">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#0d121f]">
              <div className="flex items-center gap-2">
                <Settings className="w-3.5 h-3.5 text-purple-400 rotate-90" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">BOT SİSTEM AYARLARI</span>
              </div>
              <button onClick={() => setShowBotModal(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/5 bg-black/20">
              <button onClick={() => setActiveTab('CALIB')} className={`flex-1 py-2.5 text-[8px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'CALIB' ? 'bg-purple-600/10 text-purple-400 border-b-2 border-purple-600' : 'text-slate-500 hover:text-slate-300'}`}>KALİBRASYON</button>
              <button onClick={() => setActiveTab('POWER')} className={`flex-1 py-2.5 text-[8px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'POWER' ? 'bg-purple-600/10 text-purple-400 border-b-2 border-purple-600' : 'text-slate-500 hover:text-slate-300'}`}>GÜÇ/MOD</button>
            </div>

            {/* Content */}
            <div className="p-6 h-48 flex flex-col justify-center">
              {activeTab === 'CALIB' ? (
                <div className="space-y-6 animate-fadeIn">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center"><div className="flex items-center gap-1.5"><Sliders className="w-3 h-3 text-purple-500" /><span className="text-[9px] font-black text-slate-300 uppercase">HASSASİYET</span></div><span className="text-[9px] font-mono text-purple-400 font-bold">%94</span></div>
                    <div className="h-1 bg-black border border-white/5 rounded-full overflow-hidden"><div className="h-full bg-purple-600 w-[94%] shadow-[0_0_8px_purple]"></div></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center"><div className="flex items-center gap-1.5"><Gauge className="w-3 h-3 text-purple-500" /><span className="text-[9px] font-black text-slate-300 uppercase">DERİNLİK</span></div><span className="text-[9px] font-mono text-purple-400 font-bold">LVL 4</span></div>
                    <div className="h-1 bg-black border border-white/5 rounded-full overflow-hidden"><div className="h-full bg-purple-600 w-3/4 shadow-[0_0_8px_purple]"></div></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between p-3 border border-purple-500/20 bg-purple-500/5 rounded">
                    <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-purple-400" /><span className="text-[9px] font-black text-white">YÜKSEK PERFORMANS</span></div>
                    <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_purple]"></div>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-white/5 bg-white/5 rounded opacity-40 grayscale">
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /><span className="text-[9px] font-black text-slate-400">EKONOMİ MODU</span></div>
                    <div className="w-3 h-3 rounded-full bg-slate-800"></div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#0d121f] border-t border-white/10 flex gap-2">
              <button onClick={() => setShowBotModal(false)} className="flex-1 py-2.5 bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-purple-500 shadow-lg active:scale-95 transition-all">KAYDET</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex gap-3 items-stretch overflow-hidden">

        {/* SOL PANEL */}
        <div className="w-[34%] flex flex-col gap-3 shrink-0">
          <div className="bg-[#0b1120] border border-purple-500/10 p-3 h-24 shrink-0 relative">
            <textarea value={mainPrompt} onChange={(e) => setMainPrompt(e.target.value)} placeholder="Parametre..." className="w-full h-full bg-transparent text-[13px] text-white outline-none resize-none font-bold placeholder:font-normal" />
            <button onClick={simulateProcessing} className="absolute bottom-2 right-2 px-5 py-1.5 text-[9px] font-black bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]">SÜZGECİ ÇALIŞTIR</button>
          </div>
          <div className="flex-1 border border-white/5 bg-[#05060c] p-3 space-y-2 overflow-y-auto custom-scrollbar">
            {agentFilters.map(a => (
              <div key={a.id} className={`flex items-center gap-3 p-3 border transition-all duration-300 ${a.state === 'THINKING' ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : a.state === 'DONE' ? 'border-purple-900/30 bg-purple-900/5' : 'border-white/5 bg-[#0a0c14] opacity-50'}`}>
                <div className={`w-8 h-8 border flex items-center justify-center shrink-0 ${a.state === 'THINKING' ? 'border-purple-400 text-purple-400 animate-pulse' : a.state === 'DONE' ? 'border-purple-600 text-purple-500' : 'border-slate-800 text-slate-700'}`}>{a.state === 'THINKING' ? <RefreshCw className="w-4 h-4 animate-spin" /> : a.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center"><span className={`text-[10px] font-black uppercase tracking-widest ${a.state === 'DONE' ? 'text-purple-200' : 'text-white'}`}>{a.name}</span><span className="text-[8px] font-mono text-purple-400/60 uppercase">{a.time}</span></div>
                  <p className="text-[8px] font-mono text-slate-500 uppercase mt-0.5 truncate">{a.output || 'BEKLENİYOR'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ORTA PANEL */}
        <div className="w-[33%] flex flex-col border border-white/10 bg-[#0a0c14] shrink-0 h-full">
          <div className="p-4 flex flex-col h-full box-border">
            <div className="h-12 border-b border-purple-500/10 flex items-center mb-4 shrink-0 px-2"><Terminal className="w-3.5 h-3.5 text-purple-400 mr-2" /><span className="text-[12px] font-black italic uppercase text-white tracking-widest">TOPLU ÇIKTI</span></div>
            <div className="flex-1 bg-black/60 border border-white/5 p-4 overflow-y-auto mb-4 font-mono text-[10px] shadow-inner relative custom-scrollbar">
              {finalOutput ? (
                <div className="space-y-4">
                  {finalOutput.split('\n').map((l, i) => <div key={i} className="flex gap-2 border-l-2 border-purple-500/30 pl-3 py-1 scale-in-center"><ChevronRight className="w-3 h-3 text-purple-400" /><span className="uppercase text-purple-100 font-bold tracking-tight">{l}</span></div>)}
                </div>
              ) : <div className="h-full flex flex-col items-center justify-center opacity-10"><BrainCircuit className="w-10 h-10 text-purple-500" /><span className="text-[10px] font-black tracking-widest mt-2 uppercase">STREAM SILENT</span></div>}
            </div>
            <div className="h-[120px] flex flex-col justify-end gap-2 shrink-0">
              <button onClick={() => setIsJobStarted(true)} className="h-12 bg-purple-600 font-black text-[11px] uppercase text-white shadow-[0_0_20px_purple/30]">GÖREVE BAŞLA</button>
              <button onClick={() => { setIsVerifying(true); setTimeout(() => { setHealthScore(98.4); setIsVerifying(false); }, 1500); }} className={`h-10 border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all ${isVerifying ? 'bg-purple-500/10 border-purple-400 text-purple-400' : 'text-slate-300 hover:border-purple-600/50'}`}>{isVerifying ? 'ANALİZ EDİLİYOR...' : healthScore ? `DOKTRİN SAĞLIĞI: %${healthScore}` : 'ÇIKTIYI DOĞRULA'}</button>
            </div>
          </div>
        </div>

        {/* SAĞ PANEL (İCRA) */}
        <div className="w-[33%] flex flex-col border border-white/10 bg-[#06080c] shrink-0 h-full box-border relative">
          <div className="p-4 flex flex-col h-full box-border">
            <div className="h-12 border-b border-purple-500/10 flex items-center mb-4 shrink-0 px-4 justify-between">
              <div className="flex items-center"><Radio className="w-3.5 h-3.5 mr-2 text-purple-400" /><span className="text-[12px] font-black italic uppercase text-white tracking-widest">İŞÇİ MİMAR</span></div>
              <button onClick={() => setShowBotModal(true)} className="text-slate-400 hover:text-purple-400 transition-all hover:rotate-90 pr-1"><Settings className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 bg-black border border-white/10 flex flex-col items-center justify-center relative overflow-hidden mb-4 shadow-2xl">
              <div className="flex flex-col items-center justify-center relative">
                <div className={`absolute inset-[-40px] bg-purple-600/30 blur-[40px] rounded-full transition-all duration-700 ${isJobStarted ? 'opacity-100 scale-110 animate-pulse' : 'opacity-0 scale-50'}`}></div>
                <Settings className={`w-16 h-16 absolute text-purple-500/40 opacity-20 ${isJobStarted ? 'animate-spin-slow opacity-90' : ''}`} />
                <Bot className={`w-16 h-16 relative z-10 transition-all duration-700 ${isJobStarted ? 'text-white drop-shadow-[0_0_35px_rgba(168,85,247,0.9)] scale-110' : 'text-slate-400 opacity-60'}`} />
              </div>
              <div className="h-6 mt-4 flex items-center justify-center relative z-20">
                <span className={`text-[11px] font-black uppercase tracking-[0.5em] transition-all duration-500 ${isJobStarted ? 'text-white drop-shadow-[0_0_15px_purple]' : 'text-slate-400 opacity-30'}`}>{isJobStarted ? 'I C R A D A' : 'GÖREV BEKLENİYOR'}</span>
              </div>
            </div>

            <div className="h-[120px] flex flex-col items-center justify-center border-t border-white/10 bg-black/60 box-border gap-4 shrink-0 shadow-inner">
              <div className="flex gap-8 items-center bg-[#0a0c14]/50 px-6 py-4 border border-white/5">
                <div className="flex flex-col items-center min-w-[70px]">
                  <div className="flex items-center gap-1.5 mb-1.5"><Clock className="w-3 h-3 text-purple-400" /><span className="text-[7px] text-slate-400 font-black uppercase tracking-tighter">İŞLEM SÜRESİ</span></div>
                  <span className="text-[12px] font-mono text-white font-black leading-none">{elapsedTime.toFixed(1)}S</span>
                </div>
                <div className="w-px h-10 bg-white/10"></div>
                <div className="flex flex-col items-center min-w-[70px]">
                  <div className="flex items-center gap-1.5 mb-1.5"><Timer className="w-3 h-3 text-purple-400" /><span className="text-[7px] text-slate-400 font-black uppercase tracking-tighter">TOPLAM GEREKEN</span></div>
                  <span className="text-[12px] font-mono text-white font-black leading-none">4.2S</span>
                </div>
              </div>
              <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest opacity-60 italic leading-none">STP-V1 // SECURE_NODE</span>
            </div>
          </div>
        </div>

      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(168, 85, 247, 0.2); }
        @keyframes scale-in {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.15s ease-out forwards; }
      `}</style>
    </div>
  );
}
