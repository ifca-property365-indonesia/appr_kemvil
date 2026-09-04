import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

/**
 * Padanan `Log::channel('nama')->info(...)` milik Laravel.
 *
 * Channel yang dipakai project lama:
 *   - daily (default)      - sendmail
 *   - sendmailapproval     - sendmailfeedback
 *   - resend               - resend_apprlist
 *
 * Setiap channel ditulis ke storage/logs/<channel>-YYYY-MM-DD.log
 */
@Injectable()
export class AppLoggerService implements OnModuleDestroy {
  private readonly loggers = new Map<string, winston.Logger>();
  private readonly level: string;
  private readonly logDir: string;

  constructor(config: ConfigService) {
    this.level = config.get<string>('log.level') ?? 'debug';
    this.logDir = path.join(process.cwd(), 'storage', 'logs');
  }

  channel(name = 'daily'): winston.Logger {
    const existing = this.loggers.get(name);
    if (existing) return existing;

    const logger = winston.createLogger({
      level: this.level,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const extra = Object.keys(meta).length ? ` ${safeStringify(meta)}` : '';
          return `[${timestamp}] ${name}.${level.toUpperCase()}: ${message}${extra}`;
        }),
      ),
      transports: [
        new winston.transports.DailyRotateFile({
          dirname: this.logDir,
          filename: `${name}-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          maxFiles: '30d',
          zippedArchive: false,
        }),
      ],
    });

    if ((process.env.APP_ENV ?? 'production') !== 'production') {
      logger.add(new winston.transports.Console({ format: winston.format.simple() }));
    }

    this.loggers.set(name, logger);
    return logger;
  }

  /** Alias `Log::info()` (channel default). */
  info(message: string, meta?: Record<string, unknown>): void {
    this.channel('daily').info(message, meta);
  }

  warning(message: string, meta?: Record<string, unknown>): void {
    this.channel('daily').warn(message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.channel('daily').error(message, meta);
  }

  onModuleDestroy(): void {
    this.loggers.forEach((logger) => logger.close());
    this.loggers.clear();
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
