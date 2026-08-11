import { Injectable, NestInterceptor, ExecutionContext, CallHandler, StreamableFile } from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] ?? request.id;

    return next.handle().pipe(
      map((data) => {
        if (data instanceof StreamableFile || Buffer.isBuffer(data)) {
          return data;
        }
        if (data && typeof data === 'object' && 'success' in (data as object)) {
          return data;
        }
        return {
          success: true,
          data,
          meta: {
            timestamp: new Date().toISOString(),
            version: '1.0',
            requestId,
          },
        };
      })
    );
  }
}
