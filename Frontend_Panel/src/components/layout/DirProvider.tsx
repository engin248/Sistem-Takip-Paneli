"use client";
import { useEffect } from "react";
import { useLanguageStore } from "@/store/useLanguageStore";
import { Toaster } from "sonner";

/**
 * Dinamik HTML dir/lang güncelleyici + Toaster RTL senkronizasyonu.
 * Zustand store'dan lang/dir bilgisini okur ve <html> elemanına yazar.
 * Layout server component olduğu için bu client wrapper gereklidir.
 * 
 * NOT: useEffect kullanılmalıdır — render sırasında DOM manipülasyonu
 * hydration uyumsuzluğuna ve güncellenmenin atlanmasına neden olur.
 */
export default function DirProvider({ children }: { children: React.ReactNode }) {
  const { lang, dir } = useLanguageStore();

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [dir, lang]);

  return (
    <>
      <Toaster position={dir === 'rtl' ? 'top-left' : 'top-right'} richColors dir={dir} />
      {children}
    </>
  );
}

