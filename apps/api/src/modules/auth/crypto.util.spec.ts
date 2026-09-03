import { encryptOauthToken, decryptOauthToken, encryptUtf8, decryptUtf8 } from './crypto.util';

describe('crypto.util', () => {
  it('round-trips AES-GCM encryption', () => {
    const plain = 'JBSWY3DPEHPK3PXP';
    const enc = encryptUtf8(plain);
    expect(Buffer.isBuffer(enc)).toBe(true);
    expect(decryptUtf8(enc)).toBe(plain);
  });

  it('encrypts OAuth tokens so ciphertext is not plaintext', () => {
    const plaintext = 'ya29.super-secret-oauth-token-123456789';
    const encrypted = encryptOauthToken(plaintext);
    expect(encrypted.toString('utf8')).not.toBe(plaintext);
    expect(decryptOauthToken(encrypted)).toBe(plaintext);
  });

  it('reads legacy plaintext OAuth rows', () => {
    const legacy = Buffer.from('pk_live_secret_token', 'utf8');
    expect(decryptOauthToken(legacy)).toBe('pk_live_secret_token');
  });
});
