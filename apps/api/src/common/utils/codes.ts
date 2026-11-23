import type { Tx } from '../../prisma/prisma.service';

/**
 * Gap-free yearly sequences (PAY-03, BKG-04). The upsert takes a row lock, so two transactions can
 * never receive the same number; a rolled-back transaction also rolls back its increment.
 */
export async function nextNumber(
  tx: Tx,
  prefix: string,
  digits = 6,
  at = new Date(),
): Promise<string> {
  const year = at.getUTCFullYear();
  const key = `${prefix}-${year}`;
  const rows = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO number_sequences (key, value) VALUES (${key}, 1)
    ON CONFLICT (key) DO UPDATE SET value = number_sequences.value + 1
    RETURNING value`;
  return `${prefix}-${year}-${String(rows[0].value).padStart(digits, '0')}`;
}

/** BK-2026-000123 */
export const bookingNumber = (tx: Tx) => nextNumber(tx, 'BK');
/** RCP-2026-000045 */
export const receiptNumber = (tx: Tx) => nextNumber(tx, 'RCP');
/** REQ-2026-0007 */
export const requestNumber = (tx: Tx) => nextNumber(tx, 'REQ', 4);
/** TR-2026-0012 */
export const tripCode = (tx: Tx) => nextNumber(tx, 'TR', 4);
/** PG-2026-0003 */
export const programCode = (tx: Tx) => nextNumber(tx, 'PG', 4);
