"use client";
import AuditLog from "@/components/AuditLog";
import { useLanguageStore } from "@/store/useLanguageStore";
import { t } from "@/lib/i18n";
import Link from "next/link";

// ============================================================
// LogsClient — İstemci Etkileşimleri
// ============================================================
// Dil yönü, link navigasyonu ve AuditLog bileşeni burada.
// Server Component olan page.tsx'den çağırılır.
// ============================================================

export default function LogsClient() {
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);

  return (
    <main className="container mx-auto px-4 py-8" dir={dir}>
      <div className={`flex items-center justify-between mb-6 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-xl font-black tracking-tight">{tr.auditTitle}</h1>
        <Link
          href="/"
          className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors uppercase tracking-wider"
        >
          ← {tr.panelTitle}
        </Link>
      </div>
      <AuditLog />
    </main>
  );
}
