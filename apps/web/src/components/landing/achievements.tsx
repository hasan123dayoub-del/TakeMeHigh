'use client';

import { Award, Images } from 'lucide-react';
import { useState } from 'react';
import { fmt, useLocale, useMessages } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Lightbox } from './lightbox';
import { landingMessages } from './messages';
import type { PublicAchievement } from './types';
import { fDate } from './utils';

/** Office achievements with photos; any photo opens the lightbox gallery. */
export function AchievementsGrid({ items }: { items: PublicAchievement[] }) {
  const t = useMessages(landingMessages);
  const { locale } = useLocale();
  const [open, setOpen] = useState<{ item: number; image: number } | null>(null);
  const active = open ? items[open.item] : null;

  return (
    <>
      <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((a, idx) => {
          const cover = a.images[0];
          return (
            <li key={a.id} className={cn(idx === 0 && items.length > 2 && 'lg:row-span-2')}>
              <article className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface-raised shadow-card transition-[transform,box-shadow] duration-300 ease-out-soft hover:-translate-y-1 hover:shadow-pop">
                {cover ? (
                  <button
                    type="button"
                    onClick={() => setOpen({ item: idx, image: 0 })}
                    aria-label={fmt(t.openGallery, { title: a.title })}
                    className={cn(
                      'relative block w-full overflow-hidden bg-sky-100',
                      idx === 0 && items.length > 2 ? 'aspect-[4/3] lg:aspect-auto lg:flex-1' : 'aspect-[16/10]',
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cover.url}
                      alt={cover.caption || a.title}
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
                    />
                    <span aria-hidden className="absolute inset-0 bg-linear-to-t from-sky-950/40 to-transparent" />
                    {a.images.length > 1 && (
                      <span className="absolute end-3 bottom-3 inline-flex h-7 items-center gap-1.5 rounded-full bg-white/90 px-3 text-xs font-medium text-[#111418] backdrop-blur">
                        <Images className="size-3.5" aria-hidden />
                        <span className="num">{fmt(t.photos, { n: a.images.length })}</span>
                      </span>
                    )}
                  </button>
                ) : null}
                <div className="flex items-start gap-3.5 p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-primary">
                    <Award className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    {a.achievedOn && (
                      <p className="eyebrow num">
                        <time dateTime={a.achievedOn}>{fDate(a.achievedOn, locale)}</time>
                      </p>
                    )}
                    <h3 className="mt-1 text-[17px] leading-snug font-medium">{a.title}</h3>
                    {a.description && <p className="mt-1.5 text-sm leading-relaxed text-muted">{a.description}</p>}
                    {a.images.length > 1 && (
                      <ul className="mt-3 flex gap-1.5">
                        {a.images.slice(1, 5).map((img, i) => (
                          <li key={img.url + i}>
                            <button
                              type="button"
                              onClick={() => setOpen({ item: idx, image: i + 1 })}
                              aria-label={fmt(t.galleryOf, { n: i + 2, total: a.images.length })}
                              className="block size-12 overflow-hidden rounded-[12px] ring-1 ring-border transition-transform hover:-translate-y-0.5"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={img.url} alt="" loading="lazy" className="size-full object-cover" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
      <Lightbox
        images={active?.images ?? []}
        index={open?.image ?? null}
        title={active?.title ?? ''}
        onIndexChange={(image) => setOpen((o) => (o ? { ...o, image } : o))}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
