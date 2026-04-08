"use client";
import { useLanguageStore } from "@/store/useLanguageStore";

export default function NavBar() {
  const { lang, dir, toggleLang } = useLanguageStore();

  return (
    <nav className="border-b p-4 bg-white dark:bg-slate-900 sticky top-0 z-50">
      <div className={`container mx-auto flex justify-between items-center ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-3 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <span className="font-black text-lg tracking-tight">STP-PANEL</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            {lang === 'tr' ? 'Sistem Takip Paneli' : 'لوحة تتبع النظام'}
          </span>
        </div>
        <div className={`flex gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <button
            onClick={() => lang !== 'tr' && toggleLang()}
            className={`text-[10px] font-bold px-3 py-1 rounded border transition-all ${
              lang === 'tr' 
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900' 
                : 'border-slate-300 text-slate-500 hover:border-slate-500'
            }`}
          >
            TR
          </button>
          <button
            onClick={() => lang !== 'ar' && toggleLang()}
            className={`text-[10px] font-bold px-3 py-1 rounded border transition-all ${
              lang === 'ar' 
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900' 
                : 'border-slate-300 text-slate-500 hover:border-slate-500'
            }`}
          >
            AR
          </button>
        </div>
      </div>
    </nav>
  );
}
