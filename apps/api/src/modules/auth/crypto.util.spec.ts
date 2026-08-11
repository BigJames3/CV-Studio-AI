import { encryptUtf8, decryptUtf8 } from './crypto.util';

describe('crypto.util', () => {
  it('round-trips AES-GCM encryption', () => {
    const plain = 'JBSWY3DPEHPK3PXP';
    const enc = encryptUtf8(plain);
    expect(Buffer.isBuffer(enc)).toBe(true);
    expect(decryptUtf8(enc)).toBe(plain);
  });
});
