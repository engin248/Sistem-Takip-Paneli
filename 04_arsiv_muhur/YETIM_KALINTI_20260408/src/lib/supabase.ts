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
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);

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

  if (!supabaseUrl || supabaseUrl === "" || supabaseUrl.includes("your-project-id")) {
    missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseAnonKey || supabaseAnonKey === "" || supabaseAnonKey.includes("your-anon-key")) {
    missingVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
}
