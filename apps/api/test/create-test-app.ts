import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { applyHttpSecurity } from '../src/common/http-security';

const CINETPAY_HOST = 'api-checkout.cinetpay.com';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: new Headers(),
  } as unknown as Response;
}

/**
 * Prevent e2e suites from calling the real CinetPay API.
 * Skipped when a Jest mock is already installed (cinetpay-flow.e2e-spec).
 */
function stubCinetpayFetch() {
  const current = global.fetch as typeof fetch & { mock?: unknown };
  if (typeof current === 'function' && current.mock) return;

  const original = global.fetch;
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes(CINETPAY_HOST)) {
      if (url.includes('/v2/payment/check')) {
        return jsonResponse({ data: { status: 'WAITING' } });
      }
      return jsonResponse({
        code: '201',
        message: 'CREATED',
        data: { payment_url: 'https://checkout.cinetpay.com/payment/stub' },
      });
    }
    return original(input, init);
  }) as typeof fetch;
}

export async function createTestApp(opts?: {
  enableTwoFactor?: boolean;
}): Promise<INestApplication> {
  process.env.NODE_ENV = 'test';
  process.env.AUTH_RATE_LIMIT_DISABLED = 'true';
  process.env.ENABLE_TWO_FACTOR = opts?.enableTwoFactor ? 'true' : 'false';
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ?? 'test-access-secret-min-32-characters!!';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret-min-32-characters!';
  process.env.ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY ?? 'test-encryption-key-min-32-characters!!';
  stubCinetpayFetch();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>({ rawBody: true });
  applyHttpSecurity(app);
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.init();
  return app;
}
