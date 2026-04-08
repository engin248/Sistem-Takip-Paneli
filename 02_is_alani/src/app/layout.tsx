"use client";
import "./globals.css";
import { Inter } from "next/font/google";
import { useLanguageStore } from "@/store/useLanguageStore";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { lang, dir, toggleLang } = useLanguageStore();

  return (
    <html lang={lang} dir={dir}>
      <body className={`${inter.className} bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50`}>
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
        {children}
      </body>
    </html>
  );
}
