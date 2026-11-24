'use client';

import { CloudOff, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { common, useMessages } from '@/lib/i18n';

/** Shown when the public API cannot be reached (instead of a raw 500). */
export function PublicError({ reset }: { reset: () => void }) {
  const t = useMessages(common);
  const router = useRouter();
  return (
    <div className="px-3 pt-10 sm:px-6">
      <div role="alert" className="glass mx-auto flex max-w-xl flex-col items-center rounded-panel px-6 py-16 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-accent-soft text-primary">
          <CloudOff className="size-7" aria-hidden />
        </span>
        <h1 className="heading-display mt-6 text-[26px] leading-tight">
          <strong className="font-medium">{t.errorTitle}</strong>
        </h1>
        <p className="mt-2 max-w-sm text-[16px] text-muted">{t.errorBody}</p>
        <button
          type="button"
          onClick={() =>
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
          className="mt-7 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-primary"
        >
          <RotateCcw className="size-4" aria-hidden />
          {t.retry}
        </button>
      </div>
    </div>
  );
}
