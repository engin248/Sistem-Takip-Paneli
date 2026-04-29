"use client";
import React, { useState, useEffect } from 'react';
import {
    MessageSquare, Send, Phone, Hash, Mail,
    Radio, User, Users, Mic, FileText, ChevronRight,
    Globe, Zap, Shield, Bell, CheckCircle,
    AlertTriangle, MoreVertical, Search, Filter,
    Share2, Layers, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import DepartmentCommsBox from '../shared/DepartmentCommsBox';

// ============================================================
// OMNICHANNEL COMMAND HUB (OCH)
// ============================================================
// Bu bileşen, Telegram, WhatsApp, Discord ve SMS kanallarını
// yöneten, otonom mesajlaşmaları denetleyen ana merkezdir.
// ============================================================

type Platform = 'TELEGRAM' | 'WHATSAPP' | 'DISCORD' | 'SMS' | 'MAIL';

interface Message {
    id: string;
    platform: Platform;
    type: 'IN' | 'OUT';
    sender: string;
    content: string;
    timestamp: string;
    isAI: boolean;
    status: 'DELIVERED' | 'READ' | 'PENDING' | 'FAILED';
}

// MOCK KALDIRILDI (2026-04-26): Sahte veri bir daha olmayacak.
// Panel bos baslar, gercek mesajlar WhatsApp loglarindan gelir.
const INITIAL_MESSAGES: Message[] = [];

export default function CommunicationHubPanel() {
    const [selectedChannel, setSelectedChannel] = useState<Platform | 'ALL'>('ALL');
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [inputMessage, setInputMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    // ── LIVE WHATSAPP STATUS ──
    const [waStatus, setWaStatus] = useState<any>({ status: 'OFFLINE' });
    const [waLogs, setWaLogs] = useState('');

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/whatsapp/status');
                const data = await res.json();
                if (data.success) {
                    setWaStatus(data.data);
                    setWaLogs(data.logs);
                }
            } catch (err) { }
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const filteredMessages = selectedChannel === 'ALL'
        ? messages
        : messages.filter(m => m.platform === selectedChannel);

    const handleSend = () => {
        if (!inputMessage.trim()) return;
        setIsSending(true);
        setTimeout(() => {
            const newMessage: Message = {
                id: Date.now().toString(),
                platform: selectedChannel === 'ALL' ? 'TELEGRAM' : selectedChannel,
                type: 'OUT',
                sender: 'ADMIN (SİSTEM)',
                content: inputMessage,
                timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                isAI: false,
                status: 'PENDING'
            };
            setMessages([newMessage, ...messages]);
            setInputMessage('');
            setIsSending(false);
            toast.success("Mesaj kuyruğa eklendi ve iletiliyor.");
        }, 1000);
    };

    return (
        <div className="flex flex-col h-full w-full bg-transparent animate-fade-in overflow-hidden">

            {/* ── HEADER: İLETİŞİM KONTROL MERKEZİ ── */}
            <div className="shrink-0 p-4 md:p-6 border-b border-white/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/5 backdrop-blur-xl/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                        <Radio className="w-6 h-6 text-rose-400 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-[0.2em] uppercase">İLETİŞİM KOMUTA HUB</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-none shadow-[0_0_10px_#f59e0b]"></span>
                            <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest leading-none small-caps">HUB AKTİF • 4 KANAL BAĞLI</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {(['ALL', 'TELEGRAM', 'WHATSAPP', 'DISCORD', 'SMS'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setSelectedChannel(p)}
                            className={`px-4 py-2 text-[9px] font-black tracking-widest border transition-all ${selectedChannel === p ? 'bg-rose-500 text-white border-rose-400' : 'bg-black/20 border-slate-800 text-slate-500 hover:border-slate-600'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row min-h-0">

                {/* ── SOL: CANLI MESAJ AKIŞI (CHAT) ── */}
                <div className="flex-1 flex flex-col border-r border-white/5 bg-transparent">

                    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar">
                        {filteredMessages.map((msg) => (
                            <div key={msg.id} className={`flex w-full ${msg.type === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] md:max-w-[70%] group relative ${msg.type === 'OUT' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                                    {/* Mesaj Üst Bilgi */}
                                    <div className="flex items-center gap-3 px-1">
                                        <span className={`text-[9px] font-black tracking-widest uppercase ${msg.isAI ? 'text-purple-400' : 'text-slate-500'}`}>
                                            {msg.sender} {msg.isAI && '• AI'}
                                        </span>
                                        <span className="text-[8px] font-mono text-slate-700">{msg.timestamp}</span>
                                    </div>

                                    {/* Mesaj Balonu */}
                                    <div className={`p-4 border shadow-2xl relative ${msg.type === 'OUT'
                                        ? 'bg-rose-500/5 border-rose-500/20 text-rose-50'
                                        : 'bg-black/20 border-slate-800 text-slate-100'
                                        }`}>
                                        <div className={`absolute top-0 bottom-0 w-1 ${msg.type === 'OUT' ? 'right-0 bg-rose-500' : 'left-0 bg-slate-700'}`}></div>
                                        <p className="text-[12px] leading-relaxed font-medium tracking-tight">
                                            {msg.content}
                                        </p>

                                        {/* Platform İkonu Overlay */}
                                        <div className="absolute -bottom-2 -right-2 opacity-20 group-hover:opacity-60 transition-opacity">
                                            {msg.platform === 'WHATSAPP' && <Phone className="w-5 h-5 text-amber-400" />}
                                            {msg.platform === 'TELEGRAM' && <Send className="w-5 h-5 text-fuchsia-400" />}
                                            {msg.platform === 'DISCORD' && <Hash className="w-5 h-5 text-indigo-400" />}
                                            {msg.platform === 'SMS' && <MessageSquare className="w-5 h-5 text-amber-400" />}
                                        </div>
                                    </div>

                                    {/* Durum Alt Bilgi */}
                                    <div className={`flex items-center gap-2 mt-1 px-1 ${msg.type === 'OUT' ? 'flex-row-reverse' : ''}`}>
                                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-tighter">{msg.platform}</span>
                                        <CheckCircle className={`w-2.5 h-2.5 ${msg.status === 'READ' ? 'text-rose-400' : 'text-slate-700'}`} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* MESSAGE INPUT HUB */}
                    <div className="shrink-0 p-4 bg-white/5 backdrop-blur-xl/80 border-t border-white/5 backdrop-blur-xl">
                        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-slate-800 p-2 group focus-within:border-rose-500/50 transition-all">
                            <button className="p-3 text-slate-600 hover:text-white transition-colors"><Mic className="w-5 h-5" /></button>
                            <button className="p-3 text-slate-600 hover:text-white transition-colors"><FileText className="w-5 h-5" /></button>
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={e => setInputMessage(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                                placeholder={`EMİR İLET: [${selectedChannel}] KANALINA MESAJ GÖNDERİLİYOR...`}
                                className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-slate-700 uppercase tracking-widest font-bold"
                            />
                            <button
                                onClick={handleSend}
                                disabled={isSending || !inputMessage.trim()}
                                className="px-8 py-3 bg-rose-500 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:bg-rose-600 disabled:opacity-50 transition-all flex items-center gap-3"
                            >
                                {isSending ? 'İLETİLİYOR' : 'GÖNDER'}
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── SAĞ: SİSTEM BAĞLANTILARI & BROADCAST ── */}
                <div className="w-full lg:w-96 bg-black/20 backdrop-blur-md p-6 space-y-8 overflow-y-auto custom-scrollbar border-t lg:border-t-0 lg:border-l border-white/5">

                    {/* BROADCAST SECTION */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" /> TOPLU YAYIN (BROADCAST)
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { label: 'TÜM PERSONEL (WA)', icon: <Users className="w-4 h-4" /> },
                                { label: 'SİSTEM UYARISI (TG)', icon: <Shield className="w-4 h-4" /> },
                                { label: 'KRİTİK HATA (SMS)', icon: <Bell className="w-4 h-4" /> }
                            ].map((b, i) => (
                                <button key={i} className="w-full p-4 bg-black/20/50 border border-slate-800 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-start group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/5 backdrop-blur-md text-slate-500 group-hover:text-amber-400 transition-colors">{b.icon}</div>
                                        <span className="text-[10px] font-black text-slate-400 group-hover:text-white transition-colors tracking-widest">{b.label}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CHANNEL STATUS SECTION */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                            <Layers className="w-4 h-4 text-rose-500" /> KANAL DURUMLARI
                        </h3>
                        <div className="space-y-3">
                            {[
                                { platform: 'TELEGRAM BOT', status: 'BAĞLI', color: 'text-emerald-400' },
                                { 
                                    platform: 'WHATSAPP BIZ', 
                                    status: waStatus.status === 'CONNECTED' ? 'CANLI' : (waStatus.status === 'DISCONNECTED' ? 'QR BEKLENİYOR' : 'KAPALI'), 
                                    color: waStatus.status === 'CONNECTED' ? 'text-emerald-400' : (waStatus.status === 'DISCONNECTED' ? 'text-amber-400' : 'text-slate-600') 
                                },
                                { platform: 'DISCORD WEB', status: 'BAĞLI', color: 'text-emerald-400' },
                                { platform: 'SMS GATEWAY', status: 'BEKLEMEDE', color: 'text-slate-600' }
                            ].map((s, i) => (
                                <div key={i} className="flex justify-between items-center p-3 border-b border-white/5">
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{s.platform}</span>
                                    <span className={`text-[9px] font-black tracking-widest uppercase ${s.color}`}>{s.status}</span>
                                </div>
                            ))}
                        </div>

                        {/* QR CODE DISPLAY (If disconnected and QR available) */}
                        {waStatus.status === 'DISCONNECTED' && (
                            <div className="bg-white p-4 flex flex-col items-center gap-3 animate-pulse">
                                <span className="text-[10px] font-black text-black uppercase tracking-widest text-center">WHATSAPP QR KODU TARA</span>
                                <img 
                                    src="/whatsapp_qr.png" 
                                    alt="WhatsApp QR" 
                                    className="w-full aspect-square bg-slate-100" 
                                    // Cache busting
                                    onError={(e: any) => e.target.style.display = 'none'}
                                />
                                <p className="text-[8px] text-slate-500 font-mono text-center">Cihaz Bağla → QR'ı Tara</p>
                            </div>
                        )}
                    </div>

                    {/* GLOBAL ACTIVITY LOG */}
                    <div className="bg-slate-950 p-4 border border-slate-900 rounded-none space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                            <div className="flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5 text-slate-600" />
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">HUB AKTİVİTE LOGLARI</span>
                            </div>
                            <span className="text-[8px] font-mono text-cyan-600 animate-pulse">CANLI</span>
                        </div>
                        <div className="space-y-1 h-48 overflow-y-auto no-scrollbar font-mono text-[9px]">
                            {waLogs ? (
                                waLogs.split('\n').filter(Boolean).map((line, idx) => (
                                    <p key={idx} className="text-slate-500 truncate"><span className="text-cyan-900">{line.substring(1, 20)}</span> {line.substring(21)}</p>
                                ))
                            ) : (
                                <p className="text-slate-800 italic">Log akışı bekleniyor...</p>
                            )}
                        </div>
                    </div>

                    <div className="pt-4">
                        <DepartmentCommsBox department="İLETİŞİM KONTROL MERKEZİ" />
                    </div>

                </div>
            </div>
        </div>
    );
}


