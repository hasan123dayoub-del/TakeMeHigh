import { Compass } from 'lucide-react';
import Link from 'next/link';
import { getMessages } from '@/lib/i18n/server';
import { landingMessages } from './messages';

export async function NotFoundView() {
  const t = await getMessages(landingMessages);
  return (
    <div className="px-3 pt-10 sm:px-6">
      <div className="glass mx-auto flex max-w-2xl flex-col items-center rounded-panel px-6 py-16 text-center sm:py-20">
        <span className="relative grid size-20 place-items-center rounded-full bg-accent-soft text-primary">
          <span aria-hidden className="absolute inset-[-10px] rounded-full border border-primary/20" />
          <Compass className="size-8" aria-hidden />
        </span>
        <p className="mt-6 font-display text-[64px] leading-none font-light text-primary/70 num" aria-hidden>
          404
        </p>
        <h1 className="heading-display mt-3 text-[28px] leading-tight sm:text-[34px]">
          <strong className="font-medium">{t.notFoundTitle}</strong>
        </h1>
        <p className="mt-3 max-w-md text-[15px] text-muted">{t.notFoundBody}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          <Link href="/#trips" className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-primary">
            {t.browseTrips}
          </Link>
          <Link href="/design-your-trip" className="inline-flex h-11 items-center rounded-full border border-border bg-surface-raised px-6 text-sm font-medium">
            {t.designTrip}
          </Link>
        </div>
      </div>
    </div>
  );
}
