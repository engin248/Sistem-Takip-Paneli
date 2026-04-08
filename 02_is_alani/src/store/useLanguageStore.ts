import { create } from 'zustand';

interface LangState {
  lang: 'tr' | 'ar';
  dir: 'ltr' | 'rtl';
  toggleLang: () => void;
}

export const useLanguageStore = create<LangState>((set) => ({
  lang: 'tr',
  dir: 'ltr',
  toggleLang: () => set((state) => ({
    lang: state.lang === 'tr' ? 'ar' : 'tr',
    dir: state.lang === 'tr' ? 'rtl' : 'ltr'
  })),
}));
