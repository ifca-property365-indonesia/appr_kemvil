import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { maskEmail } from '../helpers/redact.helper';
import { AppLoggerService } from '../logger/app-logger.service';
import { ViewService } from '../view/view.service';
import { SmtpConfigService } from './smtp-config.service';

export interface SendMailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  /** Nama view gaya Laravel, contoh: `email.cmentry.send` */
  view: string;
  /** Data yang dilempar ke view (padanan `->with([...])`) */
  data?: Record<string, any>;
  /**
   * Nama pengirim. Bila kosong akan memakai pola Mailable lama:
   *   MAIL_FROM_NAME + ' - ' + entity_name
   */
  fromName?: string;
  /** Dipakai untuk memilih konfigurasi SMTP per entity. */
  entityCd?: string;
  /** Dipakai untuk menyusun fromName default. */
  entityName?: string;
  /** Field penelusuran yang ikut ditulis ke log transaksi SMTP (doc_no, entity_cd, ...). */
  logContext?: Record<string, unknown>;
}

/**
 * Padanan `Mail::to(...)->cc(...)->bcc(...)->send(new XxxMail(...))`.
 *
 * Setiap Mailable pada project lama hanya melakukan tiga hal:
 *   from(config('mail.from.address'), $fromName) - subject(...) - view(...)->with(...)
 * sehingga semuanya diringkas menjadi satu service ini.
 */
@Injectable()
export class MailService {
  private readonly transporters = new Map<string, Transporter>();

  /** MAIL_USE_DB_SMTP=true untuk memakai mgr.smtp_configuration per entity. */
  private get useDbSmtp(): boolean {
    return String(process.env.MAIL_USE_DB_SMTP ?? '').toLowerCase() === 'true';
  }

  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
    private readonly view: ViewService,
    private readonly smtpConfig: SmtpConfigService,
  ) {}

  async send(options: SendMailOptions): Promise<void> {
    const mailConfig = this.config.get('mail');

    // Project Laravel selalu memakai kredensial .env (SmtpConfigService ada tapi
    // tidak pernah dipanggil). Aktifkan MAIL_USE_DB_SMTP=true bila ingin
    // konfigurasi per entity dari tabel mgr.smtp_configuration dipakai.
    const smtp = this.useDbSmtp
      ? await this.smtpConfig.getConfigByEntity(options.entityCd)
      : null;

    const host = smtp?.host || mailConfig.host;
    const port = Number(smtp?.port ?? mailConfig.port) || 587;
    const encryption = (smtp?.encryption ?? mailConfig.encryption ?? '').toLowerCase();
    const username = smtp?.username || mailConfig.username;
    const password = smtp?.password || mailConfig.password;

    // FROM: fallback config memakai .env, config asli entity memakai nilai DB.
    const fromAddress =
      smtp && smtp.is_fallback === false
        ? (smtp.from_address ?? mailConfig.from.address)
        : mailConfig.from.address;
    const baseFromName =
      smtp && smtp.is_fallback === false
        ? (smtp.from_name ?? mailConfig.from.name)
        : mailConfig.from.name;

    const fromName =
      options.fromName ??
      (options.entityName ? `${baseFromName} - ${options.entityName}` : baseFromName);

    const to = normalizeAddresses(options.to);
    const cc = normalizeAddresses(options.cc);
    const bcc = normalizeAddresses(options.bcc);
    const meta: Record<string, unknown> = {
      ...options.logContext,
      host: `${host}:${port}`,
      to: maskList(to),
      cc: maskList(cc),
      bcc: maskList(bcc),
      subject: options.subject,
      view: options.view,
    };

    this.logger.transaction('SMTP', 'MULAI', options.subject, meta);
    const started = Date.now();

    try {
      const html = this.view.render(options.view, options.data ?? {});
      const transporter = this.transporter({ host, port, encryption, username, password });

      const info = await transporter.sendMail({
        from: { address: fromAddress, name: fromName },
        to,
        cc,
        bcc,
        subject: options.subject,
        html,
      });

      this.logger.transaction('SMTP', 'SUKSES', options.subject, {
        ...meta,
        messageId: info?.messageId,
        accepted: maskList(info?.accepted),
        rejected: maskList(info?.rejected),
        response: info?.response,
        durationMs: Date.now() - started,
      });
    } catch (err: any) {
      this.logger.transaction('SMTP', 'GAGAL', `${options.subject}: ${err?.message ?? err}`, {
        ...meta,
        code: err?.code,
        response: err?.response,
        durationMs: Date.now() - started,
      });
      throw err;
    }
  }

  /** Render view tanpa mengirim email (dipakai untuk preview/debug). */
  render(view: string, data: Record<string, any> = {}): string {
    return this.view.render(view, data);
  }

  private transporter(input: {
    host: string;
    port: number;
    encryption: string;
    username: string;
    password: string;
  }): Transporter {
    const key = `${input.host}:${input.port}:${input.username}:${input.encryption}`;
    const cached = this.transporters.get(key);
    if (cached) return cached;

    const secure = input.encryption === 'ssl' || input.port === 465;

    const transporter = nodemailer.createTransport({
      host: input.host,
      port: input.port,
      secure,
      requireTLS: !secure && input.encryption === 'tls',
      auth: input.username ? { user: input.username, pass: input.password } : undefined,
      tls: { rejectUnauthorized: false },
      pool: true,
      maxConnections: 3,
    });

    this.transporters.set(key, transporter);
    this.logger
      .channel('daily')
      .info(`SMTP transport dibuat untuk ${input.host}:${input.port} (secure=${secure})`);

    return transporter;
  }
}

/** Alamat untuk log: disamarkan, `accepted`/`rejected` nodemailer bisa berupa objek Address. */
function maskList(list?: Array<string | { address?: string }>): string[] | undefined {
  if (!list || list.length === 0) return undefined;
  return list.map((item) => maskEmail(typeof item === 'string' ? item : item?.address));
}

function normalizeAddresses(value?: string | string[]): string[] | undefined {
  if (value === undefined || value === null) return undefined;

  const list = (Array.isArray(value) ? value : [value])
    .flatMap((item) => String(item ?? '').split(/[;,]/))
    .map((item) => item.trim())
    .filter((item) => item !== '');

  return list.length > 0 ? Array.from(new Set(list)) : undefined;
}
