import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { appZh } from './app.zh';
import { componentsZh } from './components.zh';
import { visualZh } from './visual.zh';

export type Language = 'en' | 'zh';

/** English is the source copy; exact keys keep translation independent of state. */
export const translations: Readonly<Record<string, string>> = {
  ...componentsZh,
  ...visualZh,
  ...appZh,
};

interface Locale {
  language: Language;
  t: (source: string) => string;
}

const LocaleContext = createContext<Locale>({ language: 'en', t: source => source });

export function LocaleProvider({ language, children }: { language: Language; children: ReactNode }) {
  const value = useMemo<Locale>(() => ({
    language,
    t: source => language === 'zh' ? translations[source] ?? source : source,
  }), [language]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n(): Locale {
  return useContext(LocaleContext);
}
