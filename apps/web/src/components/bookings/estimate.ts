import type { TripOffer } from '@/lib/types/bookings';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * UI-only ESTIMATE of a booking total, mirroring the server's rule (PERCENTAGE on the subtotal,
 * FIXED per person, never above the subtotal). The server computes and freezes the real amount.
 */
export function estimateTotal(pricePerPerson: string | number, passengers: number, offer: TripOffer | null) {
  const unit = Number(pricePerPerson) || 0;
  const subtotal = round2(unit * passengers);
  let discount = 0;
  if (offer) {
    const v = Number(offer.discountValue) || 0;
    discount = offer.discountType === 'PERCENTAGE' ? subtotal * (v / 100) : v * passengers;
    discount = round2(Math.min(discount, subtotal));
  }
  return { unit, subtotal, discount, total: round2(subtotal - discount) };
}

/** "−10%" or "−50,000 SYP / person" */
export function offerLabel(offer: TripOffer, money: (v: string, cur: string) => string, currency: string, perPerson: string) {
  return offer.discountType === 'PERCENTAGE'
    ? `−${Number(offer.discountValue)}%`
    : `−${money(offer.discountValue, currency)} / ${perPerson}`;
}
