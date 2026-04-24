"use client";
import React, { useState, useEffect } from 'react';
import { Camera, Eye, Award, Calculator, UserCheck, XCircle, AlertCircle } from 'lucide-react';
import DepartmentCommsBox from '../shared/DepartmentCommsBox';

interface Personnel {
    id: string;
    kameraId: string;
    isim: string;
    istasyon: string;
    gunlukIs: number;
    haftalikIs: number;
    aylikIs: number;
    birimUcret: number;
    aktiflikOrani: number; 
    durum: 'CALISIYOR' | 'MODADA' | 'YOK' | 'BEKLIYOR';
}

export default function PersonnelPerformancePanel() {
    const [personeller, setPersoneller] = useState<Personnel[]>([]);
    const [error, setError] = useState(false);

    const fetchStats = async () => {
        try {
            const req = await fetch('http://localhost:5001/api/stats');
            const res = await req.json();
            setPersoneller(res);
            setError(false);
        } catch(err) {
            setError(true);
        }
    };

    useEffect(() => {
        fetchStats();
        // 3 saniyede bir otonom sayım tablosunu lokal veritabanından güncelle
        const intv = setInterval(fetchStats, 3000);
        return () => clearInterval(intv);
    }, []);

    const toplamGunluk = personeller.reduce((acc, p) => acc + p.gunlukIs, 0);
    const toplamHakedis = personeller.reduce((acc, p) => acc + (p.gunlukIs * p.birimUcret), 0);

    return (
        <div className="flex flex-col h-full w-full bg-[#030712] animate-fade-in overflow-hidden">
            
            {/* ÜST BİLGİ */}
            <div className="shrink-0 p-6 border-b border-white/5 flex flex-col md:flex-row justify-between gap-4 bg-[#0b1120]/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        <Camera className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-[0.2em] uppercase">KAMERA VE LİYAKAT DENETİMİ (LOKAL)</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <Eye className="w-3 h-3 text-emerald-500" />
                            <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest leading-none">VERİ ARŞİVİ ŞİRKET İÇİNE İZOLE EDİLMİŞTİR</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex flex-col items-end justify-center">
                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">TOPLAM GÜNLÜK İŞ</span>
                        <span className="text-lg font-black text-white font-mono">{toplamGunluk} ADET</span>
                    </div>
                    <div className="w-px bg-white/10 mx-2"></div>
                    <div className="flex flex-col items-end justify-center">
                        <span className="text-[10px] text-emerald-500 uppercase tracking-widest font-black">GÜNLÜK TOPLAM HAKEDİŞ</span>
                        <span className="text-lg font-black text-emerald-400 font-mono">₺{toplamHakedis.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* KAMERALAR VE PERFORMANS LİSTESİ */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3 text-red-400 text-xs font-mono">
                        <AlertCircle className="w-5 h-5" /> 
                        Yapay Zeka Kamera Motoru (Lokal Port 5001) bulunamadı. Lütfen Kamera Departmanı scriptini başlatın.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {personeller.map(p => (
                        <div key={p.id} className="bg-[#0b1120] border border-white/5 flex flex-col group relative overflow-hidden">
                            {/* CANLI YAYIN KAMERA EKRANI (LOKAL) */}
                            <div className={`h-48 w-full bg-black border-b border-white/5 relative flex flex-col items-center justify-center overflow-hidden`}>
                                <img 
                                    src="http://localhost:5001/video_feed" 
                                    className="object-cover w-full h-full opacity-80 mix-blend-screen"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    alt="Live Camera Feed"
                                />
                                
                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 border border-white/10 text-[8px] font-mono text-white flex items-center gap-1 z-10">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    {p.kameraId} (CANLI İZLEME)
                                </div>
                            </div>

                            <div className="p-4 space-y-4">
                                <div>
                                    <h3 className="text-sm font-black text-white tracking-widest uppercase">{p.isim}</h3>
                                    <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-mono">AKTİFLİK: YÜKSEK</p>
                                </div>

                                <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[8px] text-slate-500 uppercase font-black">Günlük</span>
                                        <span className="text-sm font-mono text-white mt-0.5">{p.gunlukIs}</span>
                                    </div>
                                    <div className="flex flex-col items-center border-l border-white/5">
                                        <span className="text-[8px] text-slate-500 uppercase font-black">Haftalık</span>
                                        <span className="text-sm font-mono text-slate-300 mt-0.5">{p.haftalikIs}</span>
                                    </div>
                                    <div className="flex flex-col items-center border-l border-white/5">
                                        <span className="text-[8px] text-slate-500 uppercase font-black">Aylık</span>
                                        <span className="text-sm font-mono text-cyan-400 mt-0.5">{p.aylikIs}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between bg-emerald-500/5 px-3 py-2 border border-emerald-500/10">
                                    <div className="flex items-center gap-1.5">
                                        <Calculator className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Günlük Hakediş</span>
                                    </div>
                                    <span className="text-sm font-mono text-emerald-400 font-bold">₺{(p.gunlukIs * p.birimUcret).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-900/50 border border-slate-800 p-5 mt-6">
                    <h3 className="text-[11px] font-black tracking-widest text-white uppercase mb-2 flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-400" /> VERİ GİZLİLİĞİ VE ADALET
                    </h3>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                        Personel performans ve kamera verileri "Sıfır Bulut" (No-Cloud) prensibiyle doğrudan "Local_Veri_Arsivi" adlı 
                        şirket içi veri ambarında saklanmaktadır. Veri dışarı çıkmaz, kaybolmaz. Kameralar saniye saniye izleme ve adil 
                        ücretlendirme kayıtları tutar. Tam Liyakat esastır.
                    </p>
                </div>
                
                <DepartmentCommsBox department="PERSONEL KAMERA VE ADALET" />
                
            </div>
        </div>
    );
}
