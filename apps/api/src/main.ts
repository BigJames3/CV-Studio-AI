import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { httpLoggingMiddleware } from './common/middleware/http-logging.middleware';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { bootstrapObservability } from './observability';
import { isJsonLogFormat, JsonLogger, logLevelsFromEnv } from './observability/json-logger';
import { closeSentry } from './observability/sentry';
import { shutdownPostHog } from './observability/posthog';
import { applyHttpSecurity, shouldEnableSwagger } from './common/http-security';
import { assertAuthSecrets } from './modules/auth/auth-secrets';

async function bootstrap() {
  // LOG_FORMAT=json: one JSON object per line, from the very first log (Sentry/PostHog init).
  const jsonLogger = isJsonLogFormat() ? new JsonLogger() : null;
  if (jsonLogger) Logger.overrideLogger(jsonLogger);
  bootstrapObservability();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: jsonLogger ?? logLevelsFromEnv(),
  });

  assertAuthSecrets();

  // Cap below the old 10 MB PDF HTML DoS ceiling; DTO still enforces 1 MiB html
  app.useBodyParser('json', { limit: '1.5mb' });
  app.useBodyParser('urlencoded', { limit: '1.5mb', extended: true });

  applyHttpSecurity(app);
  // Before Nest's router, so 401/403/429/404 responses are logged with a request id too.
  app.use(requestIdMiddleware, httpLoggingMiddleware);
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
  app.useGlobalInterceptors(new TransformInterceptor());

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
  new Logger('Bootstrap').log(
    `API listening on :${port}${shouldEnableSwagger() ? ' — Swagger /docs' : ' — Swagger disabled'}`
  );
}

bootstrap();

process.once('beforeExit', () => {
  void closeSentry();
  void shutdownPostHog();
});
