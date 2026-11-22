'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { dirOf, intlLocaleOf, LOCALE_COOKIE, type Locale, type MessageSet } from './shared';

export * from './shared';

interface LocaleContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  /** Tag for Intl formatters */
  intl: string;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Initial locale comes from the server (cookie) so the first paint already has the right direction. */
export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setState] = useState<Locale>(initialLocale);
  const router = useRouter();

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = next;
      document.documentElement.dir = dirOf(next);
      setState(next);
      router.refresh(); // re-render server components (public pages, metadata) in the new language
    },
    [router],
  );

  const value = useMemo<LocaleContextValue>(() => ({ locale, dir: dirOf(locale), intl: intlLocaleOf(locale), setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}

/** `const t = useMessages(messages); t.title` — typed, per-module dictionaries. */
export function useMessages<T extends Record<string, string>>(set: MessageSet<T>): T {
  return set[useLocale().locale] as T;
}
