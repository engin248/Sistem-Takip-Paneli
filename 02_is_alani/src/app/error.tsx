"use client";
import { useEffect } from "react";
import { processError, ERR } from "@/lib/errorCore";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    processError(ERR.UNIDENTIFIED_COLLAPSE, error, {
      kaynak: "app/error.tsx",
      islem: "GLOBAL_ERROR_BOUNDARY",
      digest: error.digest,
    }, "FATAL");
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="text-6xl">⚠️</div>
        <h1 className="text-2xl font-black tracking-tight">SİSTEM HATASI</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Beklenmeyen bir hata oluştu. Sistem bu hatayı otomatik olarak kayıt altına aldı.
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-slate-600 bg-slate-900 px-3 py-1.5 rounded-lg inline-block">
            HATA KODU: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="bg-white text-slate-900 text-xs font-bold px-6 py-3 rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest"
        >
          YENİDEN DENE
        </button>
      </div>
    </div>
  );
}
