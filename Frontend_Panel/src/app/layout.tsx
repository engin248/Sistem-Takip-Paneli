import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import NavBar from "@/components/layout/NavBar";
import DirProvider from "@/components/layout/DirProvider";
import AuthProvider from "@/components/auth/AuthProvider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistem Takip Paneli-OPERASYON MERKEZİ",
  description: "Sistem Takip Paneli — Görev Yönetimi ve Denetim Merkezi",
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
      <body className={`${inter.className} bg-[#030712] text-slate-100 antialiased`}>
        <Toaster position="top-right" richColors theme="dark" />
        <DirProvider>
          {/* AuthProvider: Supabase Auth etkinleştirildiğinde
              .env.local'e NEXT_PUBLIC_SUPABASE_AUTH_ENABLED=true ekleyin.
              Auth kapalıyken doğrudan dashboard gösterilir. */}
          {process.env.NEXT_PUBLIC_SUPABASE_AUTH_ENABLED === 'true' ? (
            <AuthProvider>
              {children}
            </AuthProvider>
          ) : (
            <>
              {children}
            </>
          )}
        </DirProvider>
      </body>
    </html>
  );
}
