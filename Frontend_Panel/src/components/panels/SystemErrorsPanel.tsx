"use client";
import React, { useState, useEffect } from 'react';
import {
    Bug, AlertTriangle, Terminal, Search, Activity,
    ServerCrash, Database, ShieldAlert, Zap,
    RefreshCw, Play, Filter, Cpu, Wrench,
    FileCode, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import DepartmentCommsBox from '../shared/DepartmentCommsBox';

// ============================================================
// SYSTEM ERROR & CRASH INTELLIGENCE (SECI)
// ============================================================
// Bu bileşen, sistem genelindeki hataları, crash loglarını
// ve yapay zeka tabanlı "Otonom Yama" sistemini yönetir.
// ============================================================

type ErrorSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'RESOLVED';

interface SystemError {
    id: string;
    service: string;
    origin: string;
    message: string;
    timestamp: string;
    severity: ErrorSeverity;
    aiDiagnostic: string;
    hasPatch: boolean;
}

const MOCK_ERRORS: SystemError[] = [
    { id: 'ERR-V8-091', service: 'API GATEWAY', origin: 'auth/middleware.ts', message: 'JWT Verification timeout after 30s spike.', timestamp: '19:22:02', severity: 'HIGH', aiDiagnostic: 'CPU spike tespit edildi. Timeout süresi 45s\'e çekilmeli.', hasPatch: true },
    { id: 'ERR-DB-402', service: 'POSTGRESQL', origin: 'query/users.sql', message: 'Deadlock detected: transaction 382 vs 1934.', timestamp: '19:20:44', severity: 'CRITICAL', aiDiagnostic: 'Paylaşımlı lock çakışması. İşlem sırası optimize edilecek.', hasPatch: true },
    { id: 'ERR-UI-22', service: 'FRONTEND', origin: 'HealthDashboard.tsx', message: 'TypeError: Cannot read property "status" of undefined.', timestamp: '18:15:11', severity: 'MEDIUM', aiDiagnostic: 'Null-safe operatörü (?. ) eksikliği.', hasPatch: false },
    { id: 'ERR-NET-11', service: 'NETWORK', origin: 'webhook/tg-bridge', message: '502 Bad Gateway while polling Telegram API.', timestamp: '17:40:00', severity: 'RESOLVED', aiDiagnostic: 'Ajan tarafından otomatik restart atıldı.', hasPatch: false },
];

export default function SystemErrorsPanel() {
    const [errors, setErrors] = useState<SystemError[]>(MOCK_ERRORS);
    const [activeFilter, setActiveFilter] = useState<ErrorSeverity | 'ALL'>('ALL');
    const [isPatching, setIsPatching] = useState(false);

    const filteredErrors = activeFilter === 'ALL'
        ? errors
        : errors.filter(e => e.severity === activeFilter);

    const handleApplyPatch = () => {
        setIsPatching(true);
        setTimeout(() => {
            setIsPatching(false);
            toast.success("Yapay zeka yamaları (hot-patch) canlı sisteme başarıyla enjekte edildi.");
        }, 2500);
    };

    const getSeverityStyles = (severity: ErrorSeverity) => {
        switch (severity) {
            case 'CRITICAL': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'HIGH': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'MEDIUM': return 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20';
            case 'RESOLVED': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-transparent animate-fade-in overflow-hidden">

            {/* ── HEADER: HATA KOMUTA MERKEZİ ── */}
            <div className="shrink-0 p-6 border-b border-white/5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/5 backdrop-blur-xl/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.1)]">
                        <Bug className="w-6 h-6 text-red-500 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-[0.2em] uppercase">SİSTEM HATA DEDEKTÖRÜ</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <AlertCircle className="w-3 h-3 text-red-500" />
                            <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest leading-none">1 KRİTİK • 14 UYARI BEKLİYOR</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'RESOLVED'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`px-4 py-2 text-[9px] font-black tracking-widest border transition-all ${activeFilter === f ? 'bg-red-500 text-white border-red-400' : 'bg-black/20 border-slate-800 text-slate-500 hover:border-slate-600'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">

                {/* ── SOL: CANLI HATA KAYITLARI (LOGS) ── */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-transparent custom-scrollbar">
                    {filteredErrors.map((err) => (
                        <div key={err.id} className="group relative bg-white/5 backdrop-blur-xl border border-white/5 hover:border-red-500/30 transition-all p-5 overflow-hidden">

                            {/* Status Edge */}
                            <div className={`absolute top-0 left-0 w-1 h-full ${err.severity === 'CRITICAL' ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' :
                                    err.severity === 'HIGH' ? 'bg-amber-500' :
                                        err.severity === 'RESOLVED' ? 'bg-amber-500' : 'bg-fuchsia-500'
                                }`} />

                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 border ${getSeverityStyles(err.severity)}`}>
                                            {err.severity}
                                        </span>
                                        <span className="text-[11px] font-black text-white tracking-widest uppercase">{err.service}</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest font-bold">DOSYA: {err.origin}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-slate-400 font-mono italic">#{err.id}</span>
                                    <span className="text-[8px] font-mono text-slate-600 mt-1">{err.timestamp}</span>
                                </div>
                            </div>

                            <div className="bg-red-500/5 p-4 border border-red-500/10 mb-4">
                                <p className="text-[12px] font-mono font-bold text-red-200 leading-relaxed uppercase">
                                    {err.message}
                                </p>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="bg-rose-500/5 p-3 border border-rose-500/20 flex-1 relative">
                                    <span className="absolute -top-2 left-2 bg-white/5 backdrop-blur-xl px-2 text-[8px] font-black text-rose-400 tracking-widest uppercase">AI TANISI</span>
                                    <p className="text-[10px] font-mono text-rose-200/80 italic leading-relaxed">
                                        "{err.aiDiagnostic}"
                                    </p>
                                </div>
                                {err.hasPatch && (
                                    <div className="flex flex-col items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 shrink-0 self-center">
                                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                                        <span className="text-[8px] font-black text-amber-400 uppercase tracking-tighter leading-none">YAMA HAZIR</span>
                                    </div>
                                )}
                            </div>

                        </div>
                    ))}
                </div>

                {/* ── SAĞ: OTONOM YAMA VE KONTROL ── */}
                <div className="w-full lg:w-96 bg-black/20 backdrop-blur-md p-6 space-y-8 overflow-y-auto custom-scrollbar border-t lg:border-t-0 lg:border-l border-white/5">

                    {/* AUTONOMOUS PATCHER */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-red-500" /> OTONOM YAMA KOMUTASI
                        </h3>
                        <div className="bg-red-950/20 border border-red-500/20 p-5 space-y-4">
                            <p className="text-[11px] font-mono text-red-100 leading-relaxed uppercase opacity-80">
                                Yapay zeka (Qwen 2.5) hata bloklarını analiz ederek kritik sistemler için geçici acil yamalar hazırladı.
                            </p>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center bg-white/5 backdrop-blur-md/80 p-2 border border-white/5">
                                    <span className="text-[9px] font-mono text-slate-400 italic">hotfix/db-locking.sql</span>
                                    <span className="text-[8px] font-black text-amber-400 uppercase">Hazır</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/5 backdrop-blur-md/80 p-2 border border-white/5">
                                    <span className="text-[9px] font-mono text-slate-400 italic">fix/api-timeout-bump.ts</span>
                                    <span className="text-[8px] font-black text-amber-400 uppercase">Hazır</span>
                                </div>
                            </div>
                            <button
                                onClick={handleApplyPatch}
                                disabled={isPatching}
                                className="w-full py-4 bg-red-600 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                            >
                                {isPatching ? <span className="animate-pulse">ENJEKTE EDİLİYOR...</span> : <><Play className="w-4 h-4" /> YAMALARI ENJEKTE ET</>}
                            </button>
                        </div>
                    </div>

                    {/* CIRCUIT BREAKER STATUS */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                            <ServerCrash className="w-4 h-4 text-amber-500" /> SİSTEM KORUMASI
                        </h3>
                        <div className="bg-black/20/50 p-5 border border-slate-800 flex justify-between items-center group">
                            <div>
                                <span className="text-[10px] font-black text-white uppercase tracking-widest block">DEVRE KESİCİ (CIRCUIT BREAKER)</span>
                                <span className="text-[8px] font-mono text-slate-400 uppercase mt-1">Acil Trafik Mühürleme</span>
                            </div>
                            <button className="px-4 py-2 border border-slate-700 bg-white/5 backdrop-blur-md text-slate-500 hover:text-red-500 hover:border-red-500/50 transition-all text-[9px] font-black uppercase tracking-widest">
                                AKTİF ET
                            </button>
                        </div>
                    </div>

                    {/* STACK SCANNER */}
                    <div className="bg-white/5 backdrop-blur-md p-4 border border-slate-900 rounded-none space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                            <Terminal className="w-3.5 h-3.5 text-slate-600" />
                            <span className="text-[9px] font-black text-rose-400 uppercase tracking-[0.2em]">CANLI SİSTEM LOG TARAYICISI</span>
                        </div>
                        <div className="space-y-2 h-40 overflow-y-auto no-scrollbar font-mono text-[10px] bg-white/5 backdrop-blur-md/80 p-2 border border-slate-800">
                            <p className="text-red-400 font-bold leading-tight">19:22:15 - [ÇÖKÜŞ] Ortam değişkeni (DB_PASSWORD) sunucu 04'te eksik...</p>
                            <p className="text-rose-400 leading-tight">19:22:12 - [BİLGİ] Bilişsel bellek temizleyici (Garbage Collector) 2.4MB sildi.</p>
                            <p className="text-amber-400 leading-tight">19:22:08 - [UYARI] 'Siparişler' tablosunda yavaş sorgu tespit edildi (1400ms)</p>
                            <p className="text-amber-400 leading-tight">19:22:05 - [TAMAM] ARGE Modülü sağlık taramasını başarıyla geçti.</p>
                            <p className="text-red-400 font-bold leading-tight">19:22:15 - [ÇÖKÜŞ] Veritabanı bağlantısı koptu...</p>
                        </div>
                    </div>
                    
                    <div className="pt-4">
                        <DepartmentCommsBox department="SİSTEM HATALARI" />
                    </div>

                </div>
            </div>
        </div>
    );
}

