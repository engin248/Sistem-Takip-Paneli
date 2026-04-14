"use client";
import { useState, useEffect, useCallback } from "react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { t } from "@/lib/i18n";

// ============================================================
// HEALTH DASHBOARD — Sistem Sağlık Kontrolü
// ============================================================
// Kırılım #1 (Health Check UI) + #5 (Bridge Dashboard) düzeltmesi
//
// ÜST: /api/health-check endpoint'i
// ALT: bridgeService + supabase validation
// ÖN: Canlı sağlık kartları (STP DB + Dış DB + Dış Web)
// ARKA: 60 saniyede bir otomatik polling
// ============================================================

interface SystemHealth {
  name: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  latencyMs: number;
  details?: Record<string, unknown>;
}

interface HealthReport {
  status: "healthy" | "degraded" | "down";
  timestamp: string;
  systems: SystemHealth[];
  externalSystem: {
    dbConnected: boolean;
    dbLatencyMs: number;
    siteReachable: boolean;
    siteLatencyMs: number;
    siteUrl: string;
  };
}

const POLL_INTERVAL_MS = 60_000; // 60 saniye

export default function HealthDashboard() {
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);

  const [report, setReport] = useState<HealthReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    try {
      const res = await fetch("/api/health-check");
      const data: HealthReport = await res.json();
      setReport(data);
      setLastCheckTime(new Date().toLocaleTimeString(lang === "ar" ? "ar-SA" : "tr-TR"));
    } catch {
      setReport({
        status: "down",
        timestamp: new Date().toISOString(),
        systems: [],
        externalSystem: { dbConnected: false, dbLatencyMs: 0, siteReachable: false, siteLatencyMs: 0, siteUrl: "" },
      });
      setLastCheckTime(new Date().toLocaleTimeString(lang === "ar" ? "ar-SA" : "tr-TR"));
    } finally {
      setIsChecking(false);
    }
  }, [lang]);

  // İlk yüklemede ve 60 saniyede bir kontrol et
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // Durum → renk + label
  function getStatusStyle(status: string) {
    switch (status) {
      case "healthy":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-900/20",
          border: "border-emerald-200 dark:border-emerald-800",
          text: "text-emerald-700 dark:text-emerald-400",
          dot: "bg-emerald-500",
          label: tr.healthHealthy,
        };
      case "degraded":
        return {
          bg: "bg-amber-50 dark:bg-amber-900/20",
          border: "border-amber-200 dark:border-amber-800",
          text: "text-amber-700 dark:text-amber-400",
          dot: "bg-amber-500",
          label: tr.healthDegraded,
        };
      case "down":
        return {
          bg: "bg-red-50 dark:bg-red-900/20",
          border: "border-red-200 dark:border-red-800",
          text: "text-red-700 dark:text-red-400",
          dot: "bg-red-500",
          label: tr.healthDown,
        };
      default:
        return {
          bg: "bg-slate-50 dark:bg-slate-800",
          border: "border-slate-200 dark:border-slate-700",
          text: "text-slate-500",
          dot: "bg-slate-400",
          label: tr.healthUnknown,
        };
    }
  }

  const overallStyle = report ? getStatusStyle(report.status) : getStatusStyle("unknown");

  return (
    <section className="mb-8">
      {/* Başlık */}
      <div className={`flex justify-between items-center mb-4 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
        <div>
          <h2 className="text-sm font-bold text-slate-500 tracking-widest uppercase text-start">
            {tr.healthTitle}
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5 text-start">{tr.healthSubtitle}</p>
        </div>
        <div className={`flex items-center gap-3 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
          {lastCheckTime && (
            <span className="text-[9px] text-slate-400">
              {tr.healthLastCheck}: {lastCheckTime}
            </span>
          )}
          <button
            onClick={checkHealth}
            disabled={isChecking}
            className="text-[10px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-1.5 rounded-lg hover:opacity-90 transition-all uppercase tracking-wider disabled:opacity-50"
          >
            {isChecking ? tr.healthChecking : tr.healthCheckNow}
          </button>
        </div>
      </div>

      {/* Genel Durum Çubuğu */}
      <div className={`flex items-center gap-2 mb-4 p-2.5 rounded-xl border ${overallStyle.bg} ${overallStyle.border} ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${overallStyle.dot} ${report?.status === "healthy" ? "animate-pulse" : ""}`} />
        <span className={`text-[11px] font-bold uppercase tracking-wider ${overallStyle.text}`}>
          {report ? overallStyle.label : tr.healthChecking}
        </span>
        {report && (
          <span className="text-[9px] text-slate-400 ms-auto">
            {report.systems.length} sistem kontrol edildi
          </span>
        )}
      </div>

      {/* Sistem Kartları */}
      {report && report.systems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {report.systems.map((sys, i) => {
            const style = getStatusStyle(sys.status);
            return (
              <div
                key={i}
                className={`p-3 rounded-xl border ${style.bg} ${style.border} transition-all hover:shadow-sm`}
              >
                <div className={`flex items-center gap-2 mb-1.5 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate text-start">
                    {sys.name}
                  </span>
                </div>
                <div className={`flex items-center gap-3 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                  <span className={`text-[10px] font-bold uppercase ${style.text}`}>
                    {style.label}
                  </span>
                  {sys.latencyMs > 0 && (
                    <span className="text-[9px] text-slate-400 font-mono">
                      {tr.healthLatency}: {sys.latencyMs}ms
                    </span>
                  )}
                </div>
                {sys.details && typeof sys.details.error === "string" && (
                  <p className="text-[9px] text-red-500 mt-1 truncate text-start">
                    {sys.details.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
