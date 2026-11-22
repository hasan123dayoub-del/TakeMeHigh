'use client';

import { useFormat } from '@/lib/use-format';
import { cn } from '@/lib/utils';

/**
 * Money in its own currency. Latin currency tokens ("US$") are isolated as LTR so that, inside
 * Arabic text, "US$" is not reordered into "$US" by the bidi algorithm.
 */
export function Money({
  value,
  currency,
  className,
}: {
  value: string | number | null | undefined;
  currency: string;
  className?: string;
}) {
  const f = useFormat();
  const text = f.money(value, currency);
  const parts = text.split(/([A-Za-z]+\$?)/);
  return (
    <span className={cn('num whitespace-nowrap', className)}>
      {parts.map((p, i) =>
        i % 2 ? (
          <span key={i} dir="ltr" className="[unicode-bidi:isolate]">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </span>
  );
}
