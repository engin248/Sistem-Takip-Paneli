"use client";
import { useEffect, useState } from 'react';
import { useLanguageStore } from '@/store/useLanguageStore';
import { useAuthStore } from '@/store/useAuthStore';
import { t } from '@/lib/i18n';
import { Settings, LogOut, Radio, LayoutDashboard, Cpu, Shield, MessageSquare, Brain } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function NavBar() {
    const { lang, setLanguage, dir } = useLanguageStore();
    const { user, clearAuth } = useAuthStore();
    const router = useRouter();

    const handleLangChange = (newLang: 'tr' | 'ar') => {
        setLanguage(newLang);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        clearAuth();
        router.push('/');
    };

    const SYSTEM_MESSAGES = [
        "DOKTRİN ANALİZ EDİLDİ: TÜM VERİM KRİTERLERİ ONAYLANDI...",
        "AJAN-01 (ÖLÜ İŞÇİ) SİSTEM SINIRLARINDA DEVRİYEDE...",
        "DEMİR TEKSTİL ÜRETİM HATTI VERİLERİ ANLIK SENKRONİZE EDİLİYOR...",
        "STRATEJİK ANALİZ: GLOBAL PAZAR TRENDLERİ İŞLENDİ VE RAPORLANDI.",
        "SIFUR İNİSİYATİF PROTOKOLÜ: TÜM KARARLAR VERİ ODAKLI ÇALIŞIYOR.",
        "SİSTEM ÇEKİRDEĞİ (SİSTEM) OPTİMİZE EDİLDİ - TEPKİ SÜRESİ: 12ms",
        "PAZARYERİ STOKLARI VE SATIŞ VERİLERİ TEK POTADA ERİTİLİYOR...",
        "DOKTRİN UYARINCA TÜM LOGLAR DENETLENDİ - 0 HATA TESPİT EDİLDİ.",
        "BİLİŞSEL KATMAN AKTİF: STRATEJİK ÖNGÖRÜLER PANELDE ÜRETİLİYOR.",
        "ZÜMRÜT ARAYÜZ DOKTRİNİ: %100 UYUM VE GÖRSEL DİSİPLİN SAĞLANDI."
    ];

    return (
        <nav className="border-b border-slate-700/50 bg-[#0b1120] sticky top-0 z-50 shadow-sm h-[100px] flex items-center w-full overflow-hidden font-sans">
            <div className={`w-full px-6 flex items-center justify-between h-full ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>

                {/* SOL: SİSTEM OPERASYON MERKEZİ */}
                <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[18px] font-black text-white tracking-tight uppercase">SİSTEM</span>
                    <span className="text-[18px] font-black text-cyan-400 tracking-tight uppercase">OPERASYON</span>
                    <span className="text-[18px] font-black text-white tracking-tight uppercase">MERKEZİ</span>
                </div>

                {/* ── MERKEZ: TICKER ── */}
                <div className="flex-1 max-w-[500px] mx-8 pointer-events-none overflow-hidden">
                    <div className="flex items-center gap-4 text-[9px] font-bold text-cyan-400/30 tracking-[.15em] overflow-hidden whitespace-nowrap">
                        <div className="flex animate-[marquee_45s_linear_infinite] gap-12">
                            {SYSTEM_MESSAGES.map((msg, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-1 h-1 bg-cyan-500/50 rounded-none"></div>
                                    <span>{msg}</span>
                                </div>
                            ))}
                            {SYSTEM_MESSAGES.map((msg, i) => (
                                <div key={`dup-${i}`} className="flex items-center gap-2">
                                    <div className="w-1 h-1 bg-cyan-500/50 rounded-none"></div>
                                    <span>{msg}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── SAĞ TARAF: CHAT, DİL, KULLANICI ── */}
                <div className={`flex items-center gap-4 shrink-0 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>

                    {/* MOR CHAT BUTONU - RESTORED */}
                    <button
                        onClick={() => router.push('/STP-10')}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/40 text-purple-400 hover:bg-purple-600 hover:text-white transition-all duration-300 group shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                    >
                        <Brain className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black tracking-tighter">ANA SİSTEM</span>
                    </button>

                    <div className="w-px h-8 bg-slate-700/50 mx-2" />

                    {/* DİL SEÇİMİ */}
                    <div className="flex items-center bg-slate-900/50 border border-slate-700/50 p-1">
                        <button onClick={() => handleLangChange('tr')} className={`text-[9px] font-black px-4 py-2 ${lang === 'tr' ? 'bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'text-slate-500'}`}>TR</button>
                        <button onClick={() => handleLangChange('ar')} className={`text-[9px] font-black px-4 py-2 ${lang === 'ar' ? 'bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'text-slate-500'}`}>AR</button>
                    </div>

                    {/* KULLANICI + AYARLAR */}
                    <div className="flex items-center gap-3 pl-2">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-white leading-none capitalize">{user?.email?.split('@')[0] || 'ADMIN'}</span>
                            <span className="text-[7px] text-cyan-400/60 font-bold uppercase tracking-[0.2em]">OPERATÖR</span>
                        </div>
                        <button onClick={handleSignOut} className="p-2 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-all"><LogOut className="w-4 h-4" /></button>
                        <button className="p-2 border border-slate-700/50 text-slate-400 hover:text-white transition-all"><Settings className="w-4 h-4 animate-[spin_8s_linear_infinite]" /></button>
                    </div>

                </div>
            </div>
        </nav>
    );
}

