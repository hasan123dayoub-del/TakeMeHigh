import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

/**
 * AES-256-GCM for supplier credentials at rest (INT-03). The key is derived from
 * CREDENTIALS_KEY (or JWT_SECRET as a fallback). Format: base64(iv | tag | ciphertext).
 */
function key(): Buffer {
  const secret = process.env.CREDENTIALS_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error('CREDENTIALS_KEY or JWT_SECRET must be set');
  return createHash('sha256')
    .update(`takemehigh:credentials:${secret}`)
    .digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64');
}

export function decryptSecret(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([
    decipher.update(buf.subarray(28)),
    decipher.final(),
  ]).toString('utf8');
}
