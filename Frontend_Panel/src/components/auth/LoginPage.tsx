"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
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
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName }
          }
        });
        if (error) throw error;
        if (data.session) {
          setAuth(data.user, data.session);
          toast.success("Kayıt başarılı");
        } else {
          toast.info("Lütfen e-posta adresinizi doğrulayın");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        if (data.user && data.session) {
          setAuth(data.user, data.session);
          toast.success("Giriş başarılı");
        }
      }
    } catch (error: any) {
      console.error("AUTH_ERROR:", error);
      toast.error(error.message || "İşlem başarısız");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white/5 backdrop-blur-md p-4">
      <div className="w-full max-w-sm">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-none mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            <span className="text-2xl font-black text-rose-500 tracking-tighter">STP</span>
          </div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">
            SİSTEM TAKİP PANELİ
          </h1>
          <p className="text-[9px] text-slate-500 mt-2 tracking-[0.4em] uppercase font-bold">
            {isSignUp ? "YENİ ERİŞİM KAYDI" : "OTURUM DOĞRULAMA"}
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="AD SOYAD"
              className="w-full bg-black/20/50 border border-slate-800 text-white text-[10px] font-bold px-4 py-3 rounded-none outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-700"
            />
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-POSTA ADRESİ"
            required
            className="w-full bg-black/20/50 border border-slate-800 text-white text-[10px] font-bold px-4 py-3 rounded-none outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-700"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="GÜVENLİK ŞİFRESİ"
            required
            minLength={6}
            className="w-full bg-black/20/50 border border-slate-800 text-white text-[10px] font-bold px-4 py-3 rounded-none outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-700"
          />

          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full bg-rose-500 text-white text-[10px] font-black py-3 rounded-none hover:bg-rose-600 transition-all uppercase tracking-widest disabled:opacity-40 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            {isLoading ? "İŞLENİYOR..." : isSignUp ? "KAYIT OL" : "ERİŞİM SAĞLA"}
          </button>
        </form>

        {/* Toggle Section */}
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-center mt-6 text-[9px] font-bold text-slate-600 hover:text-rose-500 transition-colors uppercase tracking-widest"
        >
          {isSignUp
            ? "Mevcut oturumun var mı? Giriş yap"
            : "Sisteme dahil değil misin? Kayıt ol"}
        </button>
      </div>
    </div>
  );
}

