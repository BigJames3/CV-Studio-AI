import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

/**
 * Trust proxy only when explicitly configured.
 * Enabling this without a real reverse proxy makes X-Forwarded-For spoofable.
 */
export function applyTrustProxy(app: NestExpressApplication): void {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw || raw === 'false' || raw === '0') return;
  if (raw === 'true') {
    app.set('trust proxy', 1);
    return;
  }
  const hops = Number(raw);
  if (Number.isInteger(hops) && hops >= 0) {
    app.set('trust proxy', hops);
    return;
  }
  app.set(
    'trust proxy',
    raw.split(',').map((s) => s.trim())
  );
}

export function applyHttpSecurity(app: NestExpressApplication): void {
  applyTrustProxy(app);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
        },
      },
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );
  app.use(cookieParser());
}

export function shouldEnableSwagger(): boolean {
  if (process.env.ENABLE_SWAGGER === 'true') return true;
  if (process.env.ENABLE_SWAGGER === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}
