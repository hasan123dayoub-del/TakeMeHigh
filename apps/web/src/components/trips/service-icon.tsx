import type { ServiceKind, TransportMode } from '@travelos/shared';
import { createElement } from 'react';
import { BedDouble, BusFront, CircleEllipsis, Plane, Ship, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function serviceIcon(kind: ServiceKind, mode?: TransportMode | null): LucideIcon {
  if (kind === 'HOTEL') return BedDouble;
  if (kind === 'RESTAURANT') return UtensilsCrossed;
  if (kind === 'TRANSPORT') return mode === 'AIR' ? Plane : mode === 'SEA' ? Ship : BusFront;
  return CircleEllipsis;
}

/** Tone per service kind, used by the timeline nodes and the checklist. */
export const SERVICE_TONE: Record<ServiceKind, string> = {
  TRANSPORT: 'bg-primary/12 text-primary ring-primary/25',
  HOTEL: 'bg-info/12 text-info ring-info/25',
  RESTAURANT: 'bg-warning/14 text-[color-mix(in_srgb,var(--warning)_75%,var(--text))] ring-warning/25',
  OTHER: 'bg-neutral/12 text-muted ring-neutral/20',
};

export function ServiceIcon({
  kind,
  mode,
  className,
  size = 'md',
}: {
  kind: ServiceKind;
  mode?: TransportMode | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {

  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full ring-1 ring-inset',
        SERVICE_TONE[kind],
        size === 'sm' && 'size-7 [&_svg]:size-3.5',
        size === 'md' && 'size-10 [&_svg]:size-[18px]',
        size === 'lg' && 'size-12 [&_svg]:size-5',
        className,
      )}
    >
      {createElement(serviceIcon(kind, mode), { strokeWidth: 1.75 })}
    </span>
  );
}
