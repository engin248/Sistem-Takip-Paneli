"use client";
import React, { useState } from 'react';
import { Radar, Search, ShoppingBag, Globe, Share2, TrendingUp, Filter, RefreshCw, Smartphone, Camera, Target, Send } from 'lucide-react';

export default function ArgePanel() {
    const [isScanning, setIsScanning] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const platforms = [
        { name: 'TRENDYOL', icon: <ShoppingBag className="w-4 h-4" />, status: 'Canlı Veri Akışı', color: 'bg-orange-500' },
        { name: 'AMAZON', icon: <Globe className="w-4 h-4" />, status: 'Fiyat Analizi Aktif', color: 'bg-yellow-500' },
        { name: 'GOOGLE TRENDS', icon: <Search className="w-4 h-4" />, status: 'Aranma Hacmi Senkronize', color: 'bg-fuchsia-500' },
        { name: 'TIKTOK', icon: <Smartphone className="w-4 h-4" />, status: 'Viral Etiket Taraması', color: 'bg-pink-500' },
        { name: 'INSTAGRAM', icon: <Camera className="w-4 h-4" />, status: 'Görsel Ağı Dinleniyor', color: 'bg-purple-500' },
        { name: 'FACEBOOK', icon: <Share2 className="w-4 h-4" />, status: 'Grup/Pazar Taraması', color: 'bg-fuchsia-600' },
        { name: 'PINTEREST', icon: <Radar className="w-4 h-4" />, status: 'Tasarım Odaklı İzleme', color: 'bg-red-500' },
    ];

    const handleScan = () => {
        setIsScanning(true);
        setTimeout(() => setIsScanning(false), 3000);
    };

    return (
        <div className="space-y-6">

            {/* ── ÜST BAŞLIK VE AKSİYON ─────────────────────────── */}
            <div className="glass-card border border-fuchsia-500/30 p-5 relative overflow-hidden flex flex-col gap-5">
                <div className="absolute top-0 right-0 w-2 h-full bg-fuchsia-500/50" />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-sm font-black text-fuchsia-400 tracking-[0.15em] uppercase flex items-center gap-2 mb-1">
                            <Radar className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
                            Global İstihbarat & AR-GE Merkezi
                        </h2>
                        <p className="text-[10px] text-slate-400 font-mono">Çoklu platform (e-ticaret & sosyal medya) veri madenciliği ve trend analizi.</p>
                    </div>
                </div>

                {/* YENİ EKLENEN KISIM: AR-GE ARAMA / HEDEF GİRİŞİ */}
                <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-slate-700/50">
                    <div className="relative flex-1">
                        <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fuchsia-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="AR-GE Hedefi: (Örn: Kazak, Kargo Pantolon, Yeni Sezon Renkleri...)"
                            className="w-full bg-white/5 backdrop-blur-md/80 border border-slate-700/50 rounded-lg px-10 py-3 text-xs text-white font-mono focus:outline-none focus:border-fuchsia-400 transition-all"
                        />
                    </div>
                    <button
                        onClick={handleScan}
                        disabled={isScanning}
                        className="px-6 py-3 bg-fuchsia-500/10 border border-fuchsia-500/40 text-fuchsia-400 font-black tracking-widest text-xs uppercase rounded-lg hover:bg-fuchsia-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                    >
                        <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                        {isScanning ? 'AJANLAR TARALAMA YAPIYOR...' : 'DERİN TARAMAYI BAŞLAT'}
                    </button>
                </div>
            </div>

            {/* ── PLATFORM SENSÖRLERİ GRİD ──────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {platforms.map((plat) => (
                    <div key={plat.name} className="glass-card p-3 border border-slate-700/50 flex flex-col items-center text-center justify-center relative group hover:border-slate-500 transition-colors">
                        {isScanning && (
                            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-ping" />
                        )}
                        <div className={`p-2 rounded-lg ${plat.color} bg-opacity-20 text-slate-300 mb-2 group-hover:text-white transition-colors`}>
                            {plat.icon}
                        </div>
                        <span className="text-[10px] font-black text-slate-200 tracking-wider mb-1">{plat.name}</span>
                        <span className="text-[7px] font-mono text-slate-500 uppercase">{plat.status}</span>
                    </div>
                ))}
            </div>

            {/* ── İSTİHBARAT SONUÇLARI & RAPORLAR ────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* SOL: Canlı Trend Akışı */}
                <div className="lg:col-span-2 glass-card p-5 border border-slate-700/40">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-700/50 pb-2">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                            <TrendingUp className="text-green-400 w-4 h-4" /> Tespit Edilen Sıcak Trendler
                        </h3>
                        <button className="text-[10px] text-slate-400 border border-slate-600 px-2 py-1 rounded flex items-center gap-1 hover:text-white transition-colors">
                            <Filter className="w-3 h-3" /> FİLTRELE
                        </button>
                    </div>

                    <div className="space-y-3">
                        {[
                            { title: "Büyük Beden Oversize Kabanlar", pl: "Trendyol, Instagram", score: 98, dif: "+42%", color: "green" },
                            { title: "Y2K Tarzı Kargo Pantolonlar", pl: "TikTok, Pinterest", score: 92, dif: "+120%", color: "green" },
                            { title: "Termal İçlik Ürünleri", pl: "Amazon, Google Search", score: 85, dif: "+15%", color: "cyan" },
                            { title: "Vintage Deri Ceket Kombinleri", pl: "Pinterest, Facebook Pazar", score: 76, dif: "-5%", color: "red" },
                            { title: "Dikişsiz Spor Tayt", pl: "Instagram, Trendyol", score: 88, dif: "+22%", color: "green" },
                        ].map((trend, i) => (
                            <div key={i} className={`p-4 bg-black/20/60 border border-slate-700/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isScanning ? 'opacity-50 animate-pulse' : ''}`}>
                                <div>
                                    <div className="text-xs sm:text-sm font-bold text-slate-200">{trend.title}</div>
                                    <div className="text-[9px] font-mono text-slate-500 uppercase mt-1">Kaynaklar: {trend.pl}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[9px] text-slate-500 uppercase">Talep Skoru</span>
                                        <div className="flex items-center gap-1 font-mono font-bold text-sm text-white">
                                            {trend.score}/100
                                        </div>
                                    </div>
                                    <div className={`text-[10px] font-black uppercase px-2 py-1 rounded bg-${trend.color}-500/10 text-${trend.color}-400 border border-${trend.color}-500/20 whitespace-nowrap`}>
                                        {trend.dif} BÜYÜME
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SAĞ: Ajan Aktivite Raporu */}
                <div className="glass-card p-5 border border-slate-700/40">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-700/50 pb-2">
                        AR-GE Ajan Taramaları
                    </h3>
                    <div className="relative border-l border-slate-700/50 ml-2 space-y-6">
                        <div className="relative pl-4">
                            <span className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                            <h4 className="text-[10px] font-bold text-white mb-0.5">Ajan-Sniper @ Tiktok Moda</h4>
                            <p className="text-[9px] text-slate-400 font-mono leading-relaxed line-clamp-3">
                                Son 24 saat İçerisinde popüler olan giyim kombinleri hashtaglerine veri madenciliği uygulandı. 12 farklı viral video tespit edildi, rapor oluşturuluyor.
                            </p>
                            <span className="text-[8px] text-slate-500 mt-1 block">5 dk önce</span>
                        </div>
                        <div className="relative pl-4">
                            <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-amber-500 bg-black/20" />
                            <h4 className="text-[10px] font-bold text-white mb-0.5">Ajan-Qwen @ Trendyol Optimizasyon</h4>
                            <p className="text-[9px] text-slate-400 font-mono leading-relaxed line-clamp-3">
                                Rakip fiyat analiz raporu tamamlandı. "Çok sevilenler" listesindeki 500 ürün fiyat eşleşmesi yapıldı. Veri ambarına eklendi.
                            </p>
                            <span className="text-[8px] text-slate-500 mt-1 block">45 dk önce</span>
                        </div>
                        <div className="relative pl-4">
                            <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-slate-500 bg-black/20" />
                            <h4 className="text-[10px] font-bold text-white mb-0.5">Ajan-Gölge @ Pinterest Panoları</h4>
                            <p className="text-[9px] text-slate-400 font-mono leading-relaxed line-clamp-3">
                                Gelecek sezon renk paletleri ve siluet tarzları aranıyor. Görüntü işleme modelleri devreye sokuldu.
                            </p>
                            <span className="text-[8px] text-slate-500 mt-1 block">2 saat önce</span>
                        </div>
                    </div>

                    <button className="w-full mt-6 px-3 py-2 border border-slate-700 text-[9px] font-bold text-slate-400 hover:text-white uppercase transition-colors rounded">
                        TÜM LOGLARI GÖR
                    </button>
                </div>
            </div>

        </div>
    );
}

