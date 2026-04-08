"use client";
import { useState, useEffect, useCallback } from "react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { t } from "@/lib/i18n";

// ============================================================
// PWA INSTALL PROMPT — Ana Ekrana Ekleme Bileşeni
// ============================================================
// beforeinstallprompt olayını yakalar ve kullanıcıya
// uygulamayı ana ekrana ekleme seçeneği sunar.
// ============================================================

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const { lang, dir } = useLanguageStore();
  const tr = t(lang);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // PWA zaten kuruluysa banner gösterme
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Kurulum tamamlandıysa
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  // Kuruluysa veya prompt yoksa gösterme
  if (isInstalled || !showBanner) return null;

  return (
    <div
      id="pwa-install-banner"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md"
    >
      <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-2xl p-4 flex items-center gap-4 border border-slate-700 dark:border-slate-200">
        {/* İkon */}
        <div className="shrink-0 w-12 h-12 bg-white/10 dark:bg-slate-900/10 rounded-xl flex items-center justify-center text-2xl">
          📱
        </div>

        {/* Metin */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold tracking-tight text-start">
            {tr.pwaInstallTitle}
          </p>
          <p className="text-[10px] text-slate-300 dark:text-slate-500 mt-0.5 text-start">
            {tr.pwaInstallDesc}
          </p>
        </div>

        {/* Butonlar */}
        <div className={`flex gap-2 shrink-0 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
          <button
            onClick={() => setShowBanner(false)}
            className="text-[10px] text-slate-400 hover:text-white dark:hover:text-slate-900 transition-colors px-2 py-1 font-bold"
          >
            {tr.pwaLater}
          </button>
          <button
            id="pwa-install-button"
            onClick={handleInstall}
            className="text-[10px] font-bold bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all uppercase tracking-wider"
          >
            {tr.pwaInstallButton}
          </button>
        </div>
      </div>
    </div>
  );
}
