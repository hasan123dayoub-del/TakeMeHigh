'use client';

/* eslint-disable @next/next/no-img-element -- banner images are arbitrary remote URLs. */

import { ArrowUpRight, Pause, Play, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { useMessages } from '@/lib/i18n';
import type { Banner } from '@/lib/types/public';
import { cn } from '@/lib/utils';
import { OfficeLogo } from './atoms';
import { brandSurface } from './brand';
import styles from './marquee.module.css';
import { fmt, pm } from './messages';

/** Seconds each ad takes to cross one slot; the whole loop scales with the number of ads. */
const SECONDS_PER_AD = 5;
/** Repeat short lists so one copy of the track is always wider than a wide screen. */
const MIN_PER_COPY = 8;

/**
 * Continuously moving ads: slides toward the reading end while the next ad enters from the
 * other side (left in LTR, right in RTL). Pauses on hover/focus and with the pause button;
 * with `prefers-reduced-motion` it stops and becomes a swipeable row.
 */
export function AdsMarquee({ banners, className, showOffice = true }: { banners: Banner[]; className?: string; showOffice?: boolean }) {
  const t = useMessages(pm);
  const [paused, setPaused] = useState(false);
  if (!banners.length) return null;

  const repeat = Math.max(1, Math.ceil(MIN_PER_COPY / banners.length));
  const copy = Array.from({ length: repeat }, () => banners).flat();
  const style = { '--marquee-duration': `${copy.length * SECONDS_PER_AD}s` } as CSSProperties;

  return (
    <section aria-label={t.adsLabel} className={cn('relative', className)}>
      <div className={styles.viewport}>
        <div className={styles.track} data-paused={paused} style={style}>
          {[0, 1].map((half) =>
            copy.map((b, i) => {
              const clone = half === 1 || i >= banners.length;
              return (
                <div key={`${half}-${i}-${b.id}`} className={cn(styles.item, clone && styles.clone)} aria-hidden={clone || undefined}>
                  <AdCard banner={b} tabbable={!clone} showOffice={showOffice} byLabel={fmt(t.adBy, { office: b.office.name })} />
                </div>
              );
            }),
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? t.playAds : t.pauseAds}
        aria-pressed={paused}
        className={cn(
          styles.motionOnly,
          'absolute -top-2 end-3 z-10 grid size-8 place-items-center rounded-full border border-border bg-surface-raised text-muted shadow-pop transition-colors hover:text-foreground',
        )}
      >
        {paused ? <Play className="size-3.5 rtl-flip" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
      </button>
    </section>
  );
}

function AdCard({ banner, tabbable, showOffice, byLabel }: { banner: Banner; tabbable: boolean; showOffice: boolean; byLabel: string }) {
  const surface = brandSurface(banner.office.brandColor);
  return (
    <Link
      href={banner.link}
      tabIndex={tabbable ? undefined : -1}
      className="group relative isolate flex h-[148px] w-[78vw] max-w-[380px] min-w-[270px] flex-col justify-between overflow-hidden rounded-card p-4 text-white shadow-glass ring-1 ring-white/20 transition-transform duration-300 ease-out-soft hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-[360px]"
      style={{ backgroundImage: `linear-gradient(125deg, ${surface} 0%, ${surface} 38%, #335a8c 100%)` }}
    >
      {banner.imageUrl ? (
        <>
          <img src={banner.imageUrl} alt="" className="absolute inset-0 -z-20 size-full object-cover" loading="lazy" />
          <span aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-black/75 via-black/35 to-black/10" />
        </>
      ) : (
        <span aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <span className="absolute -top-16 -end-12 size-48 rounded-full bg-white/12" />
          <span className="absolute -bottom-24 end-10 size-44 rounded-full border border-white/20" />
          <Sparkles className="absolute top-4 end-4 size-5 text-white/50" />
        </span>
      )}
      <span className="flex items-center gap-2 pe-7">
        {showOffice && (
          <>
            <OfficeLogo name={banner.office.name} logoUrl={banner.office.logoUrl} brandColor={banner.office.brandColor} size="xs" />
            <span className="truncate text-[12px] font-medium text-white/85">{byLabel}</span>
          </>
        )}
      </span>
      <span className="block pe-10">
        <span className="line-clamp-1 font-display text-[19px] leading-snug font-medium">{banner.title}</span>
        {banner.subtitle && <span className="mt-0.5 line-clamp-1 block text-[13px] text-white/85">{banner.subtitle}</span>}
      </span>
      <span
        aria-hidden
        className="absolute bottom-4 end-4 grid size-8 place-items-center rounded-full bg-white/18 backdrop-blur transition-transform group-hover:-translate-y-0.5"
      >
        <ArrowUpRight className="size-4 rtl-flip" />
      </span>
    </Link>
  );
}
