"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { onAuthStateChange, getSession, getUser } from "@/services/authService";
import LoginPage from "@/components/LoginPage";

// ============================================================
// AUTH PROVIDER — Oturum Koruma Katmanı
// ============================================================
// Layout.tsx'e sarılır. Oturum yoksa LoginPage gösterir.
// Oturum varsa children'ı render eder.
//
// ÜST: layout.tsx
// ALT: authService → Supabase Auth
// YAN: useAuthStore → tüm bileşenler
// ÖN: Kimliksiz kullanıcı sisteme erişemez
// ARKA: RLS politikaları auth.uid() ile çalışır
// ============================================================

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, isLoading, setAuth, clearAuth, setLoading } = useAuthStore();

  useEffect(() => {
    // İlk yükleme — mevcut oturumu kontrol et
    async function initAuth() {
      setLoading(true);
      try {
        const session = await getSession();
        if (session) {
          const user = await getUser();
          setAuth(user, session);
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      }
    }

    initAuth();

    // Oturum değişikliği dinleyicisi
    const { unsubscribe } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        getUser().then(user => setAuth(user, session));
      } else if (event === 'SIGNED_OUT') {
        clearAuth();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        getUser().then(user => setAuth(user, session));
      }
    });

    return () => unsubscribe();
  }, [setAuth, clearAuth, setLoading]);

  // Yükleniyor
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-2 border-slate-700 rounded-full" />
            <div className="absolute inset-0 border-2 border-t-white rounded-full animate-spin" />
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
            OTURUM KONTROL EDİLİYOR
          </p>
        </div>
      </div>
    );
  }

  // Oturum yok → Login
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Oturum var → Dashboard
  return <>{children}</>;
}
