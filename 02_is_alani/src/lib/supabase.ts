// ============================================================
// STP-003-E1 | SUPABASE İSKELET YAPILANDIRMASI
// İş Emri: STP-OPS-003
// Tarih: 2026-04-08
// Doktrin: SIFIR İNİSİYATİF / KESİN KANIT İLKESİ
// ============================================================
// createClient metodu çevresel değişkenlerle mühürlenmiştir.
// Eksik bağlantı bilgisi durumunda sistem derleme aşamasında
// hata VERMEZ ancak çalışma zamanında bağlantı başarısız olur.
// ============================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ERR, processError } from "./errorCore";
// Database tipleri referans olarak kullanılır — doğrudan generic
// olarak verilmez çünkü @supabase/supabase-js internal PostgREST
// tipleri ile uyumsuzluk yaratıyor.
// import type { Database } from "./database.types";

// ============================================================
// ÇEVRESEL DEĞİŞKEN OKUMA VE DOĞRULAMA
// ============================================================
const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ============================================================
// SUPABASE CLIENT — TEK ÖRNEK (SINGLETON)
// ============================================================
// createClient, verilen URL ve Anon Key ile Supabase bağlantısı
// oluşturur. Bu client tüm uygulama genelinde tekil olarak
// kullanılır (modül seviyesinde singleton).
// ============================================================
let supabase: SupabaseClient;

try {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  processError(ERR.DB_CONNECTION, error, {
    islem: 'CLIENT_INIT',
    kaynak: 'supabase.ts',
    url_var: !!supabaseUrl,
    key_var: !!supabaseAnonKey
  }, 'CRITICAL');
  // Fallback: Boş URL ile client oluştur — runtime'da hata verir ama build kırılmaz
  supabase = createClient("https://placeholder.supabase.co", "placeholder-key");
}

export { supabase };

// ============================================================
// BAĞLANTI DOĞRULAMA FONKSİYONU
// ============================================================
// Çalışma zamanında çevresel değişkenlerin tanımlı olup
// olmadığını kontrol eder. Build aşamasında değil, runtime'da
// çağrılmalıdır.
// ============================================================
export function validateSupabaseConnection(): {
  isValid: boolean;
  missingVars: string[];
} {
  const missingVars: string[] = [];

  try {
    if (!supabaseUrl || supabaseUrl === "" || supabaseUrl.includes("your-project-id")) {
      missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
    }

    if (!supabaseAnonKey || supabaseAnonKey === "" || supabaseAnonKey.includes("your-anon-key")) {
      missingVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }

    if (missingVars.length > 0) {
      processError(ERR.CONNECTION_INVALID, new Error('Bağlantı doğrulama başarısız'), {
        islem: 'VALIDATE',
        eksik_degiskenler: missingVars
      }, 'WARNING');
    }
  } catch (error) {
    processError(ERR.DB_CONNECTION, error, {
      islem: 'VALIDATE',
      kaynak: 'validateSupabaseConnection'
    });
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
}
