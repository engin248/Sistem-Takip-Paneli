"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Cpu, Send, Command, User, Brain, AlertCircle, Sparkles, Plus, Mic, HelpCircle } from 'lucide-react';

export default function CoreBrainPanel() {
    const [inputMsg, setInputMsg] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [chatLog, setChatLog] = useState([
        { role: 'ai', msg: "Emret Kurucu Engin! ANA SİSTEM göreve hazır.\n\nTüm sistem ağlarını denetliyorum. Planın sonraki aşaması nedir?" }
    ]);

    const handleSend = () => {
        if (!inputMsg.trim()) return;
        setChatLog(prev => [...prev, { role: 'user', msg: inputMsg }]);
        setInputMsg("");
        setIsThinking(true);

        setTimeout(() => {
            setChatLog(prev => [...prev, { role: 'ai', msg: "Anlaşıldı Kurucu! İlgili analizler tamamlandı. ANA SİSTEM raporu hazır ve operasyonel onaya sunuldu. Emre itaat ediliyor." }]);
            setIsThinking(false);
        }, 1500);
    };

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [chatLog, isThinking]);

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] w-full max-w-5xl mx-auto bg-transparent overflow-hidden">

            {/* ── ÜST NAVİGASYON (Minimal & Sade) ─────────────────────────── */}
            <div className="flex items-center justify-between p-3 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-white font-black text-lg tracking-widest uppercase">ANA SİSTEM</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-none bg-green-500/10 border border-green-500/20">
                    <div className="w-1.5 h-1.5 rounded-none bg-green-500 shadow-[0_0_5px_currentColor]"></div>
                    <span className="text-[9px] text-green-400 font-bold uppercase tracking-wider">AKTİF</span>
                </div>
            </div>

            {/* ── MESAJ AKIŞI (Kutusuz, Sade Tasarım) ── */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-10 custom-scrollbar min-h-0">
                {chatLog.map((chat, idx) => (
                    <div key={idx} className="animate-fade-in-up flex w-full max-w-3xl mx-auto">
                        <div className="flex gap-4 md:gap-5 w-full">
                            <div className={`w-8 h-8 rounded-none shrink-0 flex items-center justify-center border ${chat.role === 'ai'
                                ? 'bg-purple-600/10 border-purple-500/30 text-purple-400'
                                : 'bg-slate-800/50 border-slate-700/50 text-slate-400'
                                }`}>
                                {chat.role === 'ai' ? <Brain className="w-4 h-4" /> : <User className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                                <div className="text-sm md:text-[15px] leading-relaxed text-slate-200 font-sans whitespace-pre-wrap selection:bg-purple-500/30">
                                    {chat.msg}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {isThinking && (
                    <div className="animate-fade-in-up flex w-full max-w-3xl mx-auto">
                        <div className="flex gap-4 md:gap-5 w-full">
                            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center border bg-purple-600/10 border-purple-500/30 text-purple-400">
                                <Sparkles className="w-4 h-4 animate-pulse" />
                            </div>
                            <div className="flex-1 pt-2.5">
                                <div className="flex gap-1">
                                    <span className="w-1 h-1 rounded-none bg-purple-500/40 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-1 h-1 rounded-none bg-purple-500/40 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-1 h-1 rounded-none bg-purple-500/40 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} className="h-10" />
            </div>

            {/* ── GİRİŞ ALANI (Sınırları Zorluyor) ── */}
            <div className="px-4 pb-0 pt-2 bg-transparent shrink-0 w-full mb-0">
                <div className="max-w-2xl mx-auto relative group">

                    {/* Küçük ve Sade Input Container */}
                    <div className="relative flex items-center gap-2 bg-[#252528]/80 backdrop-blur-md border border-white/5 rounded-none p-1.5 pr-2 pl-3 transition-all focus-within:border-white/10 focus-within:bg-[#252528] shadow-sm">

                        <button className="p-1.5 text-slate-500 hover:text-white transition">
                            <Plus className="w-4 h-4" />
                        </button>

                        <textarea
                            value={inputMsg}
                            onChange={e => setInputMsg(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="SİSTEM'a sor..."
                            className="flex-1 bg-transparent border-none text-white focus:ring-0 text-sm py-2 px-1 font-sans resize-none max-h-[120px] custom-scrollbar placeholder-slate-600 overflow-hidden"
                            rows={1}
                            style={{ height: 'auto', minHeight: '34px' }}
                        />

                        <button
                            onClick={handleSend}
                            disabled={isThinking || !inputMsg.trim()}
                            className={`p-1.5 rounded-none transition-all ${inputMsg.trim() ? 'bg-white text-black shadow-lg' : 'text-slate-600 bg-white/5 cursor-not-allowed'
                                }`}
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="mt-2 text-[9px] text-slate-600 font-medium text-center tracking-wide">
                        ANA SİSTEM hata yapabilir. Kurucu kontrolü esastır.
                    </div>
                </div>
            </div>

        </div>
    );
}

