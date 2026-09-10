import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { describeRequest } from '../http/http-log.util';
import { AppLoggerService } from '../logger/app-logger.service';
import { logModuleFromClass, runWithLogModule } from '../logger/log-context';

/**
 * Dua tugas:
 *
 *  1. Menetapkan nama module untuk seluruh log di dalam satu request, diambil
 *     dari nama controller (`LandVerificationController` -> `land_verification`).
 *     Base service approval menimpanya dengan nama yang lebih tepat bila perlu,
 *     misalnya request ke `/api/maildata` yang diteruskan ke module tertentu.
 *
 *  2. Jejak akses -> `storage/logs/request-YYYY-MM-DD.log` (satu berkas, lintas
 *     module) bila `LOG_HTTP` aktif. Hanya metadata: body sengaja TIDAK ditulis
 *     karena memuat data dokumen dan alamat email approver.
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly logRequests = true,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    // `getClass()` mengembalikan kelas controller-nya, jadi dipakai langsung
    // sebagai `constructor` supaya nama kelas terbaca.
    const module = logModuleFromClass({ constructor: context.getClass() } as object);
    const started = Date.now();
    const meta = describeRequest(request);
    const handler = `${context.getClass().name}.${context.getHandler().name}`;

    // Handler dijalankan saat observable di-subscribe, sehingga subscribe harus
    // berada DI DALAM runWithLogModule agar konteksnya ikut terbawa.
    return new Observable((subscriber) =>
      runWithLogModule(module, () =>
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => {
            this.write('warn', `${meta.method} ${meta.url} ERROR ${Date.now() - started}ms: ${err?.message ?? err}`, { ...meta, handler });
            subscriber.error(err);
          },
          complete: () => {
            this.write('info', `${meta.method} ${meta.url} ${response.statusCode} ${Date.now() - started}ms`, { ...meta, handler });
            subscriber.complete();
          },
        }),
      ),
    );
  }

  private write(level: 'info' | 'warn', message: string, meta: Record<string, unknown>): void {
    if (!this.logRequests) return;
    this.logger.channel('request')[level](message, meta);
  }
}
