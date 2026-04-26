// KOK NEDEN: @ts-nocheck kaldirildi (2026-04-26). 
// Maskelenen hata: notificationService API'si degismisti ama bu dosya eski API'yi import ediyordu.
"use client";
import { useState, useEffect, useCallback } from "react";
import { useLanguageStore } from "@/store/useLanguageStore";
import {
  getNotifications,
  markAllAsRead,
  getOkunmamisSayisi,
  type Notification,
} from "@/services/notificationService";
import { t } from "@/lib/i18n";

// ============================================================
// NOTIFICATION BELL - Bildirim Kontrol Bileseni
// ============================================================

export default function NotificationBell() {
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);
  const [okunmamis, setOkunmamis] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [bildirimler, setBildirimler] = useState<Notification[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setOkunmamis(getOkunmamisSayisi());
      setBildirimler(getNotifications(true).slice(0, 10));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAll = useCallback(() => {
    markAllAsRead();
    setOkunmamis(0);
    setBildirimler([]);
  }, []);

  const getTipRenk = (tip: Notification['tip']) => {
    switch (tip) {
      case 'hata': return 'bg-red-500';
      case 'uyari': return 'bg-yellow-500';
      case 'basari': return 'bg-green-500';
      default: return 'bg-blue-500';
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
        {okunmamis > 0 ? '🔔' : '🔕'}
        {/* Badge */}
        {okunmamis > 0 && (
          <span className={`absolute -top-1 ${dir === "rtl" ? "-left-1" : "-right-1"} min-w-[18px] h-[18px] flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full border-2 border-white dark:border-slate-900`}>
            {okunmamis > 9 ? '9+' : okunmamis}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div
            className={`absolute top-full mt-2 z-50 w-72 bg-white dark:bg-black/20 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden ${dir === "rtl" ? "left-0" : "right-0"}`}
          >
            {/* Baslik */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                {tr.notifTitle}
              </p>
              {okunmamis > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="text-[10px] text-blue-500 hover:text-blue-700"
                >
                  Tumu Okundu
                </button>
              )}
            </div>

            {/* Bildirimler */}
            <div className="max-h-64 overflow-y-auto">
              {bildirimler.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-slate-400">Yeni bildirim yok</p>
                </div>
              ) : (
                bildirimler.map((b) => (
                  <div key={b.id} className="px-4 py-2.5 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex items-start gap-2">
                      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getTipRenk(b.tip)}`} />
                      <div>
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{b.baslik}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{b.mesaj}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{new Date(b.zaman).toLocaleTimeString('tr-TR')}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
