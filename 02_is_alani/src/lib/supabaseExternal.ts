// ============================================================
// DIŞ SİSTEM SUPABASE CLIENT — KÖPRÜ BAĞLANTISI
// ============================================================
// STP'nin kendi DB'sinden (tesxmqhk...) AYRI bir ikinci
// Supabase client'ı. Dış sistemin DB'sine bağlanır.
//
// Kullanım: bridgeService.ts tarafından çağrılır.
// Güvenlik: SADECE READ işlemleri için tasarlanmıştır.
// Hata Kodu: ERR-STP001-030 (dış bağlantı)
// ============================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ERR, processError } from "./errorCore";

// ─── ÇEVRESEL DEĞİŞKENLER ───────────────────────────────────
const externalUrl: string = (process.env.EXTERNAL_SUPABASE_URL ?? "").trim();
const externalKey: string = (process.env.EXTERNAL_SUPABASE_ANON_KEY ?? "").trim();

// ─── SİNGLETON CLIENT ────────────────────────────────────────
let externalSupabase: SupabaseClient | null = null;

/**
 * Dış Supabase client'ını lazily oluşturur.
 * URL ve key tanımlı değilse null döner — bridge devre dışı kalır.
 */
export function getExternalSupabase(): SupabaseClient | null {
  if (externalSupabase) return externalSupabase;

  if (!externalUrl || externalUrl === "" || externalUrl.includes("placeholder")) {
    return null;
  }

  if (!externalKey || externalKey === "" || externalKey.includes("placeholder")) {
    return null;
  }

  try {
    externalSupabase = createClient(externalUrl, externalKey);
    return externalSupabase;
  } catch (error) {
    processError(ERR.SYSTEM_GENERAL, error, {
      kaynak: 'supabaseExternal.ts',
      islem: 'EXTERNAL_CLIENT_INIT',
    }, 'CRITICAL');
    return null;
  }
}

/**
 * Dış Supabase bağlantısının tanımlı olup olmadığını kontrol eder.
 */
export function isExternalConfigured(): boolean {
  return !!(
    externalUrl &&
    externalUrl !== "" &&
    !externalUrl.includes("placeholder") &&
    externalKey &&
    externalKey !== "" &&
    !externalKey.includes("placeholder")
  );
}

/**
 * Dış bağlantı detaylarını döndürür (key gizli).
 */
export function getExternalConnectionInfo(): {
  configured: boolean;
  url: string;
  projectId: string;
} {
  const configured = isExternalConfigured();
  // URL'den proje ID'sini çıkar: https://XXXXX.supabase.co → XXXXX
  const projectId = externalUrl
    ? externalUrl.replace("https://", "").replace(".supabase.co", "").substring(0, 12)
    : "";

  return {
    configured,
    url: configured ? externalUrl : "",
    projectId: configured ? `${projectId}...` : "",
  };
}
