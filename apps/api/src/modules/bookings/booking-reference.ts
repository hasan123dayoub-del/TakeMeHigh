import { randomInt } from 'crypto';

// No 0/O/1/I to keep references easy to read over the phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** e.g. TOS-26-4KQ7ZD. Unique per agency (enforced by a unique index; callers retry on collision). */
export function bookingReference(date = new Date()): string {
  let code = '';
  for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return `TOS-${String(date.getUTCFullYear()).slice(2)}-${code}`;
}
