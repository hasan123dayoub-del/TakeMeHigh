'use client';

import { ExternalLink, MapPin, MapPinOff, Navigation, Phone } from 'lucide-react';
import { useState } from 'react';
import { useMessages } from '@/lib/i18n';
import type { GeoPoint } from '@/lib/types/public';
import { cn } from '@/lib/utils';
import { mapLinks } from './brand';
import { fmt, pm } from './messages';

export interface MapPlace {
  key: string;
  name: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  location: GeoPoint | null;
  tag?: string;
}

/** OpenStreetMap embed for one point, with the "Open in Google Maps" link. */
export function MapFrame({ place, className }: { place: MapPlace; className?: string }) {
  const t = useMessages(pm);
  if (!place.location) {
    return (
      <div className={cn('grid place-items-center rounded-card bg-surface-sunken p-6 text-center text-sm text-muted', className)}>
        <span className="grid justify-items-center gap-2">
          <MapPinOff className="size-6" aria-hidden />
          {t.noLocation}
        </span>
      </div>
    );
  }
  const { embed } = mapLinks(place.location.latitude, place.location.longitude);
  return (
    <div className={cn('relative overflow-hidden rounded-card bg-surface-sunken ring-1 ring-border', className)}>
      <iframe
        key={embed}
        src={embed}
        title={fmt(t.mapTitle, { name: place.name })}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0 size-full border-0 dark:brightness-[0.85] dark:contrast-[1.1] dark:hue-rotate-180 dark:invert"
      />
    </div>
  );
}

export function GoogleMapsLink({ location, className }: { location: GeoPoint | null; className?: string }) {
  const t = useMessages(pm);
  if (!location) return null;
  return (
    <a
      href={mapLinks(location.latitude, location.longitude).google}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3.5 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong',
        className,
      )}
    >
      <Navigation className="size-3.5" aria-hidden />
      {t.openInMaps}
      <ExternalLink className="size-3 opacity-60 rtl-flip" aria-hidden />
    </a>
  );
}

/** Map + list of the office and its branches; choosing a place moves the map. */
export function LocationsPanel({ places }: { places: MapPlace[] }) {
  const firstWithMap = places.find((p) => p.location) ?? places[0];
  const [selected, setSelected] = useState(firstWithMap?.key);
  const current = places.find((p) => p.key === selected) ?? firstWithMap;
  if (!current) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <MapFrame place={current} className="h-[280px] sm:h-[380px]" />
      <ul className="grid content-start gap-2">
        {places.map((p) => {
          const active = p.key === current.key;
          return (
            <li key={p.key}>
              <div
                className={cn(
                  'rounded-tile border p-4 transition-colors',
                  active ? 'border-ink/70 bg-surface-raised shadow-pop' : 'border-border bg-surface-raised/70',
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelected(p.key)}
                  aria-pressed={active}
                  disabled={!p.location}
                  className="flex w-full items-start gap-3 text-start disabled:cursor-default"
                >
                  <span
                    className={cn(
                      'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full',
                      active ? 'bg-ink text-ink-foreground' : 'bg-accent-soft text-accent-foreground',
                    )}
                  >
                    <MapPin className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{p.name}</span>
                      {p.tag && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent-foreground">{p.tag}</span>}
                    </span>
                    {(p.address || p.city) && <span className="mt-0.5 block text-[13px] text-muted">{p.address ?? p.city}</span>}
                  </span>
                </button>
                <div className="mt-3 flex flex-wrap gap-2 ps-11">
                  <GoogleMapsLink location={p.location} />
                  {p.phone && (
                    <a
                      href={`tel:${p.phone.replace(/[^\d+]/g, '')}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3.5 text-[13px] font-medium text-foreground hover:border-border-strong"
                    >
                      <Phone className="size-3.5" aria-hidden />
                      <span className="ltr-nums">{p.phone}</span>
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
