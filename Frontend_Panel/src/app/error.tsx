"use client";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sistem motoru arındırıldığı için sadece konsola log bırakıyoruz
    console.error("KRİTİK SİSTEM HATASI:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="text-6xl text-red-500 animate-pulse">⚠️</div>
        <h1 className="text-2xl font-black tracking-tight uppercase">SİSTEM HATASI</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Beklenmeyen bir arayüz hatası oluştu. Lütfen yeniden deneyin veya sistem yöneticisine başvurun.
        </p>
        <div className="bg-slate-900/50 p-4 border border-red-500/20">
          <p className="text-[10px] font-mono text-red-400 leading-tight break-all">
            {error.message || "Bilinmeyen Hata"}
          </p>
        </div>
        <button
          onClick={reset}
          className="bg-cyan-500 text-white text-[10px] font-black px-8 py-3 rounded-none hover:bg-cyan-600 transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          SİSTEMİ YENİLE
        </button>
      </div>
    </div>
  );
}
