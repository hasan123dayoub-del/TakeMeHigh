'use client';

import { useState } from 'react';
import { fmt, useMessages } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Lightbox, type LightboxImage } from './lightbox';
import { landingMessages } from './messages';

/** Photo grid of a trip; any photo opens the lightbox. */
export function Gallery({ images, title }: { images: LightboxImage[]; title: string }) {
  const t = useMessages(landingMessages);
  const [index, setIndex] = useState<number | null>(null);
  if (!images.length) return null;
  return (
    <>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {images.map((img, i) => (
          <li key={img.url + i} className={cn(i === 0 && images.length > 2 && 'col-span-2 row-span-2')}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-label={fmt(t.galleryOf, { n: i + 1, total: images.length })}
              className="group block aspect-[4/3] size-full overflow-hidden rounded-tile bg-sky-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.caption || title}
                loading="lazy"
                className="size-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-[1.05]"
              />
            </button>
          </li>
        ))}
      </ul>
      <Lightbox images={images} index={index} title={title} onIndexChange={setIndex} onClose={() => setIndex(null)} />
    </>
  );
}
