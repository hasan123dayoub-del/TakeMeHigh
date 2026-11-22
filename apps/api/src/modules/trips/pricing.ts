import type { Trip } from './entities/trip.entity';

const today = () => new Date().toISOString().slice(0, 10);

/** An offer applies when it has a price and has not expired (end date inclusive). */
export function activeOffer(t: Pick<Trip, 'offerPrice' | 'offerEndsAt' | 'offerLabel'>, on = today()) {
  if (!t.offerPrice) return null;
  if (t.offerEndsAt && t.offerEndsAt < on) return null;
  return { price: t.offerPrice, label: t.offerLabel, endsAt: t.offerEndsAt };
}

/** The adult price a booking made now should use. */
export function effectiveAdultPrice(t: Pick<Trip, 'pricePerPerson' | 'offerPrice' | 'offerEndsAt' | 'offerLabel'>) {
  return activeOffer(t)?.price ?? t.pricePerPerson;
}
