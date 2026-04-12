"use client";
import { useState } from "react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { t } from "@/lib/i18n";
import { toast } from "sonner";

// ============================================================
// L2 PANEL — Bağımsız Denetim Arayüzü
// ============================================================
// Kırılım #2 düzeltmesi
//
// ÜST: /api/validate endpoint'i
// ALT: l2Validator.ts (orphan task, status tutarsızlığı, hata yoğunluğu, mühür bütünlüğü)
// ÖN: Denetim tetikleyici + bulgu listesi
// ============================================================

interface ValidationFinding {
  type: "ERROR" | "WARNING" | "INFO";
  code: string;
  description: string;
  table?: string;
  record_id?: string;
  timestamp: string;
}

interface L2Report {
  validator: string;
  timestamp: string;
  duration_ms: number;
  findings: ValidationFinding[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    status: "PASS" | "FAIL" | "WARNING";
  };
}

export default function L2Panel() {
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);

  const [report, setReport] = useState<L2Report | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runValidation = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/validate");
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
        const s = data.report.summary;
        if (s.status === "PASS") toast.success(`L2 Denetim: GEÇTİ (${data.report.duration_ms}ms)`);
        else if (s.status === "WARNING") toast.warning(`L2 Denetim: ${s.warnings} uyarı`);
        else toast.error(`L2 Denetim: ${s.errors} hata, ${s.warnings} uyarı`);
      }
    } catch {
      toast.error("L2 Validator çalıştırılamadı");
    } finally {
      setIsRunning(false);
    }
  };

  function getStatusStyle(status: string) {
    switch (status) {
      case "PASS": return { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", label: tr.l2StatusPass };
      case "FAIL": return { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: tr.l2StatusFail };
      case "WARNING": return { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", label: tr.l2StatusWarning };
      default: return { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-500", label: "—" };
    }
  }

  function getFindingStyle(type: string) {
    switch (type) {
      case "ERROR": return "border-s-red-500 bg-red-50 dark:bg-red-900/10";
      case "WARNING": return "border-s-amber-500 bg-amber-50 dark:bg-amber-900/10";
      default: return "border-s-blue-500 bg-blue-50 dark:bg-blue-900/10";
    }
  }

  return (
    <section className="mb-8">
      {/* Başlık */}
      <div className={`flex justify-between items-center mb-4 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
        <div>
          <h2 className="text-sm font-bold text-slate-500 tracking-widest uppercase text-start">{tr.l2Title}</h2>
          <p className="text-[10px] text-slate-400 mt-0.5 text-start">{tr.l2Subtitle}</p>
        </div>
        <button
          onClick={runValidation}
          disabled={isRunning}
          className="text-[10px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-1.5 rounded-lg hover:opacity-90 transition-all uppercase tracking-wider disabled:opacity-50"
        >
          {isRunning ? tr.l2Running : tr.l2RunValidation}
        </button>
      </div>

      {/* Sonuç Özeti */}
      {report && (
        <>
          <div className={`flex items-center gap-4 mb-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${getStatusStyle(report.summary.status).bg} ${getStatusStyle(report.summary.status).text}`}>
              {getStatusStyle(report.summary.status).label}
            </span>
            <div className={`flex items-center gap-4 text-[10px] ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
              <span className="text-red-600 font-bold">🔴 {report.summary.errors} {tr.l2Errors}</span>
              <span className="text-amber-600 font-bold">🟡 {report.summary.warnings} {tr.l2Warnings}</span>
              <span className="text-blue-600 font-bold">🔵 {report.summary.info} {tr.l2Info}</span>
            </div>
            <span className="text-[9px] text-slate-400 ms-auto font-mono">
              {tr.l2Duration}: {report.duration_ms}ms
            </span>
          </div>

          {/* Bulgu Listesi */}
          {report.findings.length === 0 ? (
            <p className="text-[10px] text-slate-400 italic text-start">{tr.l2NoFindings}</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {report.findings.map((f, i) => (
                <div key={i} className={`p-3 rounded-lg border-s-4 ${getFindingStyle(f.type)}`}>
                  <div className={`flex items-center gap-2 mb-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                    <span className="text-[9px] font-bold font-mono text-slate-500">{f.code}</span>
                    {f.table && <span className="text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-600 px-1.5 py-0.5 rounded">{f.table}</span>}
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 text-start">{f.description}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!report && !isRunning && (
        <p className="text-[10px] text-slate-400 italic text-start">{tr.l2NoFindings}</p>
      )}
    </section>
  );
}
