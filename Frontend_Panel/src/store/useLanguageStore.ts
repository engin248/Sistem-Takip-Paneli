import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LangState {
  lang: 'tr' | 'ar';
  dir: 'ltr' | 'rtl';
  setLanguage: (lang: 'tr' | 'ar') => void;
  toggleLang: () => void;
}

export const useLanguageStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'tr',
      dir: 'ltr',
      setLanguage: (lang) => set({
        lang,
        dir: lang === 'ar' ? 'rtl' : 'ltr'
      }),
      toggleLang: () => set((state) => ({
        lang: state.lang === 'tr' ? 'ar' : 'tr',
        dir: state.lang === 'tr' ? 'rtl' : 'ltr'
      })),
    }),
    {
      name: 'Sistem Takip Paneli-lang',
    }
  )
);
