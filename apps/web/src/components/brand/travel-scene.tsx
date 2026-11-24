'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useLocale } from '@/lib/i18n';
import { LogoSeal } from './logo';

const PINS = [
  { ar: 'دمشق', en: 'Damascus', x: '14%', y: '22%' },
  { ar: 'اللاذقية', en: 'Latakia', x: '78%', y: '16%' },
  { ar: 'أرواد', en: 'Arwad', x: '86%', y: '58%' },
  { ar: 'مكة', en: 'Makkah', x: '10%', y: '64%' },
  { ar: 'إسطنبول', en: 'Istanbul', x: '62%', y: '8%' },
  { ar: 'دبي', en: 'Dubai', x: '8%', y: '84%' },
];

const WORDS = {
  ar: ['رحلات داخلية', 'برامج خارجية', 'عمرة وحج', 'عروض موسمية', 'صمّم رحلتك'],
  en: ['Domestic trips', 'International programs', 'Umrah & Hajj', 'Seasonal offers', 'Design your trip'],
};

function Cloud({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 50" aria-hidden className={className}>
      <path d="M18 44 C4 44 4 26 18 26 C18 12 38 8 46 18 C52 4 78 4 82 20 C96 14 112 24 104 36 C114 40 110 46 100 46 Z" fill="currentColor" />
    </svg>
  );
}

/** Login aside: sky, drifting clouds, a plane orbiting the Take Me High seal, destinations popping up. */
export function TravelScene() {
  const { locale } = useLocale();
  const reduce = useReducedMotion();
  const words = WORDS[locale === 'en' ? 'en' : 'ar'];
  const [word, setWord] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setWord((w) => (w + 1) % words.length), 2600);
    return () => clearInterval(id);
  }, [reduce, words.length]);

  return (
    <div className="travel-scene relative flex size-full flex-col items-center justify-center overflow-hidden">
      {/* sun glow */}
      <span aria-hidden className="scene-sun pointer-events-none absolute -top-20 end-[-60px] size-[320px] rounded-full" />

      {/* clouds at three depths */}
      <Cloud className="scene-cloud absolute top-[10%] w-40 text-white/35 [animation-duration:46s]" />
      <Cloud className="scene-cloud absolute top-[34%] w-24 text-white/25 [animation-delay:-18s] [animation-duration:62s]" />
      <Cloud className="scene-cloud absolute top-[70%] w-56 text-white/20 [animation-delay:-30s] [animation-duration:80s]" />
      <Cloud className="scene-cloud absolute top-[52%] w-32 text-white/30 [animation-delay:-8s] [animation-duration:54s]" />

      {/* mountains */}
      <svg aria-hidden viewBox="0 0 800 200" preserveAspectRatio="none" className="scene-hills pointer-events-none absolute inset-x-0 bottom-0 h-[26%] w-[110%]">
        <path d="M0 200 L0 120 L90 60 L170 120 L260 40 L360 130 L450 70 L540 140 L640 50 L730 120 L800 90 L800 200 Z" fill="rgb(255 255 255 / 0.10)" />
        <path d="M0 200 L0 160 L120 100 L220 160 L320 110 L430 170 L520 120 L640 170 L740 120 L800 150 L800 200 Z" fill="rgb(255 255 255 / 0.16)" />
      </svg>

      {/* destination pins */}
      {PINS.map((p, i) => (
        <motion.span
          key={p.en}
          aria-hidden
          className="pointer-events-none absolute flex flex-col items-center gap-1"
          style={{ insetInlineStart: p.x, top: p.y }}
          initial={reduce ? false : { opacity: 0, y: -14, scale: 0.6 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.9 + i * 0.35, type: 'spring', stiffness: 260, damping: 16 }}
        >
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium text-sky-900 shadow-sm">{locale === 'en' ? p.en : p.ar}</span>
          <svg viewBox="0 0 24 30" className="scene-pin w-5" style={{ animationDelay: `${i * 0.4}s` }}>
            <path d="M12 29 C9 24 2 18 2 11 A10 10 0 1 1 22 11 C22 18 15 24 12 29 Z" fill="var(--logo-sun)" />
            <circle cx="12" cy="11" r="4" fill="#fff" />
          </svg>
        </motion.span>
      ))}

      {/* seal with an orbiting plane */}
      <div className="relative grid size-[380px] place-items-center xl:size-[440px]">
        <svg aria-hidden viewBox="0 0 440 440" className="absolute inset-0 size-full">
          <ellipse cx="220" cy="220" rx="205" ry="205" fill="none" stroke="rgb(255 255 255 / 0.35)" strokeWidth="1.5" strokeDasharray="2 9" strokeLinecap="round" className="scene-orbit" />
        </svg>
        <span aria-hidden className="absolute size-[72%] rounded-full bg-white/15 blur-2xl" />
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 1.5, rotate: -18 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative size-[66%] rounded-full shadow-[0_30px_60px_-20px_rgb(10_22_38/0.55)]"
        >
          <LogoSeal animated className="size-full" />
        </motion.div>
        <div aria-hidden className="scene-plane-track absolute inset-0">
          <span className="scene-plane">
            <svg viewBox="0 0 48 48" className="size-10 drop-shadow-[0_6px_10px_rgb(10_22_38/0.35)]">
              <path d="M44 24 c0-1.6-1.4-2.6-3-2.6 H30 L19 5 h-4.5 l5.5 16.4 H10 l-3.6-4.6 H3 l2.4 7.2 L3 31.2 h3.4 L10 26.6 h10 L14.5 43 H19 l11-16.4 h11 c1.6 0 3-1 3-2.6 Z" fill="#fff" />
            </svg>
          </span>
        </div>
      </div>

      {/* wordmark + rotating services */}
      <motion.div
        className="relative mt-6 flex flex-col items-center text-center"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <p dir="ltr" className="font-display text-4xl font-semibold tracking-tight xl:text-5xl">
          Take Me <span className="text-[var(--logo-sun)]">High</span>
        </p>
        <p dir="ltr" className="mt-2 text-xs font-medium tracking-[0.32em] uppercase opacity-80">
          Travel &amp; Tourism Office System
        </p>
        <div className="relative mt-5 h-9 w-72 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={word}
              className="absolute inset-0 grid place-items-center rounded-full bg-white/15 text-sm font-medium backdrop-blur"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {words[word]}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
