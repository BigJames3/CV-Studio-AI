import { smtpOptionsFromEnv, SMTP_TIMEOUTS } from './mail.service';

describe('smtpOptionsFromEnv', () => {
  it('local Mailpit: no auth, no TLS verification outside production, bounded timeouts', () => {
    expect(smtpOptionsFromEnv({ NODE_ENV: 'development' })).toEqual({
      host: 'localhost',
      port: 1025,
      secure: false,
      auth: undefined,
      tls: { rejectUnauthorized: false },
      ...SMTP_TIMEOUTS,
    });
  });

  it('production verifies the SMTP certificate', () => {
    expect(
      smtpOptionsFromEnv({ NODE_ENV: 'production', SMTP_HOST: 'smtp.example.com' }).tls
    ).toEqual({ rejectUnauthorized: true });
  });

  it('authenticates when SMTP_USER is set (SES, SendGrid...)', () => {
    const options = smtpOptionsFromEnv({
      NODE_ENV: 'production',
      SMTP_HOST: 'email-smtp.eu-west-1.amazonaws.com',
      SMTP_PORT: '587',
      SMTP_USER: 'AKIAEXAMPLE',
      SMTP_PASS: 'secret',
    });
    expect(options).toMatchObject({
      port: 587,
      secure: false, // STARTTLS on 587
      auth: { user: 'AKIAEXAMPLE', pass: 'secret' },
    });
  });

  it('uses implicit TLS on 465 or when SMTP_SECURE=true', () => {
    expect(smtpOptionsFromEnv({ SMTP_PORT: '465' }).secure).toBe(true);
    expect(smtpOptionsFromEnv({ SMTP_PORT: '2465', SMTP_SECURE: 'true' }).secure).toBe(true);
  });

  it('never waits more than 10 s for a connection or greeting', () => {
    expect(SMTP_TIMEOUTS.connectionTimeout).toBeLessThanOrEqual(10_000);
    expect(SMTP_TIMEOUTS.greetingTimeout).toBeLessThanOrEqual(10_000);
  });
});
