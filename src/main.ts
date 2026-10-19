import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // Selalu dipasang: interceptor ini juga menetapkan nama module untuk log.
  // LOG_HTTP hanya menentukan apakah jejak akses ikut ditulis.
  app.useGlobalInterceptors(
    new HttpLoggingInterceptor(logger, config.get<boolean>('log.http') ?? true),
  );

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

  // SWAGGER_HOST=1 -> dokumentasi API di /docs, dan halaman root (/) diarahkan ke sana.
  if (config.get<boolean>('app.swagger')) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Approval KEMVIL')
        .setDescription('Layanan pengiriman dan pemrosesan email approval Purchase Requisition.')
        .setVersion('1.0')
        .build(),
    );
    SwaggerModule.setup('docs', app, document);
  }

  const port = config.get<number>('app.port') ?? 3000;
  await app.listen(port, '0.0.0.0');

  const banner = `Approval KEMVIL (NestJS) berjalan di ${config.get<string>('app.url')} (port ${port})`;
  logger.channel('daily').info(banner);
  // eslint-disable-next-line no-console
  console.log(banner);
}

bootstrap();
