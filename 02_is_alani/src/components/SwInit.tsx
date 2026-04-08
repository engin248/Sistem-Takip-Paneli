"use client";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/swRegister";

// ============================================================
// SW INITIALIZER — Service Worker Bootstrap Bileşeni
// ============================================================
// Layout'a yerleştirilir, uygulama yüklendiğinde SW'yi kaydeder.
// Görsel çıktı üretmez (null render).
// ============================================================

export default function SwInit() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
