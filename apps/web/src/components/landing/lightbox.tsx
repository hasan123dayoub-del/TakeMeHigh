'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { fmt, useMessages } from '@/lib/i18n';
import { landingMessages } from './messages';

export interface LightboxImage {
  url: string;
  caption: string | null;
}

/** Full-screen photo viewer (Radix Dialog: focus trap, Esc to close, arrow keys to move). */
export function Lightbox({
  images,
  index,
  title,
  onIndexChange,
  onClose,
}: {
  images: LightboxImage[];
  index: number | null;
  title: string;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const t = useMessages(landingMessages);
  const open = index !== null;
  const i = index ?? 0;
  const count = images.length;
  const move = (step: number) => onIndexChange((i + step + count) % count);
  const image = images[i];

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-sky-950/85 backdrop-blur-md data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 outline-none sm:p-10"
          onKeyDown={(e) => {
            if (count < 2) return;
            const rtl = document.documentElement.dir === 'rtl';
            if (e.key === 'ArrowRight') move(rtl ? -1 : 1);
            if (e.key === 'ArrowLeft') move(rtl ? 1 : -1);
          }}
        >
          <div className="flex w-full max-w-5xl items-center justify-between gap-3 pb-3 text-white">
            <Dialog.Title className="min-w-0 truncate font-display text-lg font-medium">{title}</Dialog.Title>
            <Dialog.Close
              aria-label={t.close}
              className="grid size-10 shrink-0 place-items-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          {image && (
            <figure className="relative flex w-full max-w-5xl flex-1 flex-col items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={image.url}
                src={image.url}
                alt={image.caption || `${title} — ${fmt(t.galleryOf, { n: i + 1, total: count })}`}
                className="max-h-[75dvh] w-auto max-w-full animate-fade-in rounded-card object-contain shadow-pop"
              />
              <figcaption className="mt-3 text-center text-sm text-white/85" aria-live="polite">
                {image.caption ? `${image.caption} · ` : ''}
                <span className="num">{fmt(t.galleryOf, { n: i + 1, total: count })}</span>
              </figcaption>
            </figure>
          )}
          {count > 1 && (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => move(-1)}
                aria-label={t.prevPhoto}
                className="grid size-11 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <ChevronLeft className="size-5 rtl-flip" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => move(1)}
                aria-label={t.nextPhoto}
                className="grid size-11 place-items-center rounded-full bg-white text-[#111418] transition-colors hover:bg-white/90"
              >
                <ChevronRight className="size-5 rtl-flip" aria-hidden />
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
