import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function encryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? process.env.JWT_ACCESS_SECRET ?? 'dev-encryption-key';
  return createHash('sha256').update(raw).digest();
}

/** AES-256-GCM: iv (12) || tag (16) || ciphertext */
export function encryptUtf8(plain: string): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]);
}

export function decryptUtf8(payload: Buffer): string {
  if (payload.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Invalid ciphertext');
  }
  const iv = payload.subarray(0, IV_LEN);
  const tag = payload.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = payload.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
