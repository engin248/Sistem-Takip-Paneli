import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="text-7xl font-black text-slate-800">404</div>
        <h1 className="text-xl font-bold tracking-tight">SAYFA BULUNAMADI</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <Link
          href="/"
          className="inline-block bg-white text-slate-900 text-xs font-bold px-6 py-3 rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest"
        >
          ANA SAYFAYA DÖN
        </Link>
      </div>
    </div>
  );
}
