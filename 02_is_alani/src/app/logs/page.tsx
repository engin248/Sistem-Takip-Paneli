import type { Metadata } from "next";
import LogsClient from "./LogsClient";

// ============================================================
// /logs — Audit Log Sayfası (Server Component)
// ============================================================
// Next.js 16+ Server Component olarak statik metadata sağlar.
// İstemci etkileşimleri LogsClient'a devredilir.
// ============================================================

export const metadata: Metadata = {
  title: "Audit Log | STP-OPERASYON MERKEZİ",
  description: "Sistem denetim kayıtları ve operasyon geçmişi",
};

export default function LogsPage() {
  return <LogsClient />;
}
