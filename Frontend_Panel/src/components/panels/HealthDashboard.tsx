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
    <div className="flex flex-col h-full w-full bg-[#030712] text-slate-100 animate-fade-in">

      {/* ── ÜST BAR: GLOBAL KONTROL & METRİKLER ── */}
      <header className="shrink-0 p-6 border-b border-white/5 bg-[#0b1120]/50 backdrop-blur-md flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.1)]">
            <Shield className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-[0.2em] uppercase">SİSTEM ALT YAPISI</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 uppercase tracking-widest leading-none">
                <div className="w-1.5 h-1.5 rounded-none bg-emerald-500 animate-pulse"></div>
                Global Sağlık: %94
              </span>
              <span className="w-1 h-1 bg-slate-700"></span>
              <span className="text-[9px] font-bold text-slate-550 uppercase tracking-widest">{MOCK_SYSTEMS.length} AKTİF NODE İZLENİYOR</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-1.5">
          <div className="flex items-center gap-2 px-3 border-r border-slate-800">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="SİSTEM BUL..."
              className="bg-transparent border-none text-[10px] font-bold outline-none placeholder:text-slate-700 w-32 uppercase tracking-widest"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            <button onClick={() => setViewMode('GRID')} className={`p-1.5 transition-colors ${viewMode === 'GRID' ? 'bg-cyan-500 text-white' : 'text-slate-600 hover:text-white'}`}><LayoutGrid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('LIST')} className={`p-1.5 transition-colors ${viewMode === 'LIST' ? 'bg-cyan-500 text-white' : 'text-slate-600 hover:text-white'}`}><List className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {/* ── İKİNCİL BAR: FİLTRELER ── */}
      <div className="shrink-0 px-6 py-3 border-b border-white/5 flex items-center justify-between gap-4 overflow-x-auto custom-scrollbar no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {['ALL', 'CORE', 'AI', 'ERP', 'DATABASE', 'NETWORK'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat as any)}
              className={`px-4 py-1.5 text-[9px] font-black tracking-widest border transition-all ${filter === cat ? 'bg-white text-black border-white' : 'border-slate-800 text-slate-500 hover:border-slate-600'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-4 text-[9px] font-bold text-slate-600 uppercase tracking-widest ml-auto">
          <span>Yük Bazlı Sıralama</span>
          <div className="w-24 h-1.5 bg-slate-900 border border-slate-800 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-cyan-500/50 w-1/3"></div>
          </div>
        </div>
      </div>

      {/* ── ANA İÇERİK: GRID SİSTEMİ ── */}
      <main className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#030712]">
        {viewMode === 'GRID' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSystems.map(sys => (
              <div key={sys.id} className="relative group bg-[#0b1120] border border-slate-800/80 hover:border-cyan-500/20 transition-all p-5 flex flex-col gap-5 overflow-hidden">
                {/* Status Edge */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${sys.status === 'ONLINE' ? 'bg-emerald-500' :
                  sys.status === 'STANDBY' ? 'bg-blue-500' :
                    sys.status === 'CRITICAL' ? 'bg-red-500' : 'bg-slate-700'
                  }`} />

                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-black tracking-tighter text-white uppercase">{sys.name}</span>
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">{sys.id} • {sys.category}</span>
                  </div>
                  <button className="text-slate-600 hover:text-white transition-colors"><MoreVertical className="w-4 h-4" /></button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-500 uppercase">SİSTEM YÜKÜ</span>
                    <span className={sys.load > 90 ? 'text-red-400' : 'text-slate-300'}>%{sys.load}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 border border-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${sys.load > 90 ? 'bg-red-500' : sys.load > 50 ? 'bg-amber-500' : 'bg-cyan-500'
                        }`}
                      style={{ width: `${sys.load}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-800/50 pt-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-600 uppercase mb-0.5">Uptime</span>
                    <span className="text-[10px] font-mono text-slate-300 tracking-tight">{sys.uptime}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-600 uppercase mb-0.5">Son Aksiyon</span>
                    <span className="text-[10px] font-mono text-slate-300 tracking-tight truncate">{sys.lastAction}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleCommand(sys.id, 'RESTART')}
                    disabled={loading === sys.id}
                    className="flex-1 bg-slate-900 border border-slate-800 text-[10px] font-black uppercase text-slate-400 hover:text-white hover:bg-red-500/10 transition-all py-2.5"
                  >
                    {loading === sys.id ? '...' : <RefreshCw className="w-3.5 h-3.5 mx-auto" />}
                  </button>
                  <button
                    onClick={() => handleCommand(sys.id, 'DIAGNOSTIC')}
                    disabled={loading === sys.id}
                    className="flex-5 bg-slate-900 border border-slate-800 text-[9px] font-black uppercase text-slate-400 py-2.5 px-4 tracking-[0.2em] hover:text-cyan-400 hover:bg-cyan-500/5 transition-all text-center"
                  >
                    ANALİZ ET
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="space-y-2">
            {filteredSystems.map(sys => (
              <div key={sys.id} className="bg-[#0b1120] border border-slate-800/80 p-3 flex items-center gap-6 group hover:border-cyan-500/20 transition-all">
                <div className={`w-1.5 h-8 ${sys.status === 'ONLINE' ? 'bg-emerald-500' :
                  sys.status === 'STANDBY' ? 'bg-blue-500' :
                    sys.status === 'CRITICAL' ? 'bg-red-500' : 'bg-slate-700'
                  }`} />
                <div className="flex-1 grid grid-cols-5 items-center gap-4">
                  <div className="col-span-1 flex flex-col">
                    <span className="text-[12px] font-black text-white uppercase">{sys.name}</span>
                    <span className="text-[8px] font-mono text-slate-600 uppercase">{sys.endpoint}</span>
                  </div>
                  <div className="col-span-1 text-[9px] font-black text-slate-500 uppercase tracking-widest">{sys.category}</div>
                  <div className="col-span-1">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1 bg-slate-950 border border-slate-800">
                        <div className="h-full bg-cyan-500" style={{ width: `${sys.load}%` }} />
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">%{sys.load}</span>
                    </div>
                  </div>
                  <div className="col-span-1 text-[9px] font-mono text-slate-400 text-center">{sys.uptime}</div>
                  <div className="col-span-1 flex justify-end gap-2">
                    <button className="p-2 border border-slate-800 hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-all"><RefreshCw className="w-3.5 h-3.5" /></button>
                    <button className="p-2 border border-slate-800 hover:bg-cyan-500/10 text-slate-600 hover:text-cyan-400 transition-all"><Settings className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <div className="px-6 pb-6">
        <DepartmentCommsBox department="SİSTEM YÖNETİMİ" />
      </div>

      {/* ── ALT BAR: REAL-TIME LOG STREAM ── */}
      <footer className="shrink-0 h-10 bg-slate-900/80 border-t border-white/5 flex items-center px-6 gap-6">
        <div className="flex items-center gap-2 text-cyan-500 animate-pulse">
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

