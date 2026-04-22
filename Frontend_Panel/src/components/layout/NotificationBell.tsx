// @ts-nocheck
"use client";
import { useState, useEffect, useCallback } from "react";
import { useLanguageStore } from "@/store/useLanguageStore";
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendLocalNotification,
  type NotificationPermissionState,
} from "@/services/notificationService";
import { t } from "@/lib/i18n";

// ============================================================
// NOTIFICATION BELL — Bildirim Kontrol Bileşeni
// ============================================================
// NavBar'a entegre edilecek.
// İzin durumuna göre ikon + renk değişir.
// Test bildirimi gönderme desteği.
// ============================================================

export default function NotificationBell() {
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);
  const [permission, setPermission] = useState<NotificationPermissionState>("default");
  const [showMenu, setShowMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPermission(getNotificationPermission());
  }, []);

  const handleRequestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
  }, []);

  const handleTestNotification = useCallback(async () => {
    setIsSending(true);
    await sendLocalNotification(
      tr.notifTestTitle,
      tr.notifTestBody,
      { tag: "Sistem Takip Paneli-test" }
    );
    setIsSending(false);
    setShowMenu(false);
  }, [tr]);

  // İkon durumu
  const getIcon = () => {
    switch (permission) {
      case "granted":
        return "🔔";
      case "denied":
        return "🔕";
      case "unsupported":
        return "⚠️";
      default:
        return "🔔";
    }
  };

  const getStatusColor = () => {
    switch (permission) {
      case "granted":
        return "bg-green-500";
      case "denied":
        return "bg-red-500";
      default:
        return "bg-yellow-500";
    }
  };

  return (
    <div className="relative">
      {/* Ana Buton */}
      <button
        id="notification-bell"
        onClick={() => setShowMenu(!showMenu)}
        className="relative text-lg p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        title={tr.notifTitle}
      >
        {getIcon()}
        {/* Durum noktası */}
        <span
          className={`absolute -top-0.5 ${dir === "rtl" ? "-left-0.5" : "-right-0.5"} w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${getStatusColor()}`}
        />
      </button>

      {/* Dropdown Menü */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          {/* Panel */}
          <div
            className={`absolute top-full mt-2 z-50 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden ${dir === "rtl" ? "left-0" : "right-0"
              }`}
          >
            {/* Başlık */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest text-start">
                {tr.notifTitle}
              </p>
            </div>

            {/* Durum */}
            <div className="px-4 py-3">
              <div className={`flex items-center gap-2 mb-3 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
                <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 text-start">
                  {permission === "granted" && tr.notifEnabled}
                  {permission === "denied" && tr.notifBlocked}
                  {permission === "default" && tr.notifAskPermission}
                  {permission === "unsupported" && tr.notifUnsupported}
                </span>
              </div>

              {/* İzin iste butonu */}
              {permission === "default" && (
                <button
                  id="notification-enable"
                  onClick={handleRequestPermission}
                  className="w-full text-[10px] font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-2 rounded-lg hover:opacity-90 transition-all uppercase tracking-wider"
                >
                  {tr.notifEnableButton}
                </button>
              )}

              {/* İzin verilmiş → test gönder */}
              {permission === "granted" && (
                <button
                  id="notification-test"
                  onClick={handleTestNotification}
                  disabled={isSending}
                  className="w-full text-[10px] font-bold bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-all uppercase tracking-wider disabled:opacity-50"
                >
                  {isSending ? tr.notifSending : tr.notifTestButton}
                </button>
              )}

              {/* İzin reddedilmiş */}
              {permission === "denied" && (
                <p className="text-[10px] text-red-500 leading-relaxed text-start">
                  {tr.notifDeniedHint}
                </p>
              )}
            </div>

            {/* PWA Kurulumu bilgisi */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-relaxed text-start">
                {tr.notifPwaHint}
              </p>
            </div>
          </div>
        </>
      )
      }
    </div >
  );
}

