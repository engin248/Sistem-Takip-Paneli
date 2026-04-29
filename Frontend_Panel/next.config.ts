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
  typescript: {
    // HATA #21 DÜZELTİLDİ: ignoreBuildErrors kaldırıldı.
    // Önceden: ignoreBuildErrors: true — TypeScript hataları yok sayılıyordu.
    // Artık build hatası anında derlemeyi durdurur.
    ignoreBuildErrors: false,
  },

  // ── Sunucu Tarafı Dış Paketler ──────────────────────────
  // Grammy (Telegram) node.js apisi kullanır
  serverExternalPackages: ["grammy", "@google/generative-ai"],

  // ── Deneysel Özellikler (Next.js 16+) ───────────────────
  experimental: {
    // Next.js kök dizini dışındaki dosyaları (Sistem Takip Paneli içindeki departmanlar) içeri aktarmaya izin verir
    externalDir: true,
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

  // ── Görsel Kaynakları ────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },

  // ── Güvenlik Başlıkları ─────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
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
