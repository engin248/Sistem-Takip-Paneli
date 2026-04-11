"use client";
import { useState } from "react";
import { signIn, signUp } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);

    try {
      const result = isSignUp
        ? await signUp(email, password, displayName || undefined)
        : await signIn(email, password);

      if (result.success && result.user && result.session) {
        setAuth(result.user, result.session);
        toast.success(isSignUp ? "Kayıt başarılı" : "Giriş başarılı");
      } else {
        toast.error(result.error || "İşlem başarısız");
      }
    } catch {
      toast.error("Beklenmeyen hata");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/5 border border-white/10 rounded-2xl mb-4">
            <span className="text-2xl font-black text-white tracking-tighter">STP</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Sistem Takip Paneli
          </h1>
          <p className="text-xs text-slate-500 mt-1 tracking-wide uppercase">
            {isSignUp ? "Yeni Hesap Oluştur" : "Oturum Aç"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ad Soyad"
              className="w-full bg-slate-900 border border-slate-800 text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-slate-600 transition-colors placeholder:text-slate-600"
            />
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-posta"
            required
            className="w-full bg-slate-900 border border-slate-800 text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-slate-600 transition-colors placeholder:text-slate-600"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifre"
            required
            minLength={6}
            className="w-full bg-slate-900 border border-slate-800 text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-slate-600 transition-colors placeholder:text-slate-600"
          />

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full bg-white text-slate-900 text-xs font-bold py-3 rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest disabled:opacity-40"
          >
            {isLoading ? "..." : isSignUp ? "KAYIT OL" : "GİRİŞ YAP"}
          </button>
        </form>

        {/* Toggle */}
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-center mt-6 text-xs text-slate-500 hover:text-white transition-colors"
        >
          {isSignUp
            ? "Hesabın var mı? Giriş yap"
            : "Hesabın yok mu? Kayıt ol"}
        </button>
      </div>
    </div>
  );
}
