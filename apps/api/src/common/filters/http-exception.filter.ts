import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { captureServerEvent } from '../../lib/analytics/posthog-server';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const obj = body as Record<string, unknown>;
        message = (obj.message as string) ?? message;
        code = (obj.error as string) ?? (obj.code as string) ?? HttpStatus[status] ?? code;
        details = obj.details ?? (Array.isArray(obj.message) ? obj.message : undefined);
        if (Array.isArray(obj.message)) {
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
          details = obj.message;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack, requestId);
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const userId = (request as Request & { user?: { id?: string } }).user?.id;
      const err = exception instanceof Error ? exception : new Error(String(exception));
      captureServerEvent(userId || 'anonymous', 'error_occurred', {
        error: err.message.slice(0, 500),
        context: request.url,
        status,
      });
    }

    response.status(status).json({
      success: false,
      error: { code, message, details },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId,
        path: request.url,
      },
    });
  }
}
