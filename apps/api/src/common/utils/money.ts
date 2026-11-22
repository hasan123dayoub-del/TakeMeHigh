import Decimal from 'decimal.js';
import { ValueTransformer } from 'typeorm';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/** Money is stored as DECIMAL(12,2) and handled as a string in JS, never as a float. */
export const moneyTransformer: ValueTransformer = {
  to: (value?: string | number | null) =>
    value === undefined || value === null ? value : new Decimal(value).toFixed(2),
  from: (value: string | null) => (value === null ? null : new Decimal(value).toFixed(2)),
};

export const money = (value: Decimal.Value) => new Decimal(value);
export const toMoney = (value: Decimal.Value) => new Decimal(value).toFixed(2);
export { Decimal };
