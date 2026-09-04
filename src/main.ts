import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { AppLoggerService } from './common/logger/app-logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Payload email approval bisa besar (daftar lampiran & approval).
    bodyParser: true,
  });

  const config = app.get(ConfigService);
  const logger = app.get(AppLoggerService);
  process.env.TZ = config.get<string>('app.timezone') ?? 'Asia/Jakarta';

  // Semua exception yang lolos dari service tetap tercatat di storage/logs.
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  if (config.get<boolean>('log.http') ?? true) {
    app.useGlobalInterceptors(new HttpLoggingInterceptor(logger));
  }

  process.on('uncaughtException', (err) => {
    logger.channel('daily').error(`uncaughtException: ${err?.message ?? err}`, {
      stack: err?.stack,
    });
  });

  process.on('unhandledRejection', (reason: any) => {
    logger.channel('daily').error(`unhandledRejection: ${reason?.message ?? reason}`, {
      stack: reason?.stack,
    });
  });

  // Form konfirmasi pada email dikirim sebagai application/x-www-form-urlencoded.
  app.useBodyParser('json', { limit: '25mb' });
  app.useBodyParser('urlencoded', { limit: '25mb', extended: true });

  // Aset publik (logo entity, gambar status) - path dipertahankan `public/...`
  // agar url() di template hasil konversi tetap cocok.
  app.useStaticAssets(path.join(process.cwd(), 'public'), { prefix: '/public' });
  app.useStaticAssets(path.join(process.cwd(), 'assets'), { prefix: '/assets' });

  app.enableCors({ origin: true, credentials: true });

  const port = config.get<number>('app.port') ?? 3000;
  await app.listen(port, '0.0.0.0');

  const banner = `Approval BEFA (NestJS) berjalan di ${config.get<string>('app.url')} (port ${port})`;
  logger.channel('daily').info(banner);
  // eslint-disable-next-line no-console
  console.log(banner);
}

bootstrap();
