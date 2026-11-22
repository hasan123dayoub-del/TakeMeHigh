'use client';

import { BadgePercent, CalendarRange, ChevronDown, MapPin, Tag, X } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { defineMessages, useLocale, useMessages } from '@/lib/i18n';
import type { PublicCategory, ShowcaseFilters } from '@/lib/types/public';
import { cn } from '@/lib/utils';

const m = defineMessages({
  ar: {
    filtersLabel: 'تصفية الرحلات',
    allDestinations: 'كل الوجهات',
    destinations: 'الوجهة',
    anyType: 'كل الفئات',
    vip: 'VIP',
    standard: 'عادي',
    tripType: 'فئة الرحلة',
    anyCategory: 'كل الأنواع',
    category: 'نوع الرحلة',
    anyTime: 'أي موعد',
    when: 'موعد الانطلاق',
    customDates: 'تواريخ محددة…',
    from: 'من',
    to: 'إلى',
    offersOnly: 'العروض فقط',
    clear: 'مسح التصفية',
  },
  en: {
    filtersLabel: 'Filter trips',
    allDestinations: 'All destinations',
    destinations: 'Destination',
    anyType: 'All classes',
    vip: 'VIP',
    standard: 'Standard',
    tripType: 'Trip class',
    anyCategory: 'All kinds',
    category: 'Kind of trip',
    anyTime: 'Any time',
    when: 'Departure',
    customDates: 'Specific dates…',
    from: 'From',
    to: 'To',
    offersOnly: 'Offers only',
    clear: 'Clear filters',
  },
});

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The next six calendar months as {from,to} ranges. */
function upcomingMonths(intl: string) {
  const now = new Date();
  const name = new Intl.DateTimeFormat(intl, { month: 'long', year: 'numeric' });
  return Array.from({ length: 6 }, (_, i) => {
    const first = new Date(now.getFullYear(), now.getMonth() + i, 1, 12);
    const last = new Date(now.getFullYear(), now.getMonth() + i + 1, 0, 12);
    return { key: iso(first).slice(0, 7), label: name.format(first), from: iso(first), to: iso(last) };
  });
}

export function hasActiveFilters(v: ShowcaseFilters) {
  return !!(v.destination || v.category || v.tripType || v.from || v.to || v.offersOnly || v.search);
}

const pill =
  'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const pillIdle = 'border-border bg-surface-raised text-muted hover:border-border-strong hover:text-foreground';
const pillActive = 'border-ink bg-ink text-ink-foreground';

/**
 * Destination chips, class (VIP/Standard), kind (category), departure month or dates, offers only.
 * Controlled: the landing writes it to the URL, the office page keeps it in state.
 */
export function TripFilters({
  value,
  onChange,
  destinations,
  categories,
  className,
  trailing,
}: {
  value: ShowcaseFilters;
  onChange: (next: ShowcaseFilters) => void;
  destinations: string[];
  categories: PublicCategory[];
  className?: string;
  trailing?: ReactNode;
}) {
  const t = useMessages(m);
  const { locale, intl } = useLocale();
  const months = useMemo(() => upcomingMonths(intl), [intl]);
  const set = (patch: Partial<ShowcaseFilters>) => onChange({ ...value, ...patch });

  const monthKey = months.find((mo) => mo.from === value.from && mo.to === value.to)?.key;
  const custom = !monthKey && !!(value.from || value.to);
  const whenValue = monthKey ?? (custom ? 'custom' : '');

  return (
    <div role="group" aria-label={t.filtersLabel} className={cn('grid gap-3', className)}>
      {/* destinations */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none" role="radiogroup" aria-label={t.destinations}>
        {[{ v: undefined, label: t.allDestinations }, ...destinations.map((d) => ({ v: d, label: d }))].map(({ v, label }) => {
          const active = (value.destination ?? undefined) === v;
          return (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => set({ destination: v })}
              className={cn(pill, active ? pillActive : pillIdle)}
            >
              {v && <MapPin className="size-3.5" aria-hidden />}
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* class */}
        <div className="inline-flex h-10 items-center rounded-full border border-border bg-surface-raised p-1" role="radiogroup" aria-label={t.tripType}>
          {(
            [
              [undefined, t.anyType],
              ['VIP', t.vip],
              ['STANDARD', t.standard],
            ] as const
          ).map(([v, label]) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={value.tripType === v}
              onClick={() => set({ tripType: v })}
              className={cn(
                'h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors',
                value.tripType === v ? 'bg-ink text-ink-foreground' : 'text-muted hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* kind */}
        {categories.length > 0 && (
          <PillSelect
            icon={<Tag className="size-3.5" aria-hidden />}
            label={t.category}
            active={!!value.category}
            value={value.category ?? ''}
            onChange={(v) => set({ category: v || undefined })}
          >
            <option value="">{t.anyCategory}</option>
            {categories.map((c) => (
              <option key={c.name} value={c.name}>
                {locale === 'ar' ? (c.nameAr ?? c.name) : c.name}
              </option>
            ))}
          </PillSelect>
        )}

        {/* when */}
        <PillSelect
          icon={<CalendarRange className="size-3.5" aria-hidden />}
          label={t.when}
          active={!!whenValue}
          value={whenValue}
          onChange={(v) => {
            if (!v) return set({ from: undefined, to: undefined });
            if (v === 'custom') return set({ from: value.from ?? iso(new Date()), to: value.to });
            const mo = months.find((x) => x.key === v)!;
            set({ from: mo.from, to: mo.to });
          }}
        >
          <option value="">{t.anyTime}</option>
          {months.map((mo) => (
            <option key={mo.key} value={mo.key}>
              {mo.label}
            </option>
          ))}
          <option value="custom">{t.customDates}</option>
        </PillSelect>

        {custom && (
          <div className="flex flex-wrap items-center gap-2">
            <DateField label={t.from} value={value.from} onChange={(v) => set({ from: v })} />
            <DateField label={t.to} value={value.to} min={value.from} onChange={(v) => set({ to: v })} />
          </div>
        )}

        {/* offers */}
        <button
          type="button"
          role="switch"
          aria-checked={!!value.offersOnly}
          onClick={() => set({ offersOnly: value.offersOnly ? undefined : true })}
          className={cn(pill, value.offersOnly ? pillActive : pillIdle)}
        >
          <BadgePercent className="size-4" aria-hidden />
          {t.offersOnly}
        </button>

        {hasActiveFilters(value) && (
          <button
            type="button"
            onClick={() => onChange({})}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-primary hover:underline"
          >
            <X className="size-3.5" aria-hidden />
            {t.clear}
          </button>
        )}
        {trailing && <div className="ms-auto">{trailing}</div>}
      </div>
    </div>
  );
}

function PillSelect({
  icon,
  label,
  active,
  value,
  onChange,
  children,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <label className={cn(pill, 'relative pe-9', active ? pillActive : pillIdle)}>
      {icon}
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer appearance-none rounded-full opacity-0"
        aria-label={label}
      >
        {children}
      </select>
      <span aria-hidden className="pointer-events-none">
        {selectedText(children, value)}
      </span>
      <ChevronDown className="pointer-events-none absolute end-3 size-3.5 opacity-70" aria-hidden />
    </label>
  );
}

/** Text of the selected <option> among children, for the visible pill label. */
function selectedText(children: ReactNode, value: string): ReactNode {
  const flat: ReactNode[] = [];
  const walk = (n: ReactNode) => {
    if (Array.isArray(n)) n.forEach(walk);
    else if (n) flat.push(n);
  };
  walk(children);
  for (const c of flat) {
    if (typeof c === 'object' && c && 'props' in c) {
      const p = c.props as { value?: string; children?: ReactNode };
      if ((p.value ?? '') === value) return p.children;
    }
  }
  return null;
}

function DateField({ label, value, min, onChange }: { label: string; value?: string; min?: string; onChange: (v: string | undefined) => void }) {
  return (
    <label className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-surface-raised ps-4 pe-2 text-[13px] text-muted">
      {label}
      <input
        type="date"
        dir="ltr"
        value={value ?? ''}
        min={min}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="num h-8 rounded-full bg-transparent px-1 text-foreground outline-none"
      />
    </label>
  );
}
