import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';

// ============================================================
// AUTH STORE — Oturum Durum Yönetimi (Devtools)
// ============================================================
// Supabase Auth oturumunu Zustand ile yönetir.
// Bileşenler buradan kullanıcı/oturum bilgisi okur.
// ============================================================

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAuth: (user: User | null, session: Session | null) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      session: null,
      isLoading: true,
      isAuthenticated: false,

      setAuth: (user, session) => set({
        user,
        session,
        isAuthenticated: !!user && !!session,
        isLoading: false,
      }, false, 'setAuth'),

      clearAuth: () => set({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      }, false, 'clearAuth'),

      setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),
    }),
    { name: 'STP-AuthStore', enabled: process.env.NODE_ENV !== 'production' }
  )
);
