import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const userId = req.user?.id ?? '-';
    const requestId = (req.headers['x-request-id'] as string) || '-';
    const started = Date.now();
    const jsonLogs = process.env.LOG_FORMAT === 'json';

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - started;
          if (jsonLogs) {
            this.logger.log(JSON.stringify({ msg: 'http', method, url, ms, userId, requestId }));
          } else {
            this.logger.log(`${method} ${url} ${ms}ms user=${userId} requestId=${requestId}`);
          }
        },
        error: (err: Error) => {
          const ms = Date.now() - started;
          if (jsonLogs) {
            this.logger.warn(
              JSON.stringify({
                msg: 'http_error',
                method,
                url,
                ms,
                userId,
                requestId,
                err: err.message,
              })
            );
          } else {
            this.logger.warn(
              `${method} ${url} ${ms}ms user=${userId} requestId=${requestId} err=${err.message}`
            );
          }
        },
      })
    );
  }
}
