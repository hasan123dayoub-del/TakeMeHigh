'use client';

/*
 * Small building blocks shared by the programs and offers modules:
 * transport/service icons, service chips, cover image upload, API error list, info callout
 * and the date / money helpers used by the client-side previews.
 */
import type { ServiceKind, TransportMode } from '@travelos/shared';
import { AlertTriangle, BedDouble, CheckCircle2, Bus, ImagePlus, Info, Loader2, Plane, Ship, Trash2, UtensilsCrossed, Package, type LucideIcon } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api, ApiError, errorMessage } from '@/lib/api';
import { defineMessages, LABELS, useLocale, useMessages } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const m = defineMessages({
  ar: {
    upload: 'رفع صورة',
    replace: 'تغيير الصورة',
    remove: 'إزالة',
    uploading: 'جارٍ الرفع…',
    coverHint: 'JPEG أو PNG أو WebP. تظهر في الصفحة العامة.',
    errorsTitle: 'رفض الخادم الحفظ للأسباب التالية:',
  },
  en: {
    upload: 'Upload image',
    replace: 'Change image',
    remove: 'Remove',
    uploading: 'Uploading…',
    coverHint: 'JPEG, PNG or WebP. Shown on the public page.',
    errorsTitle: 'The server refused for these reasons:',
  },
});

// ------------------------------------------------------------------ icons

export const MODE_ICON: Record<TransportMode, LucideIcon> = { LAND: Bus, SEA: Ship, AIR: Plane };
export const SERVICE_ICON: Record<ServiceKind, LucideIcon> = { HOTEL: BedDouble, TRANSPORT: Bus, RESTAURANT: UtensilsCrossed, OTHER: Package };

export function ModeIcon({ mode, className }: { mode: TransportMode; className?: string }) {
  const { locale } = useLocale();
  const Icon = MODE_ICON[mode];
  return <Icon className={cn('size-4', className)} aria-label={LABELS.transportMode[mode][locale]} role="img" />;
}

/** Unique transport modes of a trip's lines, in order of appearance. */
export function modesOf(lines: { transportMode: TransportMode | null }[] | undefined): TransportMode[] {
  const out: TransportMode[] = [];
  for (const l of lines ?? []) if (l.transportMode && !out.includes(l.transportMode)) out.push(l.transportMode);
  return out;
}

const SERVICE_TONE: Record<ServiceKind, string> = {
  HOTEL: 'bg-chart-2/12 text-[color-mix(in_srgb,var(--chart-2)_70%,var(--text))] ring-chart-2/25',
  TRANSPORT: 'bg-primary/10 text-[color-mix(in_srgb,var(--primary)_72%,var(--text))] ring-primary/22',
  RESTAURANT: 'bg-warning/12 text-[color-mix(in_srgb,var(--warning)_72%,var(--text))] ring-warning/24',
  OTHER: 'bg-neutral/12 text-[color-mix(in_srgb,var(--neutral)_60%,var(--text))] ring-neutral/20',
};

export function ServiceChip({ kind, label, size = 'md' }: { kind: ServiceKind; label?: ReactNode; size?: 'sm' | 'md' }) {
  const { locale } = useLocale();
  const Icon = SERVICE_ICON[kind];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ring-1 ring-inset',
        size === 'md' ? 'h-7 px-3 text-xs' : 'h-6 px-2.5 text-[11px]',
        SERVICE_TONE[kind],
      )}
    >
      <Icon className={size === 'md' ? 'size-3.5' : 'size-3'} aria-hidden />
      {label ?? LABELS.serviceKind[kind][locale]}
    </span>
  );
}

export function ServiceChips({ kinds, size }: { kinds: ServiceKind[]; size?: 'sm' | 'md' }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {kinds.map((k) => (
        <ServiceChip key={k} kind={k} size={size} />
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ callouts & errors

export function Callout({ tone = 'info', title, children, className }: { tone?: 'info' | 'warning' | 'danger' | 'success'; title?: ReactNode; children?: ReactNode; className?: string }) {
  const Icon = tone === 'info' ? Info : tone === 'success' ? CheckCircle2 : AlertTriangle;
  return (
    <div
      className={cn(
        'flex gap-3 rounded-[14px] p-3.5 text-[13px] leading-relaxed ring-1 ring-inset',
        tone === 'info' && 'bg-accent-soft/60 ring-accent/30',
        tone === 'success' && 'bg-success/8 ring-success/25',
        tone === 'warning' && 'bg-warning/10 ring-warning/30',
        tone === 'danger' && 'bg-danger/8 ring-danger/25',
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-4 shrink-0',
          tone === 'info' && 'text-primary',
          tone === 'success' && 'text-success',
          tone === 'warning' && 'text-warning',
          tone === 'danger' && 'text-danger',
        )}
        aria-hidden
      />
      <div className={cn('min-w-0', className)}>
        {title && <div className="font-medium text-foreground">{title}</div>}
        {children && <div className={cn('text-muted', title && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  );
}

/** Messages of an API error as a list (400 validation arrays are shown verbatim). */
export function ApiErrors({ error, className }: { error: unknown; className?: string }) {
  const t = useMessages(m);
  if (!error) return null;
  const messages = error instanceof ApiError ? error.messages : [errorMessage(error)];
  return (
    <div role="alert" className={cn('rounded-[14px] bg-danger/8 p-3.5 text-[13px] ring-1 ring-danger/25 ring-inset', className)}>
      <div className="flex items-center gap-2 font-medium text-danger">
        <AlertTriangle className="size-4" aria-hidden /> {t.errorsTitle}
      </div>
      <ul className="mt-2 list-disc space-y-1 ps-6 text-foreground" dir="auto">
        {messages.map((msg, i) => (
          <li key={i} dir="auto">
            {msg}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ cover upload

export function CoverUpload({ value, onChange, disabled }: { value: string; onChange: (url: string) => void; disabled?: boolean }) {
  const t = useMessages(m);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await api.post<{ url: string }>('/uploads/images', body);
      onChange(res.url);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative grid aspect-[16/10] w-40 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-dashed border-border-strong bg-surface-sunken">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-6 text-subtle" aria-hidden />
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-surface/70">
            <Loader2 className="size-5 animate-spin text-primary" aria-label={t.uploading} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={busy || disabled} onClick={() => input.current?.click()}>
            <ImagePlus /> {value ? t.replace : t.upload}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" disabled={busy || disabled} onClick={() => onChange('')}>
              <Trash2 /> {t.remove}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted">{t.coverHint}</p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------------ helpers

/** ISO → value for <input type="datetime-local"> in the user's time zone. */
export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** <input type="datetime-local"> value → ISO string. */
export function fromLocalInput(v: string) {
  return v ? new Date(v).toISOString() : '';
}

/** Money preview maths in integer cents (the API recomputes authoritatively with decimals). */
export const toCents = (v: string | number | null | undefined) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
export const fromCents = (c: number) => (c / 100).toFixed(2);

/** Discount per person, never more than the price (PRC-05). */
export function discountCents(priceCents: number, mode: 'PERCENT' | 'FIXED', value: string | number) {
  const raw = mode === 'PERCENT' ? Math.round((priceCents * Number(value || 0)) / 100) : toCents(value);
  return Math.max(0, Math.min(priceCents, raw));
}
