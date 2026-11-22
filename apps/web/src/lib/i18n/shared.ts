/**
 * Safarni i18n: Arabic (RTL, default) and English (LTR).
 *
 * Each module owns its own messages with `defineMessages({ ar: {...}, en: {...} })`, so features
 * never edit a shared dictionary. The English object must have exactly the same keys as Arabic
 * (enforced by the type).
 */
export const LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ar';
export const LOCALE_COOKIE = 'safarni.locale';

export const dirOf = (locale: Locale): 'rtl' | 'ltr' => (locale === 'ar' ? 'rtl' : 'ltr');

/** BCP-47 tag for Intl. Arabic with Latin digits, as is common in Syrian business documents. */
export const intlLocaleOf = (locale: Locale) => (locale === 'ar' ? 'ar-SY-u-nu-latn' : 'en-GB');

export const isLocale = (v: unknown): v is Locale => v === 'ar' || v === 'en';

type Messages = Record<string, string>;
export interface MessageSet<T extends Messages> {
  ar: T;
  en: { [K in keyof T]: string };
}

export function defineMessages<T extends Messages>(set: MessageSet<T>): MessageSet<T> {
  return set;
}

/** "{n} seats left" + { n: 3 } -> "3 seats left" */
export function fmt(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}
