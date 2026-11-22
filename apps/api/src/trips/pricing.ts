import { D, Decimal, MoneyInput, sellingPrice } from '../common/utils/money';

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const toDate = (s: string) => new Date(`${s}T00:00:00Z`);
export const todayIso = () => new Date().toISOString().slice(0, 10);

export interface ServicePricing {
  costPerPerson: MoneyInput;
  profitPercent: MoneyInput;
}

/** Totals per person for a set of trip services. selling = Σ cost × (1 + profit%). */
export function priceServices(services: ServicePricing[]) {
  let cost = D(0);
  let selling = D(0);
  const lines = services.map((s) => {
    const sp = sellingPrice(s.costPerPerson, s.profitPercent);
    cost = cost.add(D(s.costPerPerson));
    selling = selling.add(sp);
    return {
      sellingPricePerPerson: sp,
      marginPerPerson: sp.sub(D(s.costPerPerson)),
    };
  });
  return {
    lines,
    costPerPerson: cost,
    sellingPricePerPerson: selling,
    marginPerPerson: selling.sub(cost),
  };
}

export interface OfferLike {
  id: string;
  title: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: MoneyInput;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
}

/** The offer valid on `on` (dates inclusive). Offers of one trip never overlap (enforced on save). */
export function activeOffer<T extends OfferLike>(
  offers: T[],
  on = todayIso(),
): T | null {
  return (
    offers.find(
      (o) => o.isActive && isoDate(o.startsAt) <= on && on <= isoDate(o.endsAt),
    ) ?? null
  );
}

/**
 * Discount for a booking. PERCENTAGE applies to the booking subtotal; FIXED is an amount per
 * person (technical default, see docs/OPEN-DECISIONS.md). Never above the subtotal.
 */
export function discountFor(
  offer: OfferLike | null,
  unitPrice: MoneyInput,
  passengers: number,
): Decimal {
  if (!offer) return D(0);
  const subtotal = D(unitPrice).mul(passengers);
  const raw =
    offer.discountType === 'PERCENTAGE'
      ? subtotal.mul(D(offer.discountValue).div(100))
      : D(offer.discountValue).mul(passengers);
  return Decimal.min(raw, subtotal).toDecimalPlaces(2);
}
