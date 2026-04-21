"use client";
import { useState, useEffect, useCallback } from "react";
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
//
// GÜNCELLEMELER:
// - Loading/error/success state'leri açıkça gösterilir
// - Bağlantısızken form devre dışı kalır (gönder butonu disabled)
// - Periyodik bağlantı kontrolü (60s) — durum değişirse anında günceller
// - Yeniden bağlanma butonu eklendi
// ============================================================

type Severity = "INFO" | "WARNING" | "CRITICAL" | "EMERGENCY";
type ConnectionState = "checking" | "connected" | "disconnected";

const SEVERITIES: { value: Severity; icon: string; label: string }[] = [
  { value: "INFO", icon: "ℹ️", label: "INFO" },
  { value: "WARNING", icon: "⚠️", label: "WARNING" },
  { value: "CRITICAL", icon: "🔴", label: "CRITICAL" },
  { value: "EMERGENCY", icon: "🚨", label: "EMERGENCY" },
];

const CONNECTION_CFG: Record<ConnectionState, { icon: string; text: string; color: string; bg: string; border: string }> = {
  checking:     { icon: '⟳', text: 'KONTROL EDİLİYOR...', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
  connected:    { icon: '✅', text: 'BAĞLI',               color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  disconnected: { icon: '📭', text: 'BAĞLANTI YOK',       color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30' },
};

export default function TelegramSender() {
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);

  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<Severity>("INFO");
  const [isSending, setIsSending] = useState(false);
  const [connState, setConnState] = useState<ConnectionState>("checking");

  // ── BAĞLANTI KONTROLÜ — başlangıç + 60s periyodik ──────────
  const checkConnection = useCallback(async () => {
    setConnState("checking");
    try {
      const res = await fetch("/api/notify", { signal: AbortSignal.timeout(8_000) });
      const data = await res.json();
      setConnState(data.available ? "connected" : "disconnected");
    } catch {
      setConnState("disconnected");
    }
  }, []);

  useEffect(() => {
    void checkConnection();
    const iv = setInterval(() => void checkConnection(), 60_000);
    return () => clearInterval(iv);
  }, [checkConnection]);

  // ── MESAJ GÖNDERME ──────────────────────────────────────────
  const handleSend = async () => {
    if (!message.trim() || isSending || connState !== "connected") return;
    setIsSending(true);
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Sistem Takip Paneli Panel Bildirimi",
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
      // Gönderim başarısız → bağlantıyı tekrar kontrol et
      void checkConnection();
    } finally {
      setIsSending(false);
    }
  };

  const cfg = CONNECTION_CFG[connState];
  const isDisabled = connState !== "connected";

  return (
    <section className="mb-8">
      <div className={`flex justify-between items-center mb-4 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
        <h2 className="text-sm font-bold text-slate-300 drop-shadow-[0_0_5px_currentColor] tracking-widest uppercase text-start">{tr.tgSendTitle}</h2>
        {/* ── BAĞLANTI DURUM GÖSTERGESİ ─────────────────────── */}
        <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border ${cfg.bg} ${cfg.border} shadow-sm`}>
          <span className={`text-[9px] font-black tracking-wider ${cfg.color} drop-shadow-[0_0_5px_currentColor] ${connState === 'checking' ? 'animate-spin' : ''}`}>
            {cfg.icon}
          </span>
          <span className={`text-[9px] font-bold ${cfg.color} drop-shadow-[0_0_2px_currentColor]`}>{cfg.text}</span>
          {connState === "disconnected" && (
            <button
              onClick={() => void checkConnection()}
              className="text-[8px] font-bold text-cyan-400 hover:text-cyan-300 underline ml-1 transition-colors drop-shadow-[0_0_3px_currentColor]"
            >
              TEKRAR DENE
            </button>
          )}
        </div>
      </div>

      <div className={`p-4 bg-white dark:bg-slate-800/40 border rounded-xl space-y-3 transition-opacity hover:border-slate-600/60 shadow-lg dark:shadow-none ${
        isDisabled
          ? 'border-slate-700/50 opacity-60'
          : 'border-slate-200 dark:border-slate-700/50'
      }`}>
        {/* Severity Seçimi */}
        <div className={`flex gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
          {SEVERITIES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSeverity(s.value)}
              disabled={isDisabled}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                severity === s.value
                  ? "bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-[0_0_10px_rgba(255,255,255,0.4)]"
                  : "bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400 hover:text-white"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Mesaj Kutusu */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border border-slate-200 dark:border-slate-600/50 dark:bg-slate-900/50 rounded-lg p-3 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none resize-none h-16 disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-500"
          placeholder={isDisabled ? "Telegram bağlantısı yok — mesaj gönderilemez" : tr.tgSendPlaceholder}
          disabled={isSending || isDisabled}
          dir={dir}
        />

        {/* Gönder */}
        <button
          onClick={handleSend}
          disabled={isSending || !message.trim() || isDisabled}
          className={`w-full text-[11px] font-bold text-white px-4 py-2.5 rounded-lg transition-all uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed ${
            isDisabled
              ? "bg-slate-800 border border-slate-700 text-slate-400"
              : "bg-blue-600 hover:bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
          }`}
        >
          {isDisabled
            ? '🔌 BAĞLANTI BEKLENİYOR'
            : isSending
              ? tr.tgSending
              : `📨 ${tr.tgSendButton}`}
        </button>
      </div>
    </section>
  );
}
