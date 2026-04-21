// ============================================================
// AUTH SERVICE — Supabase Kimlik Doğrulama Katmanı
// ============================================================
// Görevler:
//   1. Email/şifre ile giriş (signIn)
//   2. Kayıt (signUp)
//   3. Çıkış (signOut)
//   4. Oturum kontrolü (getSession)
//   5. Kullanıcı bilgisi (getUser)
//
// Hata Kodu: ERR-Sistem Takip Paneli001-001 (genel)
// Bağımlılık: lib/supabase.ts, lib/errorCore.ts
// ============================================================

import { supabase } from '@/lib/supabase';
import { ERR, processError } from '@/lib/errorCore';
import { logAudit } from './auditService';
import type { Session, User } from '@supabase/supabase-js';

// ─── TİP TANIMLARI ──────────────────────────────────────────

export interface AuthResult {
  success: boolean;
  user?: User | null;
  session?: Session | null;
  error?: string;
}

// ─── GİRİŞ ──────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      processError(ERR.SYSTEM_GENERAL, error, {
        kaynak: 'authService.ts',
        islem: 'SIGN_IN',
        email,
      }, 'WARNING');

      await logAudit({
        operation_type: 'REJECT',
        action_description: `Giriş başarısız: ${email} — ${error.message}`,
        metadata: {
          action_code: 'AUTH_SIGN_IN_FAILED',
          email,
          error_message: error.message,
        },
      }).catch(() => {});

      return { success: false, error: error.message };
    }

    await logAudit({
      operation_type: 'SYSTEM',
      action_description: `Giriş başarılı: ${email}`,
      metadata: {
        action_code: 'AUTH_SIGN_IN_SUCCESS',
        email,
        user_id: data.user?.id,
      },
    }).catch(() => {});

    return { success: true, user: data.user, session: data.session };
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'authService.ts',
      islem: 'SIGN_IN',
    }, 'CRITICAL');
    return { success: false, error: String(err) };
  }
}

// ─── KAYIT ──────────────────────────────────────────────────

export async function signUp(email: string, password: string, displayName?: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
          role: 'OPERATÖR',
        },
      },
    });

    if (error) {
      processError(ERR.SYSTEM_GENERAL, error, {
        kaynak: 'authService.ts',
        islem: 'SIGN_UP',
        email,
      }, 'WARNING');
      return { success: false, error: error.message };
    }

    await logAudit({
      operation_type: 'CREATE',
      action_description: `Yeni kullanıcı kaydı: ${email}`,
      metadata: {
        action_code: 'AUTH_SIGN_UP',
        email,
        user_id: data.user?.id,
      },
    }).catch(() => {});

    return { success: true, user: data.user, session: data.session };
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'authService.ts',
      islem: 'SIGN_UP',
    }, 'CRITICAL');
    return { success: false, error: String(err) };
  }
}

// ─── ÇIKIŞ ──────────────────────────────────────────────────

export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.auth.signOut();

    if (error) {
      processError(ERR.SYSTEM_GENERAL, error, {
        kaynak: 'authService.ts',
        islem: 'SIGN_OUT',
      });
      return { success: false, error: error.message };
    }

    await logAudit({
      operation_type: 'SYSTEM',
      action_description: `Çıkış yapıldı: ${user?.email || 'bilinmeyen'}`,
      metadata: {
        action_code: 'AUTH_SIGN_OUT',
        user_id: user?.id,
        email: user?.email,
      },
    }).catch(() => {});

    return { success: true };
  } catch (err) {
    processError(ERR.SYSTEM_GENERAL, err, {
      kaynak: 'authService.ts',
      islem: 'SIGN_OUT',
    });
    return { success: false, error: String(err) };
  }
}

// ─── OTURUM KONTROLÜ ────────────────────────────────────────

export async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      processError(ERR.SYSTEM_GENERAL, error, {
        kaynak: 'authService.ts',
        islem: 'GET_SESSION',
      }, 'WARNING');
      return null;
    }
    return data.session;
  } catch {
    return null;
  }
}

// ─── KULLANICI BİLGİSİ ─────────────────────────────────────

export async function getUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  } catch {
    return null;
  }
}

// ─── OTURUM DİNLEYİCİ ──────────────────────────────────────
// Auth durumu değiştiğinde callback çağrılır.

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): { unsubscribe: () => void } {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return { unsubscribe: () => data.subscription.unsubscribe() };
}

// ─── OTURUM VARLIK KONTROLÜ ─────────────────────────────────

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}
