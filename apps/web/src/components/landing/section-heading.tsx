import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Eyebrow + light uppercase display title (one emphasised word) + description. */
export function SectionHeading({
  id,
  eyebrow,
  titleA,
  titleB,
  body,
  aside,
  className,
  tone = 'default',
}: {
  id: string;
  eyebrow: string;
  titleA: string;
  titleB: string;
  body?: ReactNode;
  aside?: ReactNode;
  className?: string;
  tone?: 'default' | 'inverse';
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-x-8 gap-y-4', className)}>
      <div className="max-w-2xl">
        <p className={cn('eyebrow flex items-center gap-2', tone === 'inverse' && 'text-white/80')}>
          <span aria-hidden className={cn('h-px w-6', tone === 'inverse' ? 'bg-white/60' : 'bg-primary/60')} />
          {eyebrow}
        </p>
        <h2 id={id} className="heading-display mt-3 text-[30px] leading-[1.1] sm:text-[40px] lg:text-[46px]">
          {titleA} <strong className="font-medium">{titleB}</strong>
        </h2>
        {body && (
          <p className={cn('mt-3 text-[15px] leading-relaxed', tone === 'inverse' ? 'text-white/85' : 'text-muted')}>{body}</p>
        )}
      </div>
      {aside}
    </div>
  );
}
