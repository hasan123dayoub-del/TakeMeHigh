import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getMessages } from '@/lib/i18n/server';
import { fmt } from '@/lib/i18n/shared';
import { Breadcrumbs, Prose } from './detail-parts';
import { landingMessages } from './messages';
import { getPolicy, getSite } from './server';
import { fDate } from './utils';

/** Terms / cancellation / privacy page (LND-02 §6). */
export async function PolicyArticle({ slug }: { slug: string }) {
  const [policy, site, locale, t] = await Promise.all([getPolicy(slug), getSite(), getLocale(), getMessages(landingMessages)]);
  if (!policy) notFound();
  const others = (site?.policies ?? []).filter((p) => p.slug !== policy.slug);

  return (
    <div className="mx-auto max-w-[1280px] px-3 pt-6 sm:px-6">
      <Breadcrumbs t={t} current={policy.title} section={{ href: '/#policies', label: t.navPolicies }} />
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="glass rounded-panel p-6 sm:p-10 lg:p-14">
          <p className="eyebrow">{t.policiesEyebrow}</p>
          <h1 className="heading-display mt-3 text-[30px] leading-[1.15] sm:text-[42px]">
            <strong className="font-medium">{policy.title}</strong>
          </h1>
          <p className="mt-3 text-sm text-muted num">
            <time dateTime={policy.updatedAt}>{fmt(t.lastUpdated, { date: fDate(policy.updatedAt, locale, 'long') })}</time>
          </p>
          <div className="mt-8 max-w-[68ch] border-t border-border pt-8">
            <Prose text={policy.body} className="text-[16px]" />
          </div>
          <Link href="/" className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4">
            <ArrowLeft className="size-4 rtl-flip" aria-hidden />
            {t.backHome}
          </Link>
        </article>
        {others.length > 0 && (
          <nav aria-label={t.otherPolicies} className="rounded-card border border-border bg-surface-raised p-5 shadow-card lg:sticky lg:top-24">
            <h2 className="eyebrow">{t.otherPolicies}</h2>
            <ul className="mt-3 grid gap-1">
              {others.map((p) => (
                <li key={p.slug}>
                  <Link href={`/policies/${p.slug}`} className="flex items-center gap-3 rounded-tile px-3 py-2.5 text-sm font-medium transition-colors hover:bg-surface">
                    <FileText className="size-4 text-primary" aria-hidden />
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}
