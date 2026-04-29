"use client";
import React, { useState, useEffect } from 'react';
import { Camera, Eye, Award, Calculator, UserCheck, XCircle, AlertCircle, Video, Activity } from 'lucide-react';
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
    durum: 'CALISIYOR' | 'MOLA' | 'YOK' | 'BEKLIYOR';
}

const DUMMY_CAMERAS: Personnel[] = Array.from({ length: 12 }).map((_, i) => ({
    id: `cam-${i+1}`,
    kameraId: `CAM-0${i+1}`,
    isim: `İSTASYON ${i+1} KONTROL`,
    istasyon: `ÜRETİM HATTI ${String.fromCharCode(65+i)}`,
    gunlukIs: 25 + (i * 3), // Sabit değerler (Hydration hatasını önlemek için)
    haftalikIs: 150 + (i * 12),
    aylikIs: 600 + (i * 45),
    birimUcret: 12.5,
    aktiflikOrani: 85 + i,
    durum: 'CALISIYOR'
}));

export default function PersonnelPerformancePanel() {
    // Tasarım aşaması için DUMMY_CAMERAS'ı default olarak yüklüyoruz
    const [personeller, setPersoneller] = useState<Personnel[]>(DUMMY_CAMERAS);
    const [error, setError] = useState(false);

    const fetchStats = async () => {
        try {
            const req = await fetch('http://localhost:5001/api/stats');
            const res = await req.json();
            if (res && res.length > 0) {
                setPersoneller(res);
            }
            setError(false);
        } catch(err) {
            setError(true);
        }
    };

    useEffect(() => {
        fetchStats();
        const intv = setInterval(fetchStats, 5000);
        return () => clearInterval(intv);
    }, []);

    const toplamGunluk = personeller.reduce((acc, p) => acc + p.gunlukIs, 0);
    const toplamHakedis = personeller.reduce((acc, p) => acc + (p.gunlukIs * p.birimUcret), 0);

    return (
        <div className="flex flex-col h-full w-full bg-transparent animate-fade-in overflow-hidden">
            
            {/* ÜST BİLGİ */}
            <div className="shrink-0 p-6 md:p-8 border-b border-white/5 relative z-10 bg-black/40 backdrop-blur-3xl overflow-hidden flex flex-wrap items-center justify-between gap-6">
                <div className="absolute top-[-50%] left-[-10%] w-[30%] h-[200%] bg-amber-500/10 blur-[80px] pointer-events-none rotate-12" />
                
                <div className="flex items-center gap-5 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                        <Camera className="w-7 h-7 text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-300 to-amber-600 tracking-[0.2em] uppercase drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                            KAMERA VE LİYAKAT DENETİMİ
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="flex items-center gap-2 text-[11px] font-bold text-amber-400 uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                                LOKAL BAĞLANTI AKTİF
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">SIFIR BULUT • İZOLE ARŞİV</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-6 bg-black/50 border border-white/10 p-4 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl relative z-10">
                    <div className="flex flex-col items-end justify-center">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-1">TOPLAM GÜNLÜK İŞ</span>
                        <span className="text-xl font-black text-white font-mono drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{toplamGunluk} <span className="text-xs text-slate-400">ADET</span></span>
                    </div>
                    <div className="w-px bg-white/10 mx-2"></div>
                    <div className="flex flex-col items-end justify-center">
                        <span className="text-[9px] text-amber-500 uppercase tracking-widest font-black mb-1 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]">GÜNLÜK TOPLAM HAKEDİŞ</span>
                        <span className="text-xl font-black text-amber-400 font-mono drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">₺{toplamHakedis.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* KAMERALAR VE PERFORMANS LİSTESİ */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative">
                
                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl flex items-center gap-4 text-rose-400 text-xs font-mono shadow-[0_0_20px_rgba(244,63,94,0.15)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
                        <AlertCircle className="w-6 h-6 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]" /> 
                        <div className="flex flex-col">
                            <span className="font-black text-white tracking-widest uppercase mb-0.5">BAĞLANTI HATASI: YAPAY ZEKA KAMERA MOTORU (PORT 5001)</span>
                            <span className="opacity-80">Şu anda dizayn modundasınız. Görüntüler mock (sahte) sinyal bekleniyor modundadır. Atölye scripti başlatıldığında canlı yayın gelecektir.</span>
                        </div>
                    </div>
                )}

                {/* 8 KAMERA İÇİN 4 KOLONLU GRID (BÜYÜK EKRANDA) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                    {personeller.map((p, index) => (
                        <div key={p.id} className="relative group bg-black/40 backdrop-blur-2xl border border-white/5 hover:border-amber-500/30 transition-all duration-500 rounded-3xl flex flex-col overflow-hidden hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(245,158,11,0.15)]">
                            
                            {/* Ambient Glow */}
                            <div className={`absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full group-hover:scale-[2] group-hover:bg-amber-500/20 transition-transform duration-700 pointer-events-none`} />
                            
                            {/* CANLI YAYIN KAMERA EKRANI (LOKAL) */}
                            <div className="h-48 xl:h-56 w-full bg-slate-900/80 relative flex flex-col items-center justify-center overflow-hidden border-b border-white/5 group-hover:border-amber-500/20 transition-colors">
                                {/* Grid Pattern */}
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-10" />
                                
                                {/* Placeholder / Sinyal Yok Durumu */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-0 opacity-40">
                                    <Video className="w-10 h-10 text-slate-500 mb-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
                                    <span className="text-[10px] font-mono text-slate-500 tracking-[0.3em] font-bold">SİNYAL BEKLENİYOR</span>
                                </div>

                                {/* Asıl Kamera Görüntüsü (Bağlantı olduğunda yüklenecek) */}
                                <img 
                                    src={`http://127.0.0.${(index % 5) + 1}:5001/video_feed_${index + 1}`} 
                                    className="absolute inset-0 object-cover w-full h-full opacity-0 transition-opacity duration-500 filter contrast-125 saturate-50 group-hover:saturate-100 z-10"
                                    onLoad={(e) => {
                                        e.currentTarget.style.opacity = '0.7';
                                        // Görüntü geldiğinde arkadaki "sinyal bekleniyor" yazısını gizle
                                        const prevSibling = e.currentTarget.previousElementSibling as HTMLElement;
                                        if (prevSibling) prevSibling.style.display = 'none';
                                    }}
                                    onError={(e) => { 
                                        e.currentTarget.style.display = 'none'; 
                                    }}
                                    alt={`Kamera ${index + 1}`}
                                />
                                
                                {/* Kamera ID Etiketi */}
                                <div className="absolute top-3 left-3 px-2 py-1 bg-black/80 backdrop-blur-md border border-amber-500/30 rounded-lg text-[9px] font-mono text-amber-400 flex items-center gap-2 z-20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                                    <span>{p.kameraId}</span>
                                    <span className="text-white ml-1 opacity-70">REC</span>
                                </div>

                                {/* Kamera Format Etiketi */}
                                <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 rounded text-[8px] font-mono text-white/40 z-20 border border-white/10 uppercase">
                                    1080p • 30fps
                                </div>

                                {/* Scan Line Overlay */}
                                <div className="absolute inset-0 pointer-events-none z-20 bg-gradient-to-b from-transparent via-amber-500/5 to-transparent opacity-30 mix-blend-overlay" />
                            </div>

                            {/* PERSONEL VE HAKEDİŞ BİLGİSİ */}
                            <div className="p-5 relative z-10 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-sm font-black text-white tracking-widest uppercase drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{p.isim}</h3>
                                        <p className="text-[9px] text-amber-400 uppercase tracking-[0.2em] font-mono mt-1">İSTASYON: {p.istasyon}</p>
                                    </div>
                                    <div className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[8px] font-black tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                        AKTİF
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 mt-auto">
                                    <div className="flex flex-col items-center justify-center py-2 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Günlük</span>
                                        <span className="text-base font-mono text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">{p.gunlukIs}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center py-2 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-1">Haftalık</span>
                                        <span className="text-base font-mono text-slate-300">{p.haftalikIs}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-inner">
                                        <span className="text-[8px] text-amber-500 uppercase font-black tracking-widest mb-1">Aylık</span>
                                        <span className="text-base font-mono text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">{p.aylikIs}</span>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between bg-black/40 rounded-xl px-3 py-2 border border-white/5 group-hover:border-amber-500/20 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-amber-500/20">
                                            <Calculator className="w-3 h-3 text-amber-400" />
                                        </div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Günlük Hakediş</span>
                                    </div>
                                    <span className="text-lg font-mono text-amber-400 font-bold drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">₺{(p.gunlukIs * p.birimUcret).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ALT BİLGİ (VERİ GİZLİLİĞİ) */}
                <div className="bg-black/40 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-6 mt-8 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-amber-500/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-amber-500/10 transition-colors" />
                    
                    <h3 className="text-[12px] font-black tracking-[0.2em] text-white uppercase mb-3 flex items-center gap-3 drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">
                        <Award className="w-5 h-5 text-amber-400" /> 
                        VERİ GİZLİLİĞİ VE ADALET
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-mono max-w-4xl relative z-10">
                        Personel performans ve kamera verileri <span className="text-amber-400 font-bold">"Sıfır Bulut" (No-Cloud)</span> prensibiyle doğrudan <span className="text-white">"Local_Veri_Arsivi"</span> adlı 
                        şirket içi veri ambarında saklanmaktadır. Veri dışarı çıkmaz, kaybolmaz. Kameralar saniye saniye izleme ve adil 
                        ücretlendirme kayıtları tutar. Tam Liyakat esastır.
                    </p>
                </div>
                
                <div className="mt-8 pb-8">
                    <DepartmentCommsBox department="PERSONEL KAMERA VE ADALET" />
                </div>
                
            </div>
        </div>
    );
}

