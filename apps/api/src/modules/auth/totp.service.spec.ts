import { TotpService } from './totp.service';
import * as OTPAuth from 'otpauth';

describe('TotpService', () => {
  const service = new TotpService();

  it('generates a secret and verifies a live TOTP code', async () => {
    const { secret, uri } = service.generateSecret('lea@example.com');
    expect(secret.length).toBeGreaterThan(10);
    expect(uri).toContain('otpauth://totp/');

    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
    const code = totp.generate();
    expect(service.verify(secret, code)).toBe(true);
    expect(service.verify(secret, '000000')).toBe(false);

    const qr = await service.qrDataUrl(uri);
    expect(qr.startsWith('data:image/png;base64,')).toBe(true);
  });
});
