import 'server-only';
import type { Metadata } from 'next';
import { getLocale, getMessages } from '@/lib/i18n/server';
import { landingMessages } from './messages';
import { getOrigin, getPolicy, getProgram, getSite, getTrip } from './server';
import { cityName, officeName } from './utils';

async function base() {
  const [site, locale, origin] = await Promise.all([getSite(), getLocale(), getOrigin()]);
  const name = site ? officeName(site.office, locale) : 'Take Me High';
  return { site, locale, origin, name };
}

const og = (o: { title: string; description: string; url: string; image?: string | null; name: string; locale: string }): Metadata => ({
  description: o.description,
  alternates: { canonical: o.url },
  openGraph: {
    type: 'website',
    title: o.title,
    description: o.description,
    url: o.url,
    siteName: o.name,
    locale: o.locale === 'ar' ? 'ar_SY' : 'en_GB',
    images: o.image ? [{ url: o.image }] : undefined,
  },
  twitter: { card: o.image ? 'summary_large_image' : 'summary', title: o.title, description: o.description, images: o.image ? [o.image] : undefined },
});

export async function landingMetadata(): Promise<Metadata> {
  const { site, locale, origin, name } = await base();
  const t = await getMessages(landingMessages);
  const tagline = site?.office.tagline || t.heroFallbackTagline;
  const title = `${name} — ${tagline}`;
  return {
    title: { absolute: title },
    applicationName: name,
    metadataBase: new URL(origin),
    ...og({ title, description: site?.office.about || tagline, url: `${origin}/`, image: site?.office.heroImageUrl, name, locale }),
  };
}

export async function tripMetadata(id: string): Promise<Metadata> {
  const [{ locale, origin, name }, trip, t] = await Promise.all([base(), getTrip(id), getMessages(landingMessages)]);
  if (!trip) return { title: { absolute: `${t.notFoundTitle} · ${name}` }, robots: { index: false } };
  const title = `${trip.title} · ${name}`;
  const description =
    trip.description || `${cityName(trip.originCity, locale)} → ${cityName(trip.destinationCity, locale)} · ${trip.code}`;
  return { title: { absolute: title }, ...og({ title, description, url: `${origin}/trips/${trip.id}`, image: trip.coverImageUrl, name, locale }) };
}

export async function programMetadata(id: string): Promise<Metadata> {
  const [{ locale, origin, name }, program, t] = await Promise.all([base(), getProgram(id), getMessages(landingMessages)]);
  if (!program) return { title: { absolute: `${t.notFoundTitle} · ${name}` }, robots: { index: false } };
  const title = `${program.title} · ${name}`;
  const description = program.description || program.legs.map((l) => l.title).join(' · ');
  return { title: { absolute: title }, ...og({ title, description, url: `${origin}/programs/${program.id}`, image: program.coverImageUrl, name, locale }) };
}

export async function policyMetadata(slug: string): Promise<Metadata> {
  const [{ locale, origin, name }, policy, t] = await Promise.all([base(), getPolicy(slug), getMessages(landingMessages)]);
  if (!policy) return { title: { absolute: `${t.notFoundTitle} · ${name}` }, robots: { index: false } };
  const title = `${policy.title} · ${name}`;
  return { title: { absolute: title }, ...og({ title, description: policy.body.slice(0, 160), url: `${origin}/policies/${policy.slug}`, name, locale }) };
}

export async function designMetadata(): Promise<Metadata> {
  const [{ locale, origin, name }, t] = await Promise.all([base(), getMessages(landingMessages)]);
  const title = `${t.formTitleA} ${t.formTitleB} · ${name}`;
  return { title: { absolute: title }, ...og({ title, description: t.designBody, url: `${origin}/design-your-trip`, name, locale }) };
}
