import { Injectable } from '@nestjs/common';
import { MailCacheService } from '../cache/mail-cache.service';
import { maskEmail } from '../helpers/redact.helper';
import { AppLoggerService, TransactionAction } from '../logger/app-logger.service';
import { MailService } from './mail.service';

export interface GuardedSendOptions {
  /** Nilai `email_addr` apa adanya (boleh dipisah `;`). */
  emailAddr: any;
  /** Sub folder cache, contoh: `send_cmentry` (tanggal ditambahkan otomatis). */
  cacheDir: string;
  /** Bagian nama file penanda, contoh: [approve_seq, entity_cd, doc_no, level_no]. */
  cacheKeyParts: any[];
  /** Prefix nama file penanda. */
  cachePrefix?: 'email_sent_' | 'email_feedback_sent_' | string;
  /** Tanggal folder cache (`date('Ymd')`); default hari ini. */
  cacheDate?: string;
  /** Nama view email. */
  view: string;
  subject: string;
  data: Record<string, any>;
  entityCd?: string;
  entityName?: string;
  fromName?: string;
  cc?: string | string[];
  bcc?: string | string[];
  /** Kirim satu email per alamat (dipakai `feedback_land_request`). */
  perRecipient?: boolean;
  /** Channel log sukses, default `sendmailapproval`. */
  logChannel?: string;
  /** Label pada pesan log, contoh: `Email CM Entry`. */
  logLabel: string;
  docNo?: any;
  entityCdForLog?: any;
  /** Jenis transaksi pada log `transaction`, default `EMAIL_APPROVAL`. */
  trxAction?: TransactionAction;
  /** Field penelusuran tambahan untuk log transaksi (level_no, user_id, ...). */
  logContext?: Record<string, unknown>;
}

export interface GuardedSendResult {
  sent: boolean;
  alreadySent: boolean;
  noRecipient: boolean;
  recipients: string[];
  message: string;
  error?: Error;
}

/**
 * Membungkus pola yang berulang di seluruh controller Laravel:
 *
 *   cek email_addr -> siapkan file penanda -> kunci -> kirim bila belum ada
 *   penanda -> tulis penanda -> tulis log.
 */
@Injectable()
export class ApprovalMailService {
  constructor(
    private readonly mail: MailService,
    private readonly cache: MailCacheService,
    private readonly logger: AppLoggerService,
  ) {}

  async sendGuarded(options: GuardedSendOptions): Promise<GuardedSendResult> {
    const recipients = splitEmails(options.emailAddr);
    const docNo = options.docNo ?? options.data?.doc_no ?? '';
    const entityCd = options.entityCdForLog ?? options.entityCd ?? '';
    const channel = options.logChannel ?? 'sendmailapproval';
    const action = options.trxAction ?? 'EMAIL_APPROVAL';
    const trxMeta: Record<string, unknown> = {
      entity_cd: entityCd,
      doc_no: docNo,
      ...options.logContext,
      to: recipients.map(maskEmail),
      subject: options.subject,
    };
    const started = Date.now();

    this.logger.transaction(action, 'MULAI', `${options.logLabel} doc_no ${docNo}`, trxMeta);

    if (recipients.length === 0) {
      this.logger.channel('sendmail').warn(`No email address provided for document ${docNo}`);
      this.logger.transaction(action, 'LEWAT', `${options.logLabel} doc_no ${docNo}: tidak ada alamat email`, trxMeta);
      return {
        sent: false,
        alreadySent: false,
        noRecipient: true,
        recipients: [],
        message: 'No email address provided',
      };
    }

    const date = options.cacheDate ?? MailCacheService.today();
    const prefix = options.cachePrefix ?? 'email_sent_';
    const relativeDir = `${options.cacheDir}/${date}`;

    const mailLogContext = { entity_cd: entityCd, doc_no: docNo, ...options.logContext };

    try {
      if (options.perRecipient) {
        const result = await this.sendPerRecipient(
          options,
          recipients,
          relativeDir,
          prefix,
          docNo,
          entityCd,
          channel,
          mailLogContext,
        );
        this.logger.transaction(
          action,
          result.sent ? 'SUKSES' : 'LEWAT',
          `${options.logLabel} doc_no ${docNo}: ${result.message}`,
          { ...trxMeta, durationMs: Date.now() - started },
        );
        return result;
      }

      const fileName = `${prefix}${options.cacheKeyParts.map(clean).join('_')}.txt`;

      const guard = await this.cache.guard(relativeDir, fileName, async () => {
        await this.mail.send({
          to: recipients,
          cc: options.cc,
          bcc: options.bcc,
          subject: options.subject,
          view: options.view,
          data: options.data,
          entityCd: options.entityCd,
          entityName: options.entityName,
          fromName: options.fromName,
          logContext: mailLogContext,
        });
      });

      const sentTo = recipients.join(', ');

      if (guard.alreadySent) {
        this.logger
          .channel(channel)
          .info(`${options.logLabel} doc_no ${docNo} Entity ${entityCd} already sent to: ${sentTo}`);
        this.logger.transaction(action, 'LEWAT', `${options.logLabel} doc_no ${docNo}: sudah pernah dikirim`, {
          ...trxMeta,
          marker: fileName,
          durationMs: Date.now() - started,
        });
        return {
          sent: false,
          alreadySent: true,
          noRecipient: false,
          recipients,
          message: `Email has already been sent to: ${sentTo}`,
        };
      }

      this.logger
        .channel(channel)
        .info(`${options.logLabel} doc_no ${docNo} Entity ${entityCd} berhasil dikirim ke: ${sentTo}`);
      this.logger.transaction(action, 'SUKSES', `${options.logLabel} doc_no ${docNo}`, {
        ...trxMeta,
        durationMs: Date.now() - started,
      });

      return {
        sent: true,
        alreadySent: false,
        noRecipient: false,
        recipients,
        message: `Email berhasil dikirim ke: ${sentTo}`,
      };
    } catch (err: any) {
      this.logger.channel('sendmail').error(`Gagal mengirim email: ${err?.message ?? err}`);
      this.logger.transaction(action, 'GAGAL', `${options.logLabel} doc_no ${docNo}: ${err?.message ?? err}`, {
        ...trxMeta,
        durationMs: Date.now() - started,
      });
      return {
        sent: false,
        alreadySent: false,
        noRecipient: false,
        recipients,
        message: `Gagal mengirim email: ${err?.message ?? err}`,
        error: err,
      };
    }
  }

  private async sendPerRecipient(
    options: GuardedSendOptions,
    recipients: string[],
    relativeDir: string,
    prefix: string,
    docNo: any,
    entityCd: any,
    channel: string,
    logContext: Record<string, unknown>,
  ): Promise<GuardedSendResult> {
    const messages: string[] = [];
    let anySent = false;
    let anyAlready = false;

    for (const address of recipients) {
      const emailKey = md5(address);
      const fileName = `${prefix}${options.cacheKeyParts.map(clean).join('_')}_${emailKey}.txt`;

      const guard = await this.cache.guard(relativeDir, fileName, async () => {
        await this.mail.send({
          to: address,
          cc: options.cc,
          bcc: options.bcc,
          subject: options.subject,
          view: options.view,
          data: options.data,
          entityCd: options.entityCd,
          entityName: options.entityName,
          fromName: options.fromName,
          logContext,
        });
      });

      if (guard.alreadySent) {
        anyAlready = true;
        this.logger
          .channel(channel)
          .info(
            `${options.logLabel} doc_no ${docNo} Entity ${entityCd} sudah pernah dikirim ke: ${address}`,
          );
        messages.push(`Email sudah pernah dikirim ke: ${address}`);
      } else {
        anySent = true;
        this.logger
          .channel(channel)
          .info(
            `${options.logLabel} doc_no ${docNo} Entity ${entityCd} berhasil dikirim ke: ${address}`,
          );
        messages.push(`Email berhasil dikirim ke: ${address}`);
      }
    }

    return {
      sent: anySent,
      alreadySent: !anySent && anyAlready,
      noRecipient: false,
      recipients,
      message: messages[messages.length - 1] ?? '',
    };
  }
}

/** `strtolower($request->email_addr)` lalu dipecah dengan `;`. */
export function splitEmails(value: any): string[] {
  return String(value ?? '')
    .toLowerCase()
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

function clean(value: any): string {
  return String(value ?? '').trim();
}

function md5(value: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('crypto');
  return crypto.createHash('md5').update(value).digest('hex');
}
