"use client";
import { useState, useEffect } from "react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { t } from "@/lib/i18n";
import { toast } from "sonner";

// ============================================================
// TELEGRAM SENDER — Panel Üzerinden Mesaj Gönderme
// ============================================================
// Kırılım #7 düzeltmesi
//
// ÜST: /api/notify endpoint'i
// ALT: telegramNotifier.ts
// ÖN: Mesaj kutusu + severity seçimi + gönder butonu
// ============================================================

type Severity = "INFO" | "WARNING" | "CRITICAL" | "EMERGENCY";

const SEVERITIES: { value: Severity; icon: string; label: string }[] = [
  { value: "INFO", icon: "ℹ️", label: "INFO" },
  { value: "WARNING", icon: "⚠️", label: "WARNING" },
  { value: "CRITICAL", icon: "🔴", label: "CRITICAL" },
  { value: "EMERGENCY", icon: "🚨", label: "EMERGENCY" },
];

export default function TelegramSender() {
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);

  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<Severity>("INFO");
  const [isSending, setIsSending] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Telegram durumunu kontrol et
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/notify");
        const data = await res.json();
        setIsAvailable(data.available ?? false);
      } catch {
        setIsAvailable(false);
      }
    })();
  }, []);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "STP Panel Bildirimi",
          message: message.trim(),
          severity,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(tr.tgSentSuccess);
        setMessage("");
      } else {
        toast.error(`${tr.tgSentError}: ${data.error || ""}`);
      }
    } catch {
      toast.error(tr.tgSentError);
    } finally {
      setIsSending(false);
    }
  };

  if (isAvailable === false) {
    return (
      <section className="mb-8">
        <div className={`flex justify-between items-center mb-4 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
          <h2 className="text-sm font-bold text-slate-500 tracking-widest uppercase text-start">{tr.tgSendTitle}</h2>
        </div>
        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
          <span>📭</span>
          <p className="text-[11px] text-slate-500 text-start">{tr.tgNotAvailable}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className={`flex justify-between items-center mb-4 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
        <h2 className="text-sm font-bold text-slate-500 tracking-widest uppercase text-start">{tr.tgSendTitle}</h2>
        {isAvailable && <span className="text-[9px] text-emerald-500 font-bold">✅ BAĞLI</span>}
      </div>

      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
        {/* Severity Seçimi */}
        <div className={`flex gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
          {SEVERITIES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSeverity(s.value)}
              className={`text-[9px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                severity === s.value
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400"
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Mesaj Kutusu */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-16"
          placeholder={tr.tgSendPlaceholder}
          disabled={isSending}
          dir={dir}
        />

        {/* Gönder */}
        <button
          onClick={handleSend}
          disabled={isSending || !message.trim()}
          className="w-full text-[10px] font-bold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all uppercase tracking-wider disabled:opacity-50"
        >
          {isSending ? tr.tgSending : `📨 ${tr.tgSendButton}`}
        </button>
      </div>
    </section>
  );
}
