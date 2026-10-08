import { maskEmail, smtpTransportOptions } from './mail.service';

describe('mail helpers', () => {
  it('masks the local part of an address', () => {
    expect(maskEmail('ada.lovelace@example.com')).toBe('a***@example.com');
    expect(maskEmail('not-an-address')).toBe('***');
  });

  it('verifies certificates and authenticates in production', () => {
    const options = smtpTransportOptions({
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '465',
      SMTP_SECURE: 'true',
      SMTP_USER: 'user',
      SMTP_PASS: 'pass',
    });
    expect(options).toMatchObject({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: { user: 'user', pass: 'pass' },
      tls: { rejectUnauthorized: true },
    });
  });

  it('keeps the local mail catcher working without credentials', () => {
    const options = smtpTransportOptions({ NODE_ENV: 'development' });
    expect(options).toMatchObject({ host: 'localhost', port: 1025, secure: false });
    expect(options).not.toHaveProperty('auth');
    expect(options.tls.rejectUnauthorized).toBe(false);
  });
});
