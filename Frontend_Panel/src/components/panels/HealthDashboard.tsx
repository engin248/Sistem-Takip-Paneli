"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
  Server, Cpu, Activity, Shield, Zap, Layers,
  Terminal, Power, RefreshCw, AlertTriangle,
  Search, Filter, LayoutGrid, List, ChevronRight,
  Database, Globe, Bot, MoreVertical, Settings
} from 'lucide-react';
import DepartmentCommsBox from '../shared/DepartmentCommsBox';
import { toast } from 'sonner';

// ============================================================
// UNIVERSAL SYSTEM INFRASTRUCTURE CONTROLLER (USIC)
// ============================================================
// Bu bileşen, lokal ve uzak sistemleri yönetmek için tasarlanmış
// evrensel bir arayüzdür. Her türlü mikroservis ve panel buraya entegre edilebilir.
// ============================================================

type SystemCategory = 'CORE' | 'AI' | 'ERP' | 'DATABASE' | 'NETWORK';
type SystemStatus = 'ONLINE' | 'STANDBY' | 'CRITICAL' | 'OFFLINE';

interface UniversalSystem {
  id: string;
  name: string;
  category: SystemCategory;
  status: SystemStatus;
  load: number; // 0-100
  uptime: string;
  endpoint: string;
  lastAction: string;
}

const MOCK_SYSTEMS: UniversalSystem[] = [
  { id: 'US-001', name: 'SİSTEM CORE ENGINE', category: 'CORE', status: 'ONLINE', load: 12, uptime: '14d 2h', endpoint: '127.0.0.1:3000', lastAction: 'L2 ONAY' },
  { id: 'US-002', name: 'OLLAMA AI CLUSTER', category: 'AI', status: 'ONLINE', load: 85, uptime: '2d 14h', endpoint: '127.0.0.1:11434', lastAction: 'INFERENCE' },
  { id: 'US-003', name: 'SUNUCU PRIMARY', category: 'ERP', status: 'ONLINE', load: 34, uptime: '45d 8h', endpoint: 'Sunucu.internal', lastAction: 'SYNC' },
  { id: 'US-004', name: 'VECTOR DB (PINE)', category: 'DATABASE', status: 'ONLINE', load: 5, uptime: '120d 1h', endpoint: 'db.v-SİSTEM', lastAction: 'INDEX' },
  { id: 'US-005', name: 'WHATSAPP BRIDGE', category: 'NETWORK', status: 'STANDBY', load: 0, uptime: '4h 12m', endpoint: 'bridge.api', lastAction: 'IDLE' },
  { id: 'US-006', name: 'SUNUCU SECONDARY', category: 'ERP', status: 'CRITICAL', load: 98, uptime: '12m', endpoint: 'Sunucu-backup.internal', lastAction: 'OVERLOAD' },
];

export default function HealthDashboard() {
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [filter, setFilter] = useState<SystemCategory | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const filteredSystems = useMemo(() => {
    return MOCK_SYSTEMS.filter(s => {
      const matchFilter = filter === 'ALL' || s.category === filter;
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [filter, search]);

  const handleCommand = (id: string, cmd: string) => {
    setLoading(id);
    setTimeout(() => {
      setLoading(null);
      toast.success(`[${id}] SİSTEMİNE '${cmd}' KOMUTU İLETİLDİ.`);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-slate-100 animate-fade-in">

      {/* ── ÜST BAR: GLOBAL KONTROL & METRİKLER ── */}
      <header className="shrink-0 p-8 border-b border-white/5 relative z-10 bg-black/40 backdrop-blur-3xl overflow-hidden flex flex-wrap items-center justify-between gap-6">
        <div className="absolute top-[-50%] left-[-10%] w-[30%] h-[200%] bg-blue-500/10 blur-[80px] pointer-events-none rotate-12" />
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <Server className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-300 to-blue-600 tracking-[0.2em] uppercase drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                SİSTEM ALT YAPISI
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-2 text-[11px] font-bold text-emerald-400 uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Global Sağlık: %94
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{MOCK_SYSTEMS.length} AKTİF NODE İZLENİYOR</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-black/50 border border-white/10 p-2 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl relative z-10">
          <div className="flex items-center gap-3 px-4 border-r border-white/10">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="SİSTEM BUL..."
              className="bg-transparent border-none text-[11px] font-bold outline-none text-white placeholder:text-slate-600 w-40 uppercase tracking-widest"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 pr-1">
            <button onClick={() => setViewMode('GRID')} className={`p-2 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}><List className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {/* ── İKİNCİL BAR: FİLTRELER ── */}
      <div className="shrink-0 px-8 py-4 border-b border-white/5 bg-black/20 flex items-center justify-between gap-4 overflow-x-auto custom-scrollbar no-scrollbar relative z-10">
        <div className="flex gap-3 min-w-max">
          {['ALL', 'CORE', 'AI', 'ERP', 'DATABASE', 'NETWORK'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat as any)}
              className={`px-5 py-2 text-[10px] rounded-xl font-black tracking-[0.15em] transition-all duration-300 border ${filter === cat ? 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20 hover:text-white'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-auto">
          <span>Yük Bazlı Sıralama</span>
          <div className="w-32 h-2 rounded-full bg-black/50 border border-white/10 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-fuchsia-500 w-1/3 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
          </div>
        </div>
      </div>

      {/* ── ANA İÇERİK: GRID SİSTEMİ ── */}
      <main className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-transparent">
        {viewMode === 'GRID' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSystems.map(sys => {
                const statusColors: any = {
                    ONLINE: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', fill: 'bg-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]', line: 'bg-emerald-500' },
                    STANDBY: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', fill: 'bg-cyan-500', glow: 'shadow-[0_0_15px_rgba(6,182,212,0.5)]', line: 'bg-cyan-500' },
                    CRITICAL: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', fill: 'bg-rose-500', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.5)]', line: 'bg-rose-500' },
                    OFFLINE: { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', fill: 'bg-slate-500', glow: 'shadow-[0_0_15px_rgba(100,116,139,0.5)]', line: 'bg-slate-500' }
                };
                const theme = statusColors[sys.status];

                return (
              <div key={sys.id} className={`relative group bg-black/40 backdrop-blur-2xl border border-white/5 hover:border-white/20 transition-all duration-500 p-6 rounded-3xl flex flex-col gap-6 overflow-hidden hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,0,0,0.5)]`}>
                {/* Ambient Glow */}
                <div className={`absolute -top-10 -right-10 w-32 h-32 ${theme.bg} blur-[50px] rounded-full group-hover:scale-[2] transition-transform duration-700`} />
                
                {/* Top Status Edge */}
                <div className={`absolute top-0 left-0 w-full h-1 ${theme.line} ${theme.glow}`} />

                <div className="flex justify-between items-start relative z-10">
                  <div className="flex flex-col">
                    <span className="text-[15px] font-black tracking-widest text-white uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{sys.name}</span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em] mt-1">{sys.id} • {sys.category}</span>
                  </div>
                  <button className="text-slate-500 hover:text-white transition-colors bg-white/5 rounded-lg p-1 border border-white/5 hover:border-white/20"><MoreVertical className="w-4 h-4" /></button>
                </div>

                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between text-[11px] font-black tracking-widest">
                    <span className="text-slate-500 uppercase">SİSTEM YÜKÜ</span>
                    <span className={`${theme.text} drop-shadow-[0_0_5px_currentColor]`}>%{sys.load}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/50 border border-white/10 overflow-hidden relative">
                    <div
                      className={`absolute inset-y-0 left-0 ${theme.fill} ${theme.glow} transition-all duration-1000`}
                      style={{ width: `${sys.load}%` }}
                    >
                        <div className="absolute inset-0 w-full h-full bg-white/20 animate-shimmer" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-5 relative z-10">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">UPTIME</span>
                    <span className="text-[11px] font-mono text-white tracking-tight">{sys.uptime}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">SON AKSİYON</span>
                    <span className={`text-[11px] font-mono tracking-tight truncate ${theme.text}`}>{sys.lastAction}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2 relative z-10">
                  <button
                    onClick={() => handleCommand(sys.id, 'RESTART')}
                    disabled={loading === sys.id}
                    className="flex-1 rounded-xl bg-black/40 border border-white/10 text-[10px] font-black uppercase text-slate-400 hover:text-white hover:bg-white/10 transition-all py-3 shadow-inner"
                  >
                    {loading === sys.id ? '...' : <RefreshCw className={`w-4 h-4 mx-auto ${loading === sys.id ? 'animate-spin' : ''}`} />}
                  </button>
                  <button
                    onClick={() => handleCommand(sys.id, 'DIAGNOSTIC')}
                    disabled={loading === sys.id}
                    className={`flex-[3] rounded-xl bg-black/40 border border-white/10 text-[10px] font-black uppercase text-white py-3 px-4 tracking-[0.2em] hover:bg-white/5 hover:border-white/30 transition-all text-center group-hover:${theme.glow} group-hover:border-${theme.line.replace('bg-', '')}/30`}
                  >
                    ANALİZ ET
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="space-y-3">
            {filteredSystems.map(sys => {
                const statusColors: any = {
                    ONLINE: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', fill: 'bg-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]', line: 'bg-emerald-500' },
                    STANDBY: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', fill: 'bg-cyan-500', glow: 'shadow-[0_0_15px_rgba(6,182,212,0.5)]', line: 'bg-cyan-500' },
                    CRITICAL: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', fill: 'bg-rose-500', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.5)]', line: 'bg-rose-500' },
                    OFFLINE: { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', fill: 'bg-slate-500', glow: 'shadow-[0_0_15px_rgba(100,116,139,0.5)]', line: 'bg-slate-500' }
                };
                const theme = statusColors[sys.status];
                
                return (
              <div key={sys.id} className={`bg-black/40 backdrop-blur-2xl border border-white/5 p-4 rounded-2xl flex items-center gap-6 group hover:border-white/20 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 transition-all relative overflow-hidden`}>
                <div className={`absolute top-0 left-0 w-1.5 h-full ${theme.line} ${theme.glow}`} />
                <div className={`absolute -right-10 -top-10 w-40 h-40 ${theme.bg} blur-[60px] rounded-full pointer-events-none`} />
                
                <div className="flex-1 grid grid-cols-6 items-center gap-6 relative z-10">
                  <div className="col-span-2 flex flex-col pl-2">
                    <span className="text-[13px] font-black tracking-widest text-white uppercase">{sys.name}</span>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">{sys.id} • {sys.endpoint}</span>
                  </div>
                  <div className="col-span-1 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${theme.fill} ${theme.glow} animate-pulse`} />
                    {sys.category}
                  </div>
                  <div className="col-span-1">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-[8px] font-black text-slate-500 tracking-widest">
                        <span>YÜK</span>
                        <span className={theme.text}>%{sys.load}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/50 border border-white/10 overflow-hidden relative">
                        <div className={`absolute inset-y-0 left-0 ${theme.fill} ${theme.glow}`} style={{ width: `${sys.load}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1 text-[10px] font-mono text-slate-400 text-center tracking-widest">{sys.uptime}</div>
                  <div className="col-span-1 flex justify-end gap-3">
                    <button className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all shadow-inner"><RefreshCw className="w-4 h-4" /></button>
                    <button className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all shadow-inner"><Settings className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </main>
      
      <div className="px-6 pb-6">
        <DepartmentCommsBox department="SİSTEM YÖNETİMİ" />
      </div>

      {/* ── ALT BAR: REAL-TIME LOG STREAM ── */}
      <footer className="shrink-0 h-10 bg-black/20/80 border-t border-white/5 flex items-center px-6 gap-6">
        <div className="flex items-center gap-2 text-rose-500 animate-pulse">
          <Terminal className="w-3.5 h-3.5" />
          <span className="text-[8px] font-black uppercase tracking-[0.3em]">CANLI LOG AKIŞI</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-8 text-[8px] font-mono text-slate-500 tracking-tight animate-[marquee_30s_linear_infinite] whitespace-nowrap">
            <span>[19:12:45] OLLAMA: Model "Llama-3" yükleme yüzdesi %85...</span>
            <span>[19:12:42] SUNUCU: Stok verileri "Warehouse-B" ile senkronize edildi.</span>
            <span>[19:12:39] CORE: L2 Doğrulama protokolleri tüm departmanlar için onaylandı.</span>
            <span>[19:12:35] NETWORK: WhatsApp köprüsü stabil, mesaj gecikmesi: 450ms.</span>
            <span>[19:12:45] OLLAMA: Model "Llama-3" yükleme yüzdesi %85...</span>
          </div>
        </div>
      </footer>

    </div>
  );
}


