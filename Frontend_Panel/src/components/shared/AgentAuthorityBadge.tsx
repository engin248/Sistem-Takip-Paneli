"use client";
import React from 'react';
import { Shield, BrainCircuit, Activity } from 'lucide-react';

interface AgentAuthorityBadgeProps {
  agentName: string;
  agentRole: string;
  status?: 'ACTIVE' | 'IDLE' | 'ANALYZING';
}

export default function AgentAuthorityBadge({ agentName, agentRole, status = 'ACTIVE' }: AgentAuthorityBadgeProps) {
  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-1 group">
      <div className="flex items-center gap-3 bg-[#080b14] border border-cyan-500/30 px-3 py-1.5 shadow-[0_0_15px_rgba(6,182,212,0.15)] group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer backdrop-blur-sm">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-cyan-400 tracking-widest uppercase">{agentName}</span>
          <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">{agentRole}</span>
        </div>
        <div className="w-px h-6 bg-cyan-500/20 mx-1"></div>
        <div className="flex items-center justify-center relative w-6 h-6">
          {status === 'ACTIVE' && <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />}
          {status === 'ANALYZING' && <BrainCircuit className="w-4 h-4 text-purple-400 animate-spin-slow" />}
          {status === 'IDLE' && <Shield className="w-4 h-4 text-slate-500" />}
        </div>
      </div>
      
      {/* Dropdown / Stats info on hover */}
      <div className="hidden group-hover:flex flex-col w-48 bg-[#080b14]/95 border border-cyan-500/20 p-3 mt-1 shadow-2xl backdrop-blur-md animate-fadeIn">
        <span className="text-[9px] text-cyan-500 font-black uppercase mb-2 border-b border-cyan-500/20 pb-1">Yetkili Ajan Durumu</span>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[8px] text-slate-400 uppercase">Sıfır İnisiyatif:</span>
          <span className="text-[8px] text-emerald-400 font-bold">AKTİF</span>
        </div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[8px] text-slate-400 uppercase">Denetim Puanı:</span>
          <span className="text-[8px] text-emerald-400 font-bold">100/100</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[8px] text-slate-400 uppercase">Sayfa Hakimiyeti:</span>
          <span className="text-[8px] text-cyan-400 font-bold">TAM KONTROL</span>
        </div>
      </div>
    </div>
  );
}
