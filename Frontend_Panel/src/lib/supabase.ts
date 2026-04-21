import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl: string = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseAnonKey: string = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

let supabase: SupabaseClient;

try {
  supabase = createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder-key"
  );
} catch (error) {
  console.error("SUPABASE_INIT_ERROR:", error);
  supabase = createClient("https://placeholder.supabase.co", "placeholder-key");
}

export { supabase };

export function validateSupabaseConnection(): {
  isValid: boolean;
  missingVars: string[];
} {
  const missingVars: string[] = [];
  if (!supabaseUrl || supabaseUrl.includes("placeholder")) missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseAnonKey || supabaseAnonKey.includes("placeholder")) missingVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
}
