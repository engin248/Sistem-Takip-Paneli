"use client";
import React, { useState } from 'react';
import { Bot, X, Send, Radio } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function GlobalBotTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const [cmd, setCmd] = useState('');
  const pathname = usePathname();

  // URL'den aktif ekranı bul (ör: /SCR-06)
  const screenId = pathname.replace('/', '') || 'KARARGAH (SİSTEM)';

  const handleSend = () => {
    if(!cmd) return;
    // Sadece UI hissiyatı
    setTimeout(() => {
        setCmd('');
        setIsOpen(false);
    }, 500);
  };

  return (
    <>
      {/* ── FLOATING BUTTON ── */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 bg-cyan-600 rounded-full flex items-center justify-center cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:bg-cyan-500 hover:scale-105 active:scale-95 transition-all group"
      >
        <Bot className={`w-6 h-6 text-white transition-all duration-300 ${isOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
        <X className={`w-6 h-6 text-white absolute transition-all duration-300 ${isOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} />
        
        {/* Bildirim Noktası */}
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-[#030712] rounded-full animate-pulse"></span>
      </button>

      {/* ── FLOATING CHAT PANEL ── */}
      <div 
        className={`fixed bottom-24 right-6 w-80 md:w-96 bg-[#090b14] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[9998] transition-all duration-300 origin-bottom-right flex flex-col overflow-hidden ${
          isOpen ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-[#111827] px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span className="text-[10px] font-black text-cyan-400 tracking-widest uppercase truncate max-w-[200px]">
              {screenId} DİREKT HAT
            </span>
          </div>
          <div className="flex gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Asil Ajan"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Kontrolör"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Yedek Gözlemci"></span>
          </div>
        </div>
        
        <div className="p-4 flex-1 bg-[#030712]">
            <p className="text-[10px] text-slate-500 font-mono italic mb-4">
                Sistem Notu: Bu terminalden vereceğiniz komutlar, doğrudan bulunduğunuz {screenId} ekranının sorumlusu olan 3'lü ajana (Asil, Kontrol, Yedek) şifreli olarak iletilir.
            </p>
            <div className="bg-[#0b1120] border border-white/5 p-3 flex flex-col gap-3">
              <textarea
                value={cmd}
                onChange={e => setCmd(e.target.value)}
                placeholder={`${screenId} ajanlarına acil komut gir...`}
                className="w-full bg-transparent border-none text-[11px] text-white p-0 outline-none resize-none h-20 custom-scrollbar placeholder-slate-700"
              />
              <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-2">
                  <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">● HAZIR</span>
                  <button 
                    onClick={handleSend}
                    disabled={!cmd.trim()}
                    className="px-4 py-2 bg-cyan-600/20 text-cyan-400 border border-cyan-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-cyan-500/30 disabled:opacity-30 transition-all flex items-center gap-2"
                  >
                    Gönder <Send className="w-3 h-3" />
                  </button>
              </div>
            </div>
        </div>
      </div>
    </>
  );
}
