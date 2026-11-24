import type { ProductStatus, ServiceKind, TransportMode, TravelScope } from '@travelos/shared';
import type { NamedRef, Program, ProgramLegTrip, TripListItem } from '@/lib/types/api';
import { toCents } from './product-bits';

/** One trip as used by the legs picker and the chain (from the trips list or a program's legs). */
export interface LegTrip {
  id: string;
  code: string;
  title: string;
  status: ProductStatus;
  scope: TravelScope;
  branchId: string | null;
  startsAt: string;
  endsAt: string;
  registrationDeadline: string;
  currencyCode: string;
  maxPassengers: number;
  confirmedSeats: number;
  pricePerPerson: string;
  costPerPerson?: string;
  originCity: NamedRef;
  destinationCity: NamedRef;
  /** Known when the trip comes from a program (legs carry their lines). */
  modes?: TransportMode[];
  services?: ServiceKind[];
}

export function legFromTrip(t: TripListItem): LegTrip {
  return {
    id: t.id,
    code: t.code,
    title: t.title,
    status: t.status,
    scope: t.scope,
    branchId: t.branchId,
    startsAt: t.startsAt,
    endsAt: t.endsAt,
    registrationDeadline: t.registrationDeadline,
    currencyCode: t.currencyCode,
    maxPassengers: t.maxPassengers,
    confirmedSeats: t.confirmedSeats,
    pricePerPerson: t.pricePerPerson,
    costPerPerson: t.costPerPerson,
    originCity: t.originCity,
    destinationCity: { id: t.destinationCity.id, nameAr: t.destinationCity.nameAr, nameEn: t.destinationCity.nameEn },
  };
}

export function legFromProgram(t: ProgramLegTrip): LegTrip {
  const modes: TransportMode[] = [];
  const services: ServiceKind[] = [];
  for (const l of t.lines) {
    if (l.transportMode && !modes.includes(l.transportMode)) modes.push(l.transportMode);
    if (!services.includes(l.service.kind)) services.push(l.service.kind);
  }
  return {
    id: t.id,
    code: t.code,
    title: t.title,
    status: t.status,
    scope: t.scope,
    branchId: t.branchId,
    startsAt: t.startsAt,
    endsAt: t.endsAt,
    registrationDeadline: t.registrationDeadline,
    currencyCode: t.currencyCode,
    maxPassengers: t.maxPassengers,
    confirmedSeats: t.confirmedSeats,
    pricePerPerson: t.pricePerPerson,
    costPerPerson: t.costPerPerson,
    originCity: t.originCity,
    destinationCity: t.destinationCity,
    modes,
    services,
  };
}

export type LinkCheck = { ok: true } | { ok: false; kind: 'place' | 'time' | 'both' };

/** Client-side PGM-02 hint between two consecutive legs (the API stays authoritative). */
export function linkCheck(prev: LegTrip, next: LegTrip): LinkCheck {
  const place = prev.destinationCity.id === next.originCity.id;
  const time = new Date(next.startsAt).getTime() >= new Date(prev.endsAt).getTime();
  if (place && time) return { ok: true };
  return { ok: false, kind: !place && !time ? 'both' : !place ? 'place' : 'time' };
}

export function chainSummary(legs: LegTrip[]) {
  const currencies = [...new Set(legs.map((l) => l.currencyCode))];
  const priceCents = legs.reduce((s, l) => s + toCents(l.pricePerPerson), 0);
  const hasCost = legs.length > 0 && legs.every((l) => l.costPerPerson !== undefined);
  const costCents = hasCost ? legs.reduce((s, l) => s + toCents(l.costPerPerson), 0) : null;
  const links = legs.slice(1).map((l, i) => linkCheck(legs[i], l));
  const seatsCap = legs.length ? Math.max(0, Math.min(...legs.map((l) => l.maxPassengers - l.confirmedSeats))) : null;
  const earliestDeadline = legs.length ? legs.map((l) => l.registrationDeadline).sort()[0] : null;
  return {
    currencies,
    mixedCurrency: currencies.length > 1,
    priceCents,
    costCents,
    links,
    connected: links.every((x) => x.ok),
    seatsCap,
    earliestDeadline,
    startsAt: legs[0]?.startsAt ?? null,
    endsAt: legs.at(-1)?.endsAt ?? null,
  };
}

/** Cities along the program: origin of the first leg, then each leg's destination. */
export function routeCities(p: Pick<Program, 'legs'>) {
  if (!p.legs.length) return [];
  return [p.legs[0].trip.originCity, ...p.legs.map((l) => l.trip.destinationCity)];
}

export function daysBetween(a: string | null, b: string | null) {
  if (!a || !b) return null;
  const day = (s: string) => {
    const d = new Date(s);
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;
  };
  return day(b) - day(a) + 1;
}
