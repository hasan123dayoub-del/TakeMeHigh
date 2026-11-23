import type { Tx } from '../prisma/prisma.service';

/**
 * Seat accounting (BR-12, BKG-05). Every take is ONE conditional UPDATE; PostgreSQL row locks
 * serialise concurrent requests, so the capacity can never be exceeded however many employees
 * confirm at the same moment. A failed take throws, rolling back the whole transaction (e.g. a
 * program whose third leg is full takes no seat on the first two).
 */
export class SeatsUnavailableError extends Error {
  constructor(readonly where: string) {
    super(`Not enough seats on ${where}`);
  }
}

export type Target = { kind: 'TRIP'; id: string } | { kind: 'PROGRAM'; id: string; legTripIds: string[] } | { kind: 'OFFER'; id: string };

async function takeTrip(tx: Tx, tripId: string, n: number) {
  const updated = await tx.$executeRaw`
    UPDATE trips SET confirmed_seats = confirmed_seats + ${n}, updated_at = now()
    WHERE id = ${tripId}::uuid AND status = 'OPEN' AND confirmed_seats + ${n} <= max_passengers`;
  if (updated !== 1) throw new SeatsUnavailableError(`trip ${tripId}`);
}

export async function takeSeats(tx: Tx, target: Target, n: number) {
  if (target.kind === 'TRIP') return takeTrip(tx, target.id, n);
  if (target.kind === 'PROGRAM') {
    const updated = await tx.$executeRaw`
      UPDATE programs SET confirmed_seats = confirmed_seats + ${n}, updated_at = now()
      WHERE id = ${target.id}::uuid AND status = 'OPEN' AND confirmed_seats + ${n} <= max_passengers`;
    if (updated !== 1) throw new SeatsUnavailableError(`program ${target.id}`);
    // Legs in a fixed order so two concurrent program bookings cannot deadlock.
    for (const tripId of [...target.legTripIds].sort()) await takeTrip(tx, tripId, n);
    return;
  }
  const updated = await tx.$executeRaw`
    UPDATE offers SET confirmed_seats = confirmed_seats + ${n}, updated_at = now()
    WHERE id = ${target.id}::uuid AND is_active AND (max_seats IS NULL OR confirmed_seats + ${n} <= max_seats)`;
  if (updated !== 1) throw new SeatsUnavailableError(`offer ${target.id}`);
}

export async function releaseSeats(tx: Tx, target: Target, n: number) {
  if (target.kind === 'TRIP') {
    await tx.$executeRaw`UPDATE trips SET confirmed_seats = GREATEST(0, confirmed_seats - ${n}), updated_at = now() WHERE id = ${target.id}::uuid`;
  } else if (target.kind === 'PROGRAM') {
    await tx.$executeRaw`UPDATE programs SET confirmed_seats = GREATEST(0, confirmed_seats - ${n}), updated_at = now() WHERE id = ${target.id}::uuid`;
    for (const tripId of [...target.legTripIds].sort())
      await tx.$executeRaw`UPDATE trips SET confirmed_seats = GREATEST(0, confirmed_seats - ${n}), updated_at = now() WHERE id = ${tripId}::uuid`;
  } else {
    await tx.$executeRaw`UPDATE offers SET confirmed_seats = GREATEST(0, confirmed_seats - ${n}), updated_at = now() WHERE id = ${target.id}::uuid`;
  }
}
