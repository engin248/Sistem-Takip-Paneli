"use client";
import React, { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  time: string;
}

export default function DepartmentCommsBox({ department }: { department: string }) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const formatTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (!prompt.trim()) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      sender: 'user',
      text: prompt,
      time: formatTime()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setPrompt("");

    // Simulate Agent Response
    setTimeout(() => {
      const agentMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        sender: 'agent',
        text: `[${department} EKİBİ]: Mesajınız alındı. Süzgeç ve planlama süreci başlatıldı. Talimat sırasına alındı.`,
        time: formatTime()
      };
      setMessages(prev => [...prev, agentMsg]);
    }, 1500);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="mt-6 border border-slate-700/50 bg-[#090b14] overflow-hidden flex flex-col h-48 rounded-sm">
      <div className="bg-black/20 px-4 py-2 border-b border-white/5 flex items-center justify-between shadow-sm">
        <span className="text-[10px] font-black text-rose-400 tracking-widest uppercase">
          {department} DİREKT KOMUTA MEYDANI
        </span>
        <div className="flex gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Asil"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" title="Kontrol"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Yedek"></span>
        </div>
      </div>
      
      {/* Messages Window */}
      <div 
        ref={scrollRef}
        className="flex-1 p-3 bg-white/5 backdrop-blur-md overflow-y-auto custom-scrollbar flex flex-col gap-2"
      >
        {messages.length === 0 && (
          <div className="m-auto text-[9px] font-mono text-slate-600 uppercase tracking-widest opacity-50 select-none">
            {department} EKİBİ İLE GÜVENLİ BAĞLANTI (SIFIR İNİSİYATİF)
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <span className="text-[7px] text-slate-500 font-mono mb-0.5">{msg.sender === 'user' ? 'KOMUTAN' : department} - {msg.time}</span>
            <div className={`px-2.5 py-1.5 text-[11px] font-medium max-w-[85%] border shadow-sm ${msg.sender === 'user' ? 'bg-rose-900/20 border-rose-500/30 text-rose-50 rounded-l rounded-tr' : 'bg-purple-900/20 border-purple-500/30 text-purple-100 rounded-r rounded-tl'}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-black/20 flex gap-2 border-t border-slate-700/50">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`${department} ekibine komut veya sorgu girin... (Enter ile gönder)`}
          className="flex-1 bg-white/5 backdrop-blur-md border border-slate-700/50 text-[11px] text-slate-200 p-2 outline-none focus:border-rose-500/50 transition-colors resize-none h-12 custom-scrollbar rounded-sm"
        />
        <button 
          onClick={handleSend}
          className="px-6 bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/50 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex-shrink-0 flex items-center justify-center rounded-sm shadow-[0_0_10px_rgba(6,182,212,0.3)] active:scale-95"
        >
          Gönder
        </button>
      </div>
    </div>
  );
}

