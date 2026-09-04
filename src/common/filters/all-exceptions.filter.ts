import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { describeRequest } from '../http/http-log.util';
import { AppLoggerService } from '../logger/app-logger.service';

/**
 * Menangkap seluruh exception yang lolos dari `try/catch` di service - error
 * pada controller, route tidak dikenal (404), kegagalan render view, dsb.
 *
 * Tanpa filter ini Nest memakai handler bawaan yang hanya menulis ke stdout,
 * sehingga error tersebut tidak pernah masuk ke `storage/logs`.
 *
 * Bentuk response dipertahankan sama seperti handler bawaan Nest supaya tidak
 * ada perubahan perilaku pada klien.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') return;

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof Error ? exception.message : String(exception);
    const meta = { ...describeRequest(request), status };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.channel('daily').error(`Unhandled ${status} ${meta.method} ${meta.url}: ${message}`, {
        ...meta,
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    } else {
      this.logger.channel('daily').warn(`HTTP ${status} ${meta.method} ${meta.url}: ${message}`, meta);
    }

    if (response.headersSent) return;

    const body = isHttpException
      ? exception.getResponse()
      : { statusCode: status, message: 'Internal server error' };

    // Beberapa route memasang `@Header('Content-Type', 'text/html')`; pada jalur
    // error isinya JSON sehingga header perlu disesuaikan kembali.
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response
      .status(status)
      .json(typeof body === 'string' ? { statusCode: status, message: body } : body);
  }
}
