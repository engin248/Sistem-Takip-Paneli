/**
 * Supabase İstemcisi — Sistem Kontrol Merkezi
 * Tüm sistemlerle ortak Supabase veritabanına bağlanır
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

if (!supabaseUrl || !supabaseKey) {
    console.warn('[KONTROL MERKEZİ] Supabase bağlantı bilgileri eksik — .env.local dosyasını kontrol edin');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-key'
);

export const supabaseBagliMi: boolean = !!(supabaseUrl && supabaseKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseKey.includes('placeholder'));
