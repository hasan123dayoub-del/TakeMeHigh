/**
 * Pure business rules for trips, programs and offers. No database access, so every rule is
 * unit-tested in rules.spec.ts. Messages are user-facing (English, translated by the web app
 * when a code is known).
 */
import { MIN_DISTINCT_SERVICES, PRODUCT_TRANSITIONS, type ProductStatus } from '@travelos/shared';
import { D, Decimal, discountAmount, type Mode, sum } from '../common/utils/money';

export interface RouteLine {
  id?: string;
  serviceKind: string;
  transport: boolean;
  startsAt: Date;
  endsAt: Date;
  fromCityId: string | null;
  toCityId: string | null;
  label: string;
}

export interface TripFrame {
  originCityId: string;
  destinationCityId: string;
  startsAt: Date;
  endsAt: Date;
}

const fmt = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 16);

/** Lines in time order (sequence numbers follow this order). */
export function orderLines<T extends { startsAt: Date; endsAt: Date }>(lines: T[]): T[] {
  return [...lines].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime() || a.endsAt.getTime() - b.endsAt.getTime());
}

/**
 * Checks enforced on every save (TRP-05, TRP-06):
 *  - every line lies inside the trip window
 *  - consecutive transport legs connect: arrival of one = departure of the next, and no overlap in time
 *  - hotel stays do not overlap each other
 *  - hotels and restaurants are in a city on the route
 */
export function routeErrors(frame: TripFrame, lines: RouteLine[]): string[] {
  const errors: string[] = [];
  const ordered = orderLines(lines);
  for (const l of ordered) {
    if (l.endsAt < l.startsAt) errors.push(`${l.label}: ends before it starts`);
    if (l.startsAt < frame.startsAt || l.endsAt > frame.endsAt)
      errors.push(`${l.label}: must be within the trip dates (${fmt(frame.startsAt)} → ${fmt(frame.endsAt)})`);
  }

  const legs = ordered.filter((l) => l.transport);
  for (let i = 1; i < legs.length; i++) {
    const prev = legs[i - 1];
    const next = legs[i];
    if (prev.toCityId !== next.fromCityId) errors.push(`${next.label}: must depart from where "${prev.label}" arrives (no jump between places)`);
    if (next.startsAt < prev.endsAt) errors.push(`${next.label}: starts before "${prev.label}" arrives (${fmt(prev.endsAt)})`);
  }

  const stays = ordered.filter((l) => l.serviceKind === 'HOTEL');
  for (let i = 1; i < stays.length; i++) {
    if (stays[i].startsAt < stays[i - 1].endsAt) errors.push(`${stays[i].label}: overlaps the stay "${stays[i - 1].label}"`);
  }

  const routeCities = new Set<string>([frame.originCityId, frame.destinationCityId]);
  for (const leg of legs) {
    if (leg.fromCityId) routeCities.add(leg.fromCityId);
    if (leg.toCityId) routeCities.add(leg.toCityId);
  }
  for (const l of ordered) {
    if (!l.transport && l.toCityId && !routeCities.has(l.toCityId)) errors.push(`${l.label}: is in a city that is not on the trip route`);
  }
  return errors;
}

/**
 * Extra checks before a trip can be published (TRP-03, TRP-05):
 *  - at least two different core services (BR-04)
 *  - the first transport leg leaves from the trip origin
 *  - the transport legs reach the destination
 */
export function publishErrors(frame: TripFrame, lines: RouteLine[]): string[] {
  const errors = routeErrors(frame, lines);
  const kinds = new Set(lines.map((l) => l.serviceKind).filter((k) => k === 'HOTEL' || k === 'TRANSPORT' || k === 'RESTAURANT'));
  if (kinds.size < MIN_DISTINCT_SERVICES) errors.push('A trip needs at least two different services out of hotel, transport and restaurant (BR-04)');
  const legs = orderLines(lines.filter((l) => l.transport));
  if (legs.length) {
    if (legs[0].fromCityId !== frame.originCityId) errors.push(`The first transport leg must leave from the trip origin`);
    const reached = legs.some((l) => l.toCityId === frame.destinationCityId);
    if (!reached) errors.push('The transport legs never reach the trip destination');
  }
  return errors;
}

export interface ProgramLeg {
  id: string;
  code: string;
  originCityId: string;
  destinationCityId: string;
  startsAt: Date;
  endsAt: Date;
  registrationDeadline: Date;
  currencyCode: string;
  status: ProductStatus;
}

/** PGM-01, PGM-02, PGM-05: ≥ 2 legs, chained in place and time, one currency, deadline not after any leg's. */
export function programErrors(legs: ProgramLeg[], deadline: Date): string[] {
  const errors: string[] = [];
  if (legs.length < 2) errors.push('A program is made of at least two trips');
  if (new Set(legs.map((l) => l.id)).size !== legs.length) errors.push('The same trip appears twice in the program');
  for (let i = 1; i < legs.length; i++) {
    const prev = legs[i - 1];
    const next = legs[i];
    if (next.originCityId !== prev.destinationCityId) errors.push(`${next.code} must leave from where ${prev.code} ends`);
    if (next.startsAt < prev.endsAt) errors.push(`${next.code} starts before ${prev.code} ends`);
  }
  if (new Set(legs.map((l) => l.currencyCode)).size > 1) errors.push('All trips of a program must use the same currency');
  for (const l of legs) {
    if (l.status === 'CANCELLED' || l.status === 'COMPLETED') errors.push(`${l.code} is ${l.status.toLowerCase()} and cannot be part of a program`);
    if (deadline > l.registrationDeadline) errors.push(`The program deadline cannot be after the registration deadline of ${l.code}`);
  }
  return errors;
}

/** BR-04 for programs and requests: distinct core services over all their parts. */
export const distinctCoreServices = (kinds: string[]) => new Set(kinds.filter((k) => k === 'HOTEL' || k === 'TRANSPORT' || k === 'RESTAURANT')).size;

export function assertTransition(from: ProductStatus, to: ProductStatus): string | null {
  return PRODUCT_TRANSITIONS[from].includes(to) ? null : `Cannot move from ${from} to ${to}`;
}

/** Travel scope from the countries of the places involved (TRP-02). */
export function travelScope(countryCodes: string[], home = 'SY'): 'DOMESTIC' | 'INTERNATIONAL' {
  return countryCodes.every((c) => c === home) ? 'DOMESTIC' : 'INTERNATIONAL';
}

// ------------------------------------------------------------------ pricing

/**
 * Units per person when not given: hotel = nights between check-in and check-out (at least 1),
 * restaurant = calendar days covered, transport and others = 1.
 */
export function defaultQuantity(kind: string, startsAt: Date, endsAt: Date): number {
  const day = (x: Date) => Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()) / 86_400_000;
  if (kind === 'HOTEL') return Math.max(1, day(endsAt) - day(startsAt));
  if (kind === 'RESTAURANT') return Math.max(1, day(endsAt) - day(startsAt) + 1);
  return 1;
}

/** Line cost per person = unit cost × quantity (PRC-01). */
export const lineCost = (unitCost: { toString(): string }, quantity: number) => D(unitCost).mul(quantity).toDecimalPlaces(2);

export interface PricedLine {
  costSnapshot: Decimal.Value | { toString(): string };
  sellingPrice: Decimal.Value | { toString(): string };
}

/** PRC-03: trip price = Σ line selling prices; cost = Σ line costs. */
export function tripTotals(lines: PricedLine[]) {
  return {
    costPerPerson: sum(lines.map((l) => l.costSnapshot)).toFixed(2),
    pricePerPerson: sum(lines.map((l) => l.sellingPrice)).toFixed(2),
  };
}

/** PRC-04 / BR-06: program price = Σ trip prices (no extra program profit). */
export function programTotals(trips: { costPerPerson: { toString(): string }; pricePerPerson: { toString(): string } }[]) {
  return {
    costPerPerson: sum(trips.map((t) => t.costPerPerson)).toFixed(2),
    pricePerPerson: sum(trips.map((t) => t.pricePerPerson)).toFixed(2),
  };
}

/** PRC-05: bundle price = Σ selling prices − discount (per person, never negative). */
export function bundleTotals(lines: PricedLine[], mode: Mode, value: Decimal.Value | { toString(): string }) {
  const gross = sum(lines.map((l) => l.sellingPrice));
  const discount = discountAmount(gross, mode, value);
  return {
    costPerPerson: sum(lines.map((l) => l.costSnapshot)).toFixed(2),
    grossPerPerson: gross.toFixed(2),
    discountPerPerson: discount.toFixed(2),
    pricePerPerson: gross.sub(discount).toFixed(2),
  };
}

export interface DiscountOffer {
  id: string;
  title: string;
  discountMode: Mode;
  discountValue: { toString(): string };
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
}

/** Offer validity uses calendar days (validTo is inclusive). */
export function isOfferLive(o: { isActive: boolean; validFrom: Date; validTo: Date }, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return o.isActive && o.validFrom.toISOString().slice(0, 10) <= today && today <= o.validTo.toISOString().slice(0, 10);
}

/** OFR-03: discounts never stack; the best one for the customer applies. */
export function bestDiscount(price: { toString(): string }, offers: DiscountOffer[], now = new Date()) {
  let best: { offer: DiscountOffer; amount: Decimal } | null = null;
  for (const o of offers) {
    if (!isOfferLive(o, now)) continue;
    const amount = discountAmount(price, o.discountMode, o.discountValue);
    if (!best || amount.gt(best.amount)) best = { offer: o, amount };
  }
  return best;
}

export const money = (v: { toString(): string }) => D(v).toFixed(2);
