import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { bootstrapObservability } from './observability';
import { closeSentry } from './observability/sentry';
import { shutdownPostHog } from './observability/posthog';
import { applyHttpSecurity, shouldEnableSwagger } from './common/http-security';
import { assertAuthSecrets } from './modules/auth/auth-secrets';

async function bootstrap() {
  bootstrapObservability();
  const logLevel = (process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === 'production' ? 'log' : 'debug')) as
    'log' | 'error' | 'warn' | 'debug' | 'verbose';
  const loggerLevels: Array<'log' | 'error' | 'warn' | 'debug' | 'verbose'> =
    logLevel === 'debug' || logLevel === 'verbose'
      ? ['error', 'warn', 'log', 'debug']
      : ['error', 'warn', 'log'];
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: loggerLevels,
  });

  assertAuthSecrets();

  // Cap below the old 10 MB PDF HTML DoS ceiling; DTO still enforces 1 MiB html
  app.useBodyParser('json', { limit: '1.5mb' });
  app.useBodyParser('urlencoded', { limit: '1.5mb', extended: true });

  applyHttpSecurity(app);
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? [
      'http://localhost:3000',
      'http://localhost:3003',
    ],
    credentials: true,
  });

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
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  if (shouldEnableSwagger()) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CV Studio AI API')
      .setDescription('REST API production-ready — Auth, CVs, Billing, AI, Marketplace')
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .addTag('Auth')
      .addTag('Users')
      .addTag('CVs')
      .addTag('Templates')
      .addTag('Subscriptions')
      .addTag('Payments')
      .addTag('Invoices')
      .addTag('AI')
      .addTag('Analytics')
      .addTag('Marketplace')
      .addTag('Health')
      .addTag('Geo')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = Number(process.env.PORT ?? 3001);
  app.enableShutdownHooks();
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(
    `API listening on :${port}${shouldEnableSwagger() ? ' — Swagger /docs' : ' — Swagger disabled'}`
  );
}

bootstrap();

process.once('beforeExit', () => {
  void closeSentry();
  void shutdownPostHog();
});
