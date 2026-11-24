import { whatsappLink } from '@travelos/shared';
import { formatMoney } from '@/lib/format';
import { fmt, intlLocaleOf, type Locale } from '@/lib/i18n/shared';
import type { LandingMessages } from './messages';
import type { NamedCity, PublicItemOffer, PublicOfficeInfo, PublicProduct } from './types';

/**
 * Helpers shared by server and client components of the public site. Dates use the office
 * time zone so the server render and the browser hydration always print the same text.
 */
export const OFFICE_TZ = 'Asia/Damascus';

const DATE_OPTS = {
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  short: { day: 'numeric', month: 'short' },
  long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit' },
  dateTime: { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

/** ICU versions differ (Node vs browser) in thin / narrow no-break spaces: normalise to avoid hydration mismatches. */
const spaces = (s: string) => s.replace(/[   ]/g, ' ');

export function fDate(value: string | Date | null | undefined, locale: Locale, style: keyof typeof DATE_OPTS = 'medium') {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return spaces(new Intl.DateTimeFormat(intlLocaleOf(locale), { ...DATE_OPTS[style], timeZone: OFFICE_TZ }).format(d));
}

/** "5 – 8 Dec 2026" style range. */
export function fRange(from: string | null, to: string | null, locale: Locale) {
  if (!from) return '—';
  if (!to) return fDate(from, locale);
  try {
    return spaces(
      new Intl.DateTimeFormat(intlLocaleOf(locale), { ...DATE_OPTS.medium, timeZone: OFFICE_TZ }).formatRange(new Date(from), new Date(to)),
    );
  } catch {
    return `${fDate(from, locale)} – ${fDate(to, locale)}`;
  }
}

/** Calendar days covered (inclusive), in the office time zone. */
export function days(from: string | null, to: string | null) {
  if (!from || !to) return null;
  const key = (v: string) => new Intl.DateTimeFormat('en-CA', { timeZone: OFFICE_TZ }).format(new Date(v));
  const diff = (Date.parse(key(to)) - Date.parse(key(from))) / 86_400_000;
  return Math.max(1, Math.round(diff) + 1);
}

export const money = (value: string | number | null | undefined, currency: string | null | undefined, locale: Locale) =>
  formatMoney(value, currency ?? 'USD', { locale: intlLocaleOf(locale) });

export const cityName = (c: NamedCity | null | undefined, locale: Locale) => (c ? (locale === 'en' ? c.nameEn || c.nameAr : c.nameAr) : '');
export const nameOf = (o: { nameAr: string; nameEn?: string | null }, locale: Locale) => (locale === 'en' ? o.nameEn || o.nameAr : o.nameAr);
export const officeName = (o: PublicOfficeInfo, locale: Locale) => (locale === 'en' ? o.nameEn || o.name : o.name);

export function discountLabel(offer: Pick<PublicItemOffer, 'discountMode' | 'discountValue'>, currency: string, t: LandingMessages, locale: Locale) {
  return offer.discountMode === 'PERCENT'
    ? fmt(t.discountPercent, { v: Number(offer.discountValue) })
    : fmt(t.discountFixed, { v: money(offer.discountValue, currency, locale) });
}

/** The route of a product: trip origin → destination, program: the chain of leg cities. */
export function routeOf(p: PublicProduct, locale: Locale): string[] {
  if (p.type === 'TRIP') return [cityName(p.originCity, locale), cityName(p.destinationCity, locale)];
  if (!p.legs.length) return [];
  return [cityName(p.legs[0].originCity, locale), ...p.legs.map((l) => cityName(l.destinationCity, locale))];
}

export const productPath = (p: { type: 'TRIP' | 'PROGRAM'; id: string }) => `/${p.type === 'TRIP' ? 'trips' : 'programs'}/${p.id}`;

/**
 * "Book now" (LND-05): wa.me link with the office template, the item's name, code, final price
 * and absolute link. `number` defaults to the office WhatsApp; detail pages pass the branch one.
 */
export function bookingLink(
  office: PublicOfficeInfo,
  item: { title: string; code?: string; price?: string; path: string },
  origin: string,
  number?: string | null,
) {
  const to = number || office.whatsappNumber || office.phone;
  if (!to) return null;
  const template = office.whatsappTemplate || '{title} ({code})\n{price}\n{link}';
  return whatsappLink(to, template, {
    title: item.title,
    code: item.code,
    price: item.price?.replace(/[⁦-⁩]/g, ''),
    link: `${origin}${item.path}`,
  });
}

/** A free-text WhatsApp message (branches, follow-ups). */
export function chatLink(number: string | null | undefined, text: string) {
  if (!number) return null;
  return `https://wa.me/${number.replace(/[^\d]/g, '')}?text=${encodeURIComponent(text)}`;
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

/** Page size of the catalog (LND-08). */
export const CATALOG_PAGE_SIZE = 6;
