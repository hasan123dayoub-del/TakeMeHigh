import { randomInt } from 'crypto';

// No 0/O/1/I so codes are easy to read over the phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const random = (n: number) =>
  Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join(
    '',
  );

/** Booking reference, unique per office (DB unique index; callers retry on the rare collision). e.g. SF-26-7KQ4ZD */
export const bookingReference = (d = new Date()) =>
  `SF-${String(d.getUTCFullYear()).slice(2)}-${random(6)}`;

/** Cash receipt number, unique per office. e.g. RC-261122-9XK4 */
export const receiptNumber = (d = new Date()) =>
  `RC-${d.toISOString().slice(2, 10).replace(/-/g, '')}-${random(4)}`;
