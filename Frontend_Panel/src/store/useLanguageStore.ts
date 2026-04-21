import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LangState {
  lang: 'tr' | 'ar';
  dir: 'ltr' | 'rtl';
  toggleLang: () => void;
}

export const useLanguageStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'tr',
      dir: 'ltr',
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
