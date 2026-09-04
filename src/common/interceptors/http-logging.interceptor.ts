import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { describeRequest } from '../http/http-log.util';
import { AppLoggerService } from '../logger/app-logger.service';

/**
 * Jejak akses seluruh endpoint -> `storage/logs/request-YYYY-MM-DD.log`.
 *
 * Hanya metadata request yang dicatat (method, url, ip, user agent, durasi,
 * status). Body sengaja TIDAK ditulis karena memuat data dokumen dan alamat
 * email approver.
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const started = Date.now();
    const meta = describeRequest(request);
    const handler = `${context.getClass().name}.${context.getHandler().name}`;

    return next.handle().pipe(
      tap({
        next: () =>
          this.logger
            .channel('request')
            .info(
              `${meta.method} ${meta.url} ${response.statusCode} ${Date.now() - started}ms`,
              { ...meta, handler },
            ),
        error: (err: any) =>
          this.logger
            .channel('request')
            .warn(
              `${meta.method} ${meta.url} ERROR ${Date.now() - started}ms: ${err?.message ?? err}`,
              { ...meta, handler },
            ),
      }),
    );
  }
}
