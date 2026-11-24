'use client';

import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { fmt } from '@/lib/i18n';
import { useMessages } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { landingMessages } from './messages';

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  href: string | null;
  kindLabel: string | null;
}

const INTERVAL = 6000;

/**
 * Auto-advancing carousel of the office slides (offers / programs / trips).
 * Pauses on hover and keyboard focus, has a pause button, dots and prev/next, and never
 * auto-advances under prefers-reduced-motion (WCAG 2.2.2).
 */
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const t = useMessages(landingMessages);
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const count = slides.length;
  const playing = count > 1 && !reduce && !userPaused && !hovered && !focused;

  const go = useCallback(
    (next: number, direction: number) => {
      setDir(direction);
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => go(index + 1, 1), INTERVAL);
    return () => window.clearTimeout(id);
  }, [playing, index, go]);

  if (!count) return null;
  const slide = slides[index];

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t.slidesLabel}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={(e) => {
        const rtl = document.documentElement.dir === 'rtl';
        if (e.key === 'ArrowRight') go(index + (rtl ? -1 : 1), rtl ? -1 : 1);
        if (e.key === 'ArrowLeft') go(index + (rtl ? 1 : -1), rtl ? 1 : -1);
      }}
    >
      <div
        className="relative aspect-[4/3.4] overflow-hidden rounded-card bg-sky-800 shadow-glass ring-1 ring-white/25 sm:aspect-[16/11] lg:aspect-[4/4.3]"
        aria-live={playing ? 'off' : 'polite'}
      >
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={fmt(t.slideOf, { n: index + 1, total: count })}
            className="absolute inset-0"
            custom={dir}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.01 : 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.imageUrl}
              alt={slide.title}
              className="absolute inset-0 size-full object-cover"
              fetchPriority={index === 0 ? 'high' : 'auto'}
            />
            <div aria-hidden className="absolute inset-0 bg-linear-to-t from-sky-950/85 via-sky-950/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 pb-16 text-white sm:p-7 sm:pb-20">
              {slide.kindLabel && (
                <span className="inline-flex h-6 items-center rounded-full bg-white/18 px-2.5 text-[12px] font-medium tracking-[0.14em] uppercase backdrop-blur-md">
                  {slide.kindLabel}
                </span>
              )}
              <p className="mt-3 font-display text-[22px] leading-tight font-medium sm:text-[28px]">{slide.title}</p>
              {slide.subtitle && <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/85 sm:text-[16px]">{slide.subtitle}</p>}
              {slide.href && (
                <Link
                  href={slide.href}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-[#111418] transition-transform hover:-translate-y-0.5"
                >
                  {t.discover}
                  <ArrowUpRight className="size-4 rtl-flip" aria-hidden />
                  <span className="sr-only">: {slide.title}</span>
                </Link>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-1.5" role="group" aria-label={t.slidesLabel}>
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(i, i > index ? 1 : -1)}
                  aria-label={fmt(t.goToSlide, { n: i + 1 })}
                  aria-current={i === index ? 'true' : undefined}
                  className="group grid h-6 place-items-center px-0.5"
                >
                  <span
                    className={cn(
                      'block h-1.5 rounded-full transition-all duration-500',
                      i === index ? 'w-7 bg-white' : 'w-1.5 bg-white/50 group-hover:bg-white/80',
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {!reduce && (
                <button
                  type="button"
                  onClick={() => setUserPaused((p) => !p)}
                  aria-label={userPaused ? t.playSlides : t.pauseSlides}
                  className="grid size-9 place-items-center rounded-full bg-white/18 text-white backdrop-blur-md transition-colors hover:bg-white/30"
                >
                  {userPaused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
                </button>
              )}
              <button
                type="button"
                onClick={() => go(index - 1, -1)}
                aria-label={t.prevSlide}
                className="grid size-9 place-items-center rounded-full bg-white/18 text-white backdrop-blur-md transition-colors hover:bg-white/30"
              >
                <ChevronLeft className="size-4 rtl-flip" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1, 1)}
                aria-label={t.nextSlide}
                className="grid size-9 place-items-center rounded-full bg-white text-[#111418] transition-colors hover:bg-white/90"
              >
                <ChevronRight className="size-4 rtl-flip" aria-hidden />
              </button>
            </div>
          </div>
        )}

        {playing && (
          <motion.span
            key={`bar-${index}`}
            aria-hidden
            className="absolute inset-x-0 top-0 h-0.5 origin-left bg-white/80 rtl:origin-right"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: INTERVAL / 1000, ease: 'linear' }}
          />
        )}
      </div>
    </section>
  );
}
