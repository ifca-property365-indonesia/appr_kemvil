import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { currentLogModule, currentRequestId } from './log-context';

/**
 * Padanan `Log::channel('nama')->info(...)` milik Laravel.
 *
 * Tata letak file:
 *   storage/logs/<channel>-YYYY-MM-DD/<module>.log
 *
 * contoh: storage/logs/approval-2026-09-10/land_verification.log
 *         storage/logs/daily-2026-09-10/cb_ppu.log
 *
 * Nama module diambil dari AsyncLocalStorage (lihat `log-context.ts`) sehingga
 * setiap pemanggilan log otomatis masuk ke berkas module yang sesuai.
 *
 * Channel pada `FLAT_CHANNELS` dikecualikan dan tetap satu berkas per hari,
 * karena isinya lintas module.
 */
const FLAT_CHANNELS = new Set(['request']);

const TRANSACTION_CHANNEL = 'transaction';

/**
 * Jenis transaksi:
 *   TERIMA_MAILDATA - request /api/maildata dari SP
 *   EMAIL_APPROVAL  - email permintaan approval ke approver
 *   EMAIL_FEEDBACK  - email hasil akhir ke pembuat PR
 *   SMTP            - pengiriman ke server SMTP
 *   KONFIRMASI      - approver membuka link di email
 *   APPROVAL        - approver submit Approve/Revise/Reject
 *   EXEC_SP         - eksekusi stored procedure
 */
export type TransactionAction =
  | 'TERIMA_MAILDATA'
  | 'EMAIL_APPROVAL'
  | 'EMAIL_FEEDBACK'
  | 'SMTP'
  | 'KONFIRMASI'
  | 'APPROVAL'
  | 'EXEC_SP';

/** LEWAT = sengaja tidak diproses (sudah terkirim, tanpa penerima); DITOLAK = link tidak berlaku. */
export type TransactionStage = 'MULAI' | 'SUKSES' | 'GAGAL' | 'LEWAT' | 'DITOLAK';

/** Pola direktori log harian, dipakai saat membersihkan log lama. */
const DATED_DIR = /^(.+)-(\d{4}-\d{2}-\d{2})$/;

@Injectable()
export class AppLoggerService implements OnModuleInit, OnModuleDestroy {
  private readonly loggers = new Map<string, { logger: winston.Logger; date: string }>();
  private readonly level: string;
  private readonly logDir: string;
  private readonly retentionDays: number;
  private pruneTimer?: NodeJS.Timeout;

  constructor(config: ConfigService) {
    this.level = config.get<string>('log.level') ?? 'debug';
    this.retentionDays = config.get<number>('log.retentionDays') ?? 30;
    this.logDir = path.join(process.cwd(), 'storage', 'logs');
  }

  onModuleInit(): void {
    this.prune();
    // Bersihkan sekali sehari; transport File tidak punya rotasi bawaan.
    this.pruneTimer = setInterval(() => this.prune(), 24 * 60 * 60 * 1000);
    this.pruneTimer.unref?.();
  }

  channel(name = 'daily'): winston.Logger {
    const flat = FLAT_CHANNELS.has(name);
    const module = flat ? '' : currentLogModule();
    const date = today();
    const key = flat ? name : `${name}/${module}`;

    const cached = this.loggers.get(key);
    // Saat berganti hari, logger lama ditutup supaya menulis ke folder baru.
    if (cached && cached.date === date) return cached.logger;
    if (cached) cached.logger.close();

    const logger = winston.createLogger({
      level: this.level,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const extra = Object.keys(meta).length ? ` ${safeStringify(meta)}` : '';
          const label = flat ? name : `${name}.${module}`;
          // Dibaca saat menulis (bukan saat logger dibuat) karena logger di-cache lintas request.
          const requestId = currentRequestId();
          const rid = requestId ? ` [${requestId}]` : '';
          return `[${timestamp}]${rid} ${label}.${level.toUpperCase()}: ${message}${extra}`;
        }),
      ),
      transports: [flat ? this.flatTransport(name) : this.moduleTransport(name, module, date)],
    });

    if ((process.env.APP_ENV ?? 'production') !== 'production') {
      logger.add(new winston.transports.Console({ format: winston.format.simple() }));
    }

    this.loggers.set(key, { logger, date });
    return logger;
  }

  /** `storage/logs/<channel>-YYYY-MM-DD.log` - satu berkas lintas module. */
  private flatTransport(name: string): winston.transport {
    return new winston.transports.DailyRotateFile({
      dirname: this.logDir,
      filename: `${name}-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxFiles: `${this.retentionDays}d`,
      zippedArchive: false,
    });
  }

  /** `storage/logs/<channel>-YYYY-MM-DD/<module>.log` */
  private moduleTransport(name: string, module: string, date: string): winston.transport {
    const dirname = path.join(this.logDir, `${name}-${date}`);
    fs.mkdirSync(dirname, { recursive: true });
    return new winston.transports.File({ dirname, filename: `${module}.log` });
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

  /**
   * Log transaksi -> `storage/logs/transaction-YYYY-MM-DD/<module>.log`.
   *
   * Satu baris per tahap transaksi (kirim email, SMTP, konfirmasi, approval,
   * exec SP) dengan format seragam supaya seluruh jejak satu dokumen dapat
   * dicari dengan grep doc_no atau id request:
   *
   *   [..] [a1b2c3d4] transaction.po_request.INFO: EXEC_SP SUKSES mgr.x_send_... {...}
   */
  transaction(
    action: TransactionAction,
    stage: TransactionStage,
    message: string,
    meta?: Record<string, unknown>,
  ): void {
    const level = stage === 'GAGAL' ? 'error' : stage === 'LEWAT' || stage === 'DITOLAK' ? 'warn' : 'info';
    this.channel(TRANSACTION_CHANNEL)[level](`${action} ${stage} ${message}`, meta);
  }

  /** Hapus folder log harian yang lebih tua dari `log.retentionDays`. */
  prune(): void {
    if (this.retentionDays <= 0) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(this.logDir, { withFileTypes: true });
    } catch {
      return; // folder log belum ada
    }

    const batas = Date.now() - this.retentionDays * 86400000;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const match = DATED_DIR.exec(entry.name);
      if (!match) continue;

      const waktu = Date.parse(`${match[2]}T00:00:00`);
      if (!Number.isFinite(waktu) || waktu >= batas) continue;

      try {
        fs.rmSync(path.join(this.logDir, entry.name), { recursive: true, force: true });
      } catch {
        /* diabaikan - akan dicoba lagi besok */
      }
    }
  }

  onModuleDestroy(): void {
    if (this.pruneTimer) clearInterval(this.pruneTimer);
    this.loggers.forEach(({ logger }) => logger.close());
    this.loggers.clear();
  }
}

function today(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
