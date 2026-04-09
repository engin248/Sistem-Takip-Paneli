import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';

// ============================================================
// AUTH STORE — Oturum Durum Yönetimi
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  setAuth: (user, session) => set({
    user,
    session,
    isAuthenticated: !!user && !!session,
    isLoading: false,
  }),

  clearAuth: () => set({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: false,
  }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
