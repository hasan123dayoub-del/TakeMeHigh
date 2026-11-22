import 'server-only';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale, type MessageSet } from './shared';

/** Locale for server components (cookie, default Arabic). */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getMessages<T extends Record<string, string>>(set: MessageSet<T>): Promise<T> {
  return set[await getLocale()] as T;
}
