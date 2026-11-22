import Decimal from 'decimal.js';

/**
 * All money maths uses decimal.js (never JS floats). Values cross the API as strings with 2 decimals
 * and are stored as NUMERIC(14,2).
 */
Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = Decimal.Value | { toString(): string };

export const D = (v: MoneyInput | null | undefined) =>
  new Decimal(v == null ? 0 : v.toString());
export const toMoney = (v: MoneyInput | null | undefined) => D(v).toFixed(2);

/** Selling price = cost × (1 + profit% / 100), rounded to 2 decimals. */
export function sellingPrice(
  cost: MoneyInput,
  profitPercent: MoneyInput,
): Decimal {
  return D(cost)
    .mul(D(1).add(D(profitPercent).div(100)))
    .toDecimalPlaces(2);
}

export { Decimal };
