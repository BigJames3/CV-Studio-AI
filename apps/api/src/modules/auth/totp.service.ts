import { Injectable } from '@nestjs/common';
import * as OTPAuth from 'otpauth';
import * as QRCode from 'qrcode';

@Injectable()
export class TotpService {
  generateSecret(email: string): { secret: string; uri: string } {
    const totp = new OTPAuth.TOTP({
      issuer: 'CV Studio AI',
      label: email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: new OTPAuth.Secret({ size: 20 }),
    });
    return { secret: totp.secret.base32, uri: totp.toString() };
  }

  verify(secretBase32: string, token: string): boolean {
    const totp = new OTPAuth.TOTP({
      issuer: 'CV Studio AI',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });
    const delta = totp.validate({ token: token.replace(/\s/g, ''), window: 1 });
    return delta !== null;
  }

  async qrDataUrl(uri: string): Promise<string> {
    return QRCode.toDataURL(uri, { margin: 1, width: 220 });
  }
}
