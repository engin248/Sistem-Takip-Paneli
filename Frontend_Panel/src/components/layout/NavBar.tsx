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
        <nav className="border-b border-slate-700/50 bg-white/5 backdrop-blur-xl sticky top-0 z-50 shadow-sm h-[100px] flex items-center w-full overflow-hidden font-sans">
            <div className={`w-full px-6 flex items-center justify-between h-full ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>

                {/* SOL: SİSTEM OPERASYON MERKEZİ */}
                <div className="flex flex-col justify-center shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[18px] font-black text-white tracking-tight uppercase">SİSTEM</span>
                        <span className="text-[18px] font-black text-rose-500 tracking-tight uppercase drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]">OPERASYON</span>
                        <span className="text-[18px] font-black text-white tracking-tight uppercase">MERKEZİ</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="h-[2px] w-6 bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.8)]" />
                        <span className="text-[8px] font-mono text-slate-400 uppercase tracking-[0.3em] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_5px_rgba(244,63,94,0.8)]" />
                            CANLI İZLEME PANELİ
                        </span>
                        <div className="h-[1px] w-12 bg-white/10" />
                    </div>
                </div>

                {/* ── MERKEZ: TICKER ── */}
                <div className="flex-1 max-w-[500px] mx-8 pointer-events-none overflow-hidden">
                    <div className="flex items-center gap-4 text-[9px] font-bold text-rose-400/30 tracking-[.15em] overflow-hidden whitespace-nowrap">
                        <div className="flex animate-[marquee_45s_linear_infinite] gap-12">
                            {SYSTEM_MESSAGES.map((msg, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="w-1 h-1 bg-rose-500/50 rounded-none"></div>
                                    <span>{msg}</span>
                                </div>
                            ))}
                            {SYSTEM_MESSAGES.map((msg, i) => (
                                <div key={`dup-${i}`} className="flex items-center gap-2">
                                    <div className="w-1 h-1 bg-rose-500/50 rounded-none"></div>
                                    <span>{msg}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── SAĞ TARAF: CHAT, DİL, KULLANICI & STATUS ── */}
                <div className="flex flex-col items-end justify-center shrink-0 h-full">
                    
                    <div className={`flex items-center gap-4 shrink-0 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                        {/* MOR CHAT BUTONU - RESTORED */}
                        <button
                            onClick={() => router.push('/STP-10')}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-fuchsia-600/10 border border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-600 hover:text-white transition-all duration-300 group shadow-[0_0_15px_rgba(217,70,239,0.1)] hover:shadow-[0_0_20px_rgba(217,70,239,0.3)]"
                        >
                            <Brain className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black tracking-widest uppercase">ANA SİSTEM</span>
                        </button>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        {/* DİL SEÇİMİ */}
                        <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-0.5 shadow-inner">
                            <button onClick={() => handleLangChange('tr')} className={`text-[9px] font-black px-3 py-1.5 rounded-lg transition-all ${lang === 'tr' ? 'bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'text-slate-500 hover:text-white'}`}>TR</button>
                            <button onClick={() => handleLangChange('ar')} className={`text-[9px] font-black px-3 py-1.5 rounded-lg transition-all ${lang === 'ar' ? 'bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'text-slate-500 hover:text-white'}`}>AR</button>
                        </div>

                        {/* KULLANICI + AYARLAR */}
                        <div className="flex items-center gap-3 pl-2 border-l border-white/10">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-white leading-none capitalize tracking-widest">{user?.email?.split('@')[0] || 'ADMIN'}</span>
                                <span className="text-[8px] text-cyan-400 font-bold uppercase tracking-[0.3em] mt-1 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">OPERATÖR</span>
                            </div>
                            <button onClick={handleSignOut} className="p-2 rounded-xl border border-rose-500/30 text-rose-500 bg-rose-500/10 hover:bg-rose-500 hover:text-white transition-all shadow-[0_0_10px_rgba(244,63,94,0.1)]"><LogOut className="w-4 h-4" /></button>
                            <button className="p-2 rounded-xl border border-white/10 text-slate-400 bg-white/5 hover:text-white hover:bg-white/10 transition-all"><Settings className="w-4 h-4 animate-[spin_8s_linear_infinite]" /></button>
                        </div>
                    </div>

                    {/* Alt Yazı / Slogan */}
                    <div className="flex items-center gap-2 mt-3 mr-1 opacity-90">
                        <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-cyan-500/50" />
                        <span className="text-[8.5px] font-mono text-cyan-400 uppercase tracking-[0.3em] drop-shadow-[0_0_5px_rgba(6,182,212,0.6)]">
                            ŞİFRELİ KONTROL PANELİ AKTİF // TÜM VERİLER SENKRONİZE
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_5px_rgba(6,182,212,0.8)]" />
                    </div>

                </div>
            </div>
        </nav>
    );
}


