"use client";
import { useState, useEffect, useCallback } from "react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { t } from "@/lib/i18n";
import { toast } from "sonner";

// ============================================================
// ALARM PANEL — Alarm Merkezi Arayüzü
// ============================================================
// ÜST: /api/alarms endpoint'i (GET + PATCH)
// ALT: alarmService.ts → Sistem Takip Paneli_alarms tablosu (Supabase persist) + in-memory cache
// ÖN: Açık alarm listesi + istatistik kartları + ÇÖZÜLDÜ butonu
// ============================================================

interface AlarmKaydi {
  id: string;
  baslik: string;
  aciklama: string;
  seviye: string;
  modul: string;
  durum: string;
  tekrar_sayisi: number;
  ilk_tetiklenme: string;
  son_tetiklenme: string;
}

interface AlarmStats {
  toplam: number;
  acik: number;
  emergency: number;
  critical: number;
  warning: number;
}

export default function AlarmPanel() {
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);

  const [alarms, setAlarms] = useState<AlarmKaydi[]>([]);
  const [stats, setStats] = useState<AlarmStats>({ toplam: 0, acik: 0, emergency: 0, critical: 0, warning: 0 });
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadAlarms = useCallback(async () => {
    try {
      const res = await fetch("/api/alarms");
      const data = await res.json();
      if (data.success) {
        setAlarms(data.alarms || []);
        setStats(data.stats || { toplam: 0, acik: 0, emergency: 0, critical: 0, warning: 0 });
      }
    } catch { /* sessiz */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initialFetch() {
      try {
        const res = await fetch("/api/alarms");
        const data = await res.json();
        if (!cancelled && data.success) {
          setAlarms(data.alarms || []);
          setStats(data.stats || { toplam: 0, acik: 0, emergency: 0, critical: 0, warning: 0 });
        }
      } catch { /* sessiz — bağlantı yoksa UI boş kalır */ }
    }
    initialFetch();
    const interval = setInterval(loadAlarms, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [loadAlarms]);

  // ── ALARM ÇÖZME ──────────────────────────────────────────────
  const resolveAlarm = useCallback(async (alarm: AlarmKaydi) => {
    setResolvingId(alarm.id);
    try {
      const res = await fetch("/api/alarms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modul: alarm.modul, baslik: alarm.baslik, durum: "COZULDU" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`✅ Alarm çözüldü: ${alarm.baslik}`);
        await loadAlarms();
      } else {
        toast.error(`Alarm çözülemedi: ${data.error || "Bilinmeyen hata"}`);
      }
    } catch {
      toast.error("Alarm çözme başarısız — bağlantı hatası");
    } finally {
      setResolvingId(null);
    }
  }, [loadAlarms]);

  function getSeverityStyle(seviye: string) {
    switch (seviye) {
      case "EMERGENCY": return { bg: "bg-red-100 dark:bg-red-900/30", border: "border-red-300 dark:border-red-800", text: "text-red-700 dark:text-red-400", icon: "🚨" };
      case "CRITICAL": return { bg: "bg-orange-100 dark:bg-orange-900/30", border: "border-orange-300 dark:border-orange-800", text: "text-orange-700 dark:text-orange-400", icon: "⚠️" };
      case "WARNING": return { bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-300 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400", icon: "⚡" };
      default: return { bg: "bg-blue-100 dark:bg-blue-900/30", border: "border-blue-300 dark:border-blue-800", text: "text-blue-700 dark:text-blue-400", icon: "ℹ️" };
    }
  }

  return (
    <section className="mb-8">
      {/* Başlık */}
      <div className={`flex justify-between items-center mb-4 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
        <div>
          <h2 className="text-sm font-bold text-slate-500 tracking-widest uppercase text-start">{tr.alarmTitle}</h2>
          <p className="text-[10px] text-slate-400 mt-0.5 text-start">{tr.alarmSubtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {stats.acik > 0 && (
            <span className="text-[10px] font-black bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 rounded-full">
              {stats.acik} aktif
            </span>
          )}
          <button
            onClick={loadAlarms}
            className="text-[9px] font-bold text-slate-500 hover:text-cyan-400 transition-colors tracking-wider uppercase"
          >
            ⟳ YENİLE
          </button>
        </div>
      </div>

      {/* İstatistik Çubuğu */}
      {stats.toplam > 0 && (
        <div className={`flex items-center gap-4 mb-4 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
          <span className="text-[10px] font-bold text-red-600">🚨 {stats.emergency} EMERGENCY</span>
          <span className="text-[10px] font-bold text-orange-600">⚠️ {stats.critical} CRITICAL</span>
          <span className="text-[10px] font-bold text-amber-600">⚡ {stats.warning} WARNING</span>
        </div>
      )}

      {/* Alarm Listesi */}
      {alarms.length === 0 ? (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <span className="text-lg">✅</span>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold text-start">{tr.alarmNoActive}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {alarms.map((alarm) => {
            const style = getSeverityStyle(alarm.seviye);
            const isResolving = resolvingId === alarm.id;
            return (
              <div key={alarm.id} className={`p-3 rounded-xl border ${style.bg} ${style.border}`}>
                <div className={`flex items-center gap-2 mb-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                  <span>{style.icon}</span>
                  <span className={`text-[11px] font-bold ${style.text} text-start flex-1`}>{alarm.baslik}</span>
                  <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-600 px-1.5 py-0.5 rounded">{alarm.modul}</span>
                  {/* ── ÇÖZÜLDÜ BUTONU ────────────────────────── */}
                  <button
                    id={`alarm-resolve-${alarm.id}`}
                    onClick={(e) => { e.stopPropagation(); void resolveAlarm(alarm); }}
                    disabled={isResolving}
                    className="text-[8px] font-black tracking-wider uppercase px-2 py-1 rounded-lg border transition-all
                      bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400
                      border-emerald-300 dark:border-emerald-700
                      hover:bg-emerald-100 dark:hover:bg-emerald-900/40
                      disabled:opacity-40 flex-shrink-0"
                  >
                    {isResolving ? "⟳" : "✓ ÇÖZÜLDÜ"}
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 text-start">{alarm.aciklama}</p>
                <div className={`flex items-center gap-3 mt-1.5 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                  <span className="text-[9px] text-slate-400 font-mono">{alarm.tekrar_sayisi}× {tr.alarmRepeat}</span>
                  <span className="text-[9px] text-slate-400">
                    {new Date(alarm.son_tetiklenme).toLocaleTimeString(lang === "ar" ? "ar-SA" : "tr-TR")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
