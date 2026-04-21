import { type NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function verifyApiAuth(request: NextRequest): Promise<{ user: any; error?: string }> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: 'Unauthorized: Bearer token is missing' };
    }
    const token = authHeader.split('Bearer ')[1];

    // ── SERVİS TOKEN KONTROLÜ (WhatsApp, Telegram bot'ları için) ──
    const serviceToken = process.env.STP_SERVICE_TOKEN;
    if (serviceToken && token === serviceToken) {
      // ── ORIGIN KONTROLÜ (Zorunlu) ──
      const origin = request.headers.get('Origin');
      const stpUrl = process.env.STP_API_URL || 'https://sistem-takip-paneli.vercel.app';
      
      if (!origin || (origin !== stpUrl && !origin.includes('localhost'))) {
        return { user: null, error: 'Forbidden: Invalid or missing Origin header' };
      }

      return {
        user: {
          id: 'SERVICE_BOT',
          email: 'bot@stp.internal',
          role: 'service',
        },
      };
    }

    // ── KULLANICI JWT KONTROLÜ (Panel UI için) ───────────────────
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return { user: null, error: `Auth Error: ${error?.message || 'Invalid token'}` };
    }
    return { user: data.user };
  } catch {
    return { user: null, error: 'Internal Auth Error' };
  }
}
