"use client";
import { useLanguageStore } from "@/store/useLanguageStore";

export default function NavBar() {
  const { lang, toggleLang } = useLanguageStore();

  return (
    <nav className="border-b p-4 bg-white dark:bg-slate-900">
      <div className="container mx-auto flex justify-between items-center">
        <span className="font-bold">STP-PANEL</span>
        <div className="flex gap-4">
          <button
            onClick={() => lang !== 'tr' && toggleLang()}
            className={`text-sm px-3 py-1 border rounded ${lang === 'tr' ? 'bg-slate-900 text-white' : ''}`}
          >
            TR
          </button>
          <button
            onClick={() => lang !== 'ar' && toggleLang()}
            className={`text-sm px-3 py-1 border rounded ${lang === 'ar' ? 'bg-slate-900 text-white' : ''}`}
          >
            AR
          </button>
        </div>
      </div>
    </nav>
  );
}
