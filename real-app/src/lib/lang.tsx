import React, { createContext, useContext, useState, useEffect } from 'react';
import { fr } from '@/constants/i18n/fr';
import { ar } from '@/constants/i18n/ar';
import { en } from '@/constants/i18n/en';

export type Lang = 'fr' | 'ar' | 'en';

export const TRANSLATIONS = { fr, ar, en };

export type TKey = keyof typeof TRANSLATIONS.fr;

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey) => string;
  dir: 'ltr' | 'rtl';
}

const LangContext = createContext<LangCtx>({
  lang: 'fr',
  setLang: () => {},
  t: (k) => k,
  dir: 'ltr',
});

const STORAGE_KEY = 'wedy_lang';

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem(STORAGE_KEY) as Lang) || 'fr';
  });

  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [lang, dir]);

  const setLang = (l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  };

  const t = (key: TKey): string =>
    TRANSLATIONS[lang][key] ?? TRANSLATIONS['fr'][key] ?? key;

  return (
    <LangContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
