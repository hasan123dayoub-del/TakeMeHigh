import { ApiError } from '@/lib/api';

/** 'YYYY-MM-DD' from an API date ('2026-12-10T00:00:00.000Z') or a day string. */
export function isoDay(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

/** Today in the browser's calendar as 'YYYY-MM-DD'. */
export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Adds whole days to a 'YYYY-MM-DD' day (UTC arithmetic, no time-zone drift). */
export function addDaysIso(day: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return '';
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (both 'YYYY-MM-DD'). */
export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Parses a user-typed decimal ("200,000" / "200000.5"); null when not a number. */
export function parseDecimal(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const s = String(value).replace(/[,\s]/g, '').trim();
  if (!s || !/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

/** Normalises a decimal for the API (max 2 decimals, no separators). */
export function toDecimalString(value: string | number) {
  const n = parseDecimal(value);
  return n === null ? '' : String(Math.round(n * 100) / 100);
}

/**
 * UI ESTIMATE of a service's selling price per person: cost × (1 + profit%).
 * Shown live while editing; the server's figure is authoritative once saved.
 */
export function estimateSelling(cost: number, profitPercent: number) {
  return Math.round(cost * (100 + profitPercent)) / 100;
}

/** True when the error is a network failure (no response from the API). */
export function isNetworkError(err: unknown) {
  return err instanceof ApiError && err.isNetwork;
}

/** Status code of an ApiError, or 0. */
export function errorStatus(err: unknown) {
  return err instanceof ApiError ? err.status : 0;
}
