'use client';

import { Check, ChevronDown, MapPin, Search } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useMemo, useState } from 'react';
import { fieldBase } from '@/components/ui/input';
import { useFieldControl } from '@/components/ui/form-field';
import { useLookups, useName } from '@/lib/hooks';
import { defineMessages, useMessages } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const m = defineMessages({
  ar: { placeholder: 'اختر مدينة…', search: 'ابحث عن مدينة أو بلد…', empty: 'لا توجد نتائج' },
  en: { placeholder: 'Choose a city…', search: 'Search a city or country…', empty: 'No results' },
});

/** Searchable city select grouped by country (active cities from useLookups). */
export function CityCombobox({
  value,
  onChange,
  placeholder,
  exclude,
  disabled,
}: {
  value: string;
  onChange: (cityId: string) => void;
  placeholder?: string;
  /** Hide these city ids (e.g. the origin when choosing a destination) */
  exclude?: string[];
  disabled?: boolean;
}) {
  const t = useMessages(m);
  const field = useFieldControl();
  const lookups = useLookups().data;
  const name = useName();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    if (!lookups) return [];
    const needle = q.trim().toLowerCase();
    return lookups.countries
      .map((country) => {
        const countryHit = !!needle && (country.nameAr.includes(needle) || country.nameEn.toLowerCase().includes(needle));
        const cities = lookups.cities.filter(
          (c) =>
            c.countryId === country.id &&
            !exclude?.includes(c.id) &&
            (!needle || countryHit || c.nameAr.includes(needle) || c.nameEn.toLowerCase().includes(needle)),
        );
        return { country, cities };
      })
      .filter((g) => g.cities.length > 0)
      .sort((a, b) => (a.country.isoCode === 'SY' ? -1 : b.country.isoCode === 'SY' ? 1 : 0));
  }, [lookups, q, exclude]);

  const selected = lookups?.cities.find((c) => c.id === value);
  const selectedCountry = lookups?.countries.find((c) => c.id === selected?.countryId);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ('');
      }}
    >
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          {...field}
          className={cn(fieldBase, 'flex h-11 items-center gap-2 px-4 text-start', !selected && 'text-subtle')}
        >
          <MapPin className="size-4 shrink-0 text-subtle" aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            {selected ? (
              <>
                {name(selected)}
                <span className="ms-1.5 text-xs text-muted">· {name(selectedCountry)}</span>
              </>
            ) : (
              (placeholder ?? t.placeholder)
            )}
          </span>
          <ChevronDown className="size-4 shrink-0 text-subtle" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-(--radix-popover-trigger-width) min-w-64 overflow-hidden rounded-tile border border-border bg-surface-raised text-foreground shadow-pop data-[state=open]:animate-pop-in"
        >
          <div className="relative border-b border-border p-2">
            <Search className="pointer-events-none absolute start-5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.search}
              aria-label={t.search}
              className="h-9 w-full rounded-[10px] bg-surface ps-9 pe-3 text-sm outline-none placeholder:text-subtle"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5" role="listbox">
            {groups.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">{t.empty}</p>}
            {groups.map(({ country, cities }) => (
              <div key={country.id} className="mb-1">
                <div className="eyebrow sticky top-0 bg-surface-raised px-2.5 py-1.5">{name(country)}</div>
                {cities.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={c.id === value}
                    onClick={() => {
                      onChange(c.id);
                      setOpen(false);
                      setQ('');
                    }}
                    className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-start text-sm hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
                  >
                    <span className="flex-1">{name(c)}</span>
                    {c.id === value && <Check className="size-4 text-primary" aria-hidden />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
