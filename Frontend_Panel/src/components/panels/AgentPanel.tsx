"use client";
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Bot, Shield, Zap, Activity,
  Terminal, Search, Filter, ChevronRight,
  Target, Award, AlertCircle, RefreshCw,
  MoreVertical, Power, Settings, Plus,
  Cpu, MessageSquare, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// AGENT MANAGEMENT COMMAND CENTER (AMCC)
// ============================================================
// Bu bileşen, ANA SİSTEM ve ona bağlı tüm alt birimleri
// yönetmek, görev atamak ve performans izlemek için tasarlanmıştır.
// ============================================================

type AgentStatus = 'ACTIVE' | 'IDLE' | 'BUSY' | 'ERROR';
type AgentTier = 'OVERLORD' | 'OPERATIONAL' | 'SUPPORT' | 'AUDITOR';

interface Agent {
  id: string;
  codename: string;
  tier: AgentTier;
  status: AgentStatus;
  specialty: string;
  tasksCompleted: number;
  health: number; // 0-100
  lastAction: string;
}

const MOCK_AGENTS: Agent[] = [
  { id: 'AG-01', codename: 'SİSTEM CORE', tier: 'OVERLORD', status: 'ACTIVE', specialty: 'Orchestration', tasksCompleted: 1450, health: 100, lastAction: 'Sistem denetimi aktif' },
  { id: 'AG-02', codename: 'MATH-JUDGE', tier: 'AUDITOR', status: 'ACTIVE', specialty: 'Quality Control', tasksCompleted: 890, health: 98, lastAction: 'Finans verisi doğrulandı' },
  { id: 'AG-03', codename: 'DEAD-WORKER', tier: 'OPERATIONAL', status: 'BUSY', specialty: 'Data Processing', tasksCompleted: 3421, health: 92, lastAction: 'SQL Enjeksiyon taraması...' },
  { id: 'AG-04', codename: 'FRONT-GUARD', tier: 'OPERATIONAL', status: 'IDLE', specialty: 'UI/UX Integrity', tasksCompleted: 560, health: 100, lastAction: 'Beklemede' },
  { id: 'AG-05', codename: 'REFL-BOT', tier: 'SUPPORT', status: 'ACTIVE', specialty: 'Self-Correction', tasksCompleted: 120, health: 100, lastAction: 'Hafıza optimizasyonu' },
  { id: 'AG-06', codename: 'L2-AUDITOR', tier: 'AUDITOR', status: 'ERROR', specialty: 'Security Audit', tasksCompleted: 230, health: 45, lastAction: 'Zaman aşımı hatası!' },
];

export default function AgentPanel() {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [filter, setFilter] = useState<AgentTier | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredAgents = agents.filter(a => {
    const matchFilter = filter === 'ALL' || a.tier === filter;
    const matchSearch = a.codename.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Ajan kadrosu ve performans verileri güncellendi.");
    }, 1500);
  };

  const getStatusColor = (status: AgentStatus) => {
    switch (status) {
      case 'ACTIVE': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'BUSY': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'ERROR': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#030712] animate-fade-in custom-scrollbar overflow-y-auto">

      {/* ── HEADER: KOMUTA MERKEZİ ÜST BİLGİ ── */}
      <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Bot className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-[0.2em] uppercase">AJAN YÖNETİM MERKEZİ</h1>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-1">Otonom Ajan Kadrosu ve Görev Denetimi</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="AJAN ARA..."
              className="bg-transparent border-none outline-none text-[10px] font-bold text-white uppercase tracking-widest w-32"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-purple-600/10 border border-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            SENKRONİZE ET
          </button>
          <button className="px-4 py-2 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" />
            YENİ AJAN
          </button>
        </div>
      </div>

      {/* ── İSTATİSTİK ŞERİDİ ── */}
      <div className="px-6 py-4 border-b border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Toplam Birim</span>
          <span className="text-lg font-black text-white">{agents.length} AKTİF</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Görev İcrası</span>
          <span className="text-lg font-black text-emerald-400">6.230+</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Genel Performans</span>
          <span className="text-lg font-black text-purple-400">%98.4</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">L2 Denetim</span>
          <span className="text-lg font-black text-amber-500">Sıkı</span>
        </div>
      </div>

      {/* ── FİLTRE BARI ── */}
      <div className="px-6 py-3 border-b border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
        {(['ALL', 'OVERLORD', 'OPERATIONAL', 'AUDITOR', 'SUPPORT'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-[9px] font-black tracking-widest border transition-all ${filter === f ? 'bg-white text-black border-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'
              }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── AJAN KARTLARI GRİD ── */}
      <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-[#030712]">
        {filteredAgents.map(agent => (
          <div key={agent.id} className="group relative bg-[#0b1120] border border-slate-800/80 hover:border-purple-500/30 transition-all duration-300 p-5 flex flex-col gap-6 overflow-hidden">

            {/* Status Indicator */}
            <div className={`absolute top-0 right-0 px-3 py-1.5 text-[8px] font-black tracking-widest border-l border-b border-white/5 ${getStatusColor(agent.status)}`}>
              {agent.status}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-950 border border-white/5 flex items-center justify-center shrink-0">
                {agent.tier === 'OVERLORD' && <Shield className="w-6 h-6 text-purple-400" />}
                {agent.tier === 'AUDITOR' && <Activity className="w-6 h-6 text-amber-400" />}
                {agent.tier === 'OPERATIONAL' && <Cpu className="w-6 h-6 text-cyan-400" />}
                {agent.tier === 'SUPPORT' && <MessageSquare className="w-6 h-6 text-emerald-400" />}
              </div>
              <div>
                <h3 className="text-[14px] font-black text-white tracking-widest uppercase">{agent.codename}</h3>
                <p className="text-[9px] font-mono text-slate-500 mt-0.5">{agent.id} • {agent.tier}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Health Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                  <span className="text-slate-500">Birim Sağlığı</span>
                  <span className="text-white">%{agent.health}</span>
                </div>
                <div className="h-1.5 bg-slate-950 border border-white/5 w-full overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${agent.health}%` }} />
                </div>
              </div>

              {/* Info Rows */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/50 p-2 border border-white/5">
                  <span className="text-[8px] font-bold text-slate-600 block uppercase mb-1">Uzmanlık</span>
                  <span className="text-[10px] font-mono text-slate-300 truncate block">{agent.specialty}</span>
                </div>
                <div className="bg-slate-950/50 p-2 border border-white/5">
                  <span className="text-[8px] font-bold text-slate-600 block uppercase mb-1">Tamamlanan</span>
                  <span className="text-[10px] font-mono text-slate-300 block">{agent.tasksCompleted} Emir</span>
                </div>
              </div>

              {/* Last Action Terminal */}
              <div className="bg-[#050914] p-3 border border-white/5 flex items-start gap-3">
                <Terminal className="w-3.5 h-3.5 text-slate-700 shrink-0 mt-0.5" />
                <p className="text-[9px] font-mono text-slate-400 leading-relaxed italic truncate">
                  "{agent.lastAction}"
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button className="flex-1 py-2.5 bg-slate-900 border border-white/5 text-[9px] font-black uppercase text-slate-500 hover:text-white hover:bg-purple-600/20 transition-all tracking-widest">
                EMİR VER
              </button>
              <button className="w-11 py-2.5 bg-slate-900 border border-white/5 text-slate-600 hover:text-white flex items-center justify-center transition-all">
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}

