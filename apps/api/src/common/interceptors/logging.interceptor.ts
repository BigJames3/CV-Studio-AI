import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const userId = req.user?.id ?? '-';
    const started = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - started;
          this.logger.log(`${method} ${url} ${ms}ms user=${userId}`);
        },
        error: (err: Error) => {
          const ms = Date.now() - started;
          this.logger.warn(`${method} ${url} ${ms}ms user=${userId} err=${err.message}`);
        },
      })
    );
  }
}
