import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import NavBar from "@/components/NavBar";
import DirProvider from "@/components/DirProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "STP-OPERASYON MERKEZİ",
  description: "Sistem Takip Paneli — Görev Yönetimi ve Denetim Merkezi",
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
          <Toaster position="top-right" richColors />
          <NavBar />
          {children}
        </DirProvider>
      </body>
    </html>
  );
}
