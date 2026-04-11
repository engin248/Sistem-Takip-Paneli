import type { NextConfig } from "next";

// ============================================================
// NEXT.JS 16+ YAPILANDIRMASI — STP
// ============================================================
// Mimari kararlar:
// - Turbopack varsayılan (Next 16+)
// - serverExternalPackages: Grammy bot Node.js API'leri kullanır
// - Güvenlik başlıkları: vercel.json + next.config çift katman
// - Console temizleme: Üretimde sadece error bırakılır
// ============================================================

const nextConfig: NextConfig = {
  // ── Derleyici Optimizasyonları ───────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === "production"
      ? { exclude: ["error", "warn"] }
      : false,
  },

  // ── Sunucu Tarafı Dış Paketler ──────────────────────────
  // Grammy (Telegram bot) ve Playwright Node.js native API'leri
  // kullandığı için bundler dışında kalmalı
  serverExternalPackages: ["grammy", "playwright"],

  // ── Deneysel Özellikler (Next.js 16+) ───────────────────
  experimental: {
    // Server Actions ile form işleme
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // Optimized package imports
    optimizePackageImports: [
      "@supabase/supabase-js",
      "zustand",
      "zod",
      "sonner",
    ],
  },

  // ── Güvenlik Başlıkları ─────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      {
        // Service Worker — cache bypass + doğru MIME tipi
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },

  // ── Logging ─────────────────────────────────────────────
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV !== "production",
    },
  },
};

export default nextConfig;
