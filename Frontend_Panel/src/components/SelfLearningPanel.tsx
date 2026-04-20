"use client";
import { useState } from "react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { t } from "@/lib/i18n";
import { toast } from "sonner";

// ============================================================
// SELF-LEARNING PANEL — G-8 Pattern Motoru Arayüzü
// ============================================================
// Kırılım #3 düzeltmesi
//
// ÜST: /api/learn endpoint'i
// ALT: selfLearningEngine.ts (frekans analizi, anomali tespiti, öneri üretimi)
// ÖN: Pattern tablosu + anomali kartları + öneri listesi
// ============================================================

interface ErrorPattern {
  error_code: string;
  count: number;
  first_seen: string;
  last_seen: string;
  trend: "INCREASING" | "STABLE" | "DECREASING";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  sources: string[];
}

interface AnomalyDetection {
  type: "SPIKE" | "RECURRING" | "NEW_ERROR";
  error_code: string;
  description: string;
  confidence: number;
  detected_at: string;
}

interface LearningReport {
  engine: string;
  timestamp: string;
  duration_ms: number;
  analysis_window_hours: number;
  total_errors_analyzed: number;
  patterns: ErrorPattern[];
  anomalies: AnomalyDetection[];
  recommendations: string[];
}

export default function SelfLearningPanel() {
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);

  const [report, setReport] = useState<LearningReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runAnalysis = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/learn");
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
        toast.success(`G-8 Analiz: ${data.report.total_errors_analyzed} hata, ${data.report.patterns.length} pattern, ${data.report.anomalies.length} anomali`);
      }
    } catch {
      toast.error("Self-Learning çalıştırılamadı");
    } finally {
      setIsRunning(false);
    }
  };

  function getSeverityStyle(severity: string) {
    switch (severity) {
      case "CRITICAL": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
      case "HIGH": return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400";
      case "MEDIUM": return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
      default: return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    }
  }

  function getTrendLabel(trend: string) {
    switch (trend) {
      case "INCREASING": return { label: `📈 ${tr.slTrendUp}`, color: "text-red-600" };
      case "DECREASING": return { label: `📉 ${tr.slTrendDown}`, color: "text-green-600" };
      default: return { label: `➡️ ${tr.slTrendStable}`, color: "text-slate-500" };
    }
  }

  return (
    <section className="mb-8">
      {/* Başlık */}
      <div className={`flex justify-between items-center mb-4 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
        <div>
          <h2 className="text-sm font-bold text-slate-500 tracking-widest uppercase text-start">{tr.slTitle}</h2>
          <p className="text-[10px] text-slate-400 mt-0.5 text-start">{tr.slSubtitle}</p>
        </div>
        <button
          onClick={runAnalysis}
          disabled={isRunning}
          className="text-[10px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-1.5 rounded-lg hover:opacity-90 transition-all uppercase tracking-wider disabled:opacity-50"
        >
          {isRunning ? tr.slRunning : tr.slRunAnalysis}
        </button>
      </div>

      {report && (
        <>
          {/* Özet Çubuğu */}
          <div className={`flex items-center gap-4 mb-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
              📊 {report.total_errors_analyzed} {tr.slTotalErrors}
            </span>
            <span className="text-[10px] font-bold text-purple-600">🔍 {report.patterns.length} {tr.slPatterns}</span>
            <span className="text-[10px] font-bold text-red-600">⚠️ {report.anomalies.length} {tr.slAnomalies}</span>
            <span className="text-[9px] text-slate-400 ms-auto font-mono">{report.duration_ms}ms</span>
          </div>

          {/* Pattern Tablosu */}
          {report.patterns.length > 0 && (
            <div className="mb-4 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-start py-2 px-2 font-bold text-slate-500 uppercase text-[9px]">Kod</th>
                    <th className="text-start py-2 px-2 font-bold text-slate-500 uppercase text-[9px]">Sayı</th>
                    <th className="text-start py-2 px-2 font-bold text-slate-500 uppercase text-[9px]">Trend</th>
                    <th className="text-start py-2 px-2 font-bold text-slate-500 uppercase text-[9px]">{tr.alarmSeverity}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.patterns.slice(0, 10).map((p, i) => {
                    const trend = getTrendLabel(p.trend);
                    return (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-2 font-mono font-bold text-blue-600">{p.error_code}</td>
                        <td className="py-2 px-2 font-bold">{p.count}×</td>
                        <td className={`py-2 px-2 font-bold ${trend.color}`}>{trend.label}</td>
                        <td className="py-2 px-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${getSeverityStyle(p.severity)}`}>{p.severity}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Öneriler */}
          {report.recommendations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-start">{tr.slRecommendations}</h3>
              {report.recommendations.map((rec, i) => (
                <div key={i} className="p-2.5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 text-start">💡 {rec}</p>
                </div>
              ))}
            </div>
          )}

          {report.patterns.length === 0 && (
            <p className="text-[10px] text-slate-400 italic text-start">{tr.slNoPatterns}</p>
          )}
        </>
      )}

      {!report && !isRunning && (
        <p className="text-[10px] text-slate-400 italic text-start">{tr.slNoPatterns}</p>
      )}
    </section>
  );
}
