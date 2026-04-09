import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import NavBar from "@/components/NavBar";
import DirProvider from "@/components/DirProvider";
import SwInit from "@/components/SwInit";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "STP-OPERASYON MERKEZİ",
  description: "Sistem Takip Paneli — Görev Yönetimi ve Denetim Merkezi",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "STP-PANEL",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-512x512.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" dir="ltr">
      <body className={`${inter.className} bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50`}>
        <DirProvider>
          <AuthProvider>
            <SwInit />
            <NavBar />
            {children}
            <PwaInstallPrompt />
          </AuthProvider>
        </DirProvider>
      </body>
    </html>
  );
}
