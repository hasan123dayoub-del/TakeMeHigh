import Decimal from 'decimal.js';

/**
 * All money maths uses decimal.js (never JS floats, PRC-08). Values cross the API as strings with
 * 2 decimals and are stored as NUMERIC(14,2).
 */
Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = Decimal.Value | { toString(): string };

export const D = (v: MoneyInput | null | undefined) =>
  new Decimal(v == null ? 0 : v.toString());
export const toMoney = (v: MoneyInput | null | undefined) => D(v).toFixed(2);

export type Mode = 'PERCENT' | 'FIXED';

/** Profit amount for one person: cost × value% (PERCENT) or the fixed value (FIXED). */
export function profitAmount(
  cost: MoneyInput,
  mode: Mode,
  value: MoneyInput,
): Decimal {
  return mode === 'PERCENT'
    ? D(cost).mul(D(value)).div(100).toDecimalPlaces(2)
    : D(value).toDecimalPlaces(2);
}

/** Selling price of a service = cost + profit (PRC-03). */
export function sellingPrice(
  cost: MoneyInput,
  mode: Mode,
  value: MoneyInput,
): Decimal {
  return D(cost)
    .add(profitAmount(cost, mode, value))
    .toDecimalPlaces(2);
}

/** Discount per person, never more than the price (PRC-05). */
export function discountAmount(
  price: MoneyInput,
  mode: Mode,
  value: MoneyInput,
): Decimal {
  const raw = mode === 'PERCENT' ? D(price).mul(D(value)).div(100) : D(value);
  return Decimal.min(D(price), raw).toDecimalPlaces(2);
}

export const sum = (values: MoneyInput[]) =>
  values.reduce<Decimal>((acc, v) => acc.add(D(v)), new Decimal(0));

export { Decimal };
