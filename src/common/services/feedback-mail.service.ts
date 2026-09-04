import { Injectable } from '@nestjs/common';
import { ApprovalMailService } from '../mail/approval-mail.service';
import { FormatHelper } from '../helpers/format.helper';
import { AppLoggerService } from '../logger/app-logger.service';

export interface FeedbackCallback {
  Error: boolean;
  Pesan: string;
  Status: number;
}

export interface FeedbackMailOptions {
  body: Record<string, any>;
  /** Sub folder cache, contoh: `feedback/feedback_Land_Fph`. */
  cacheDir: string;
  /** Nilai `folderlink` pada data email (menentukan folder gambar/attachment). */
  folderlink: string;
  /** View email, default `email.additional.staffaction` (FeedbackMail). */
  view?: string;
  /** Alamat BCC tambahan. */
  bcc?: string | string[];
  /** Susun bodyEMail; default memakai pola Land (tanpa nomor dokumen). */
  bodyBuilder?: (body: Record<string, any>, action: string) => string;
  /** Data tambahan pada EmailBack. */
  extraData?: Record<string, any>;
}

/**
 * Padanan `feedback_land()`, `feedback_fph()` dan `feedback_verification()`:
 * mengirim email balasan (approve/revise/cancel) ke pembuat dokumen.
 */
@Injectable()
export class FeedbackMailService {
  constructor(
    private readonly approvalMail: ApprovalMailService,
    private readonly logger: AppLoggerService,
  ) {}

  /** Padanan pemetaan status -> action + isi email. */
  static describeAction(body: Record<string, any>): { action: string; bodyEMail: string } {
    const status = String(body.status ?? '').toUpperCase();
    const descs = body.descs ?? '';
    const reason = body.reason ?? '';

    if (status === 'R') {
      return { action: 'Revision', bodyEMail: `Please revise ${descs} with the reason : ${reason}` };
    }
    if (status === 'C') {
      return {
        action: 'Cancellation',
        bodyEMail: `${descs} has been cancelled with the reason : ${reason}`,
      };
    }
    if (status === 'A') {
      return { action: 'Approval', bodyEMail: `Your Request ${descs} has been Approved ` };
    }
    return { action: '', bodyEMail: '' };
  }

  async send(options: FeedbackMailOptions): Promise<FeedbackCallback> {
    const body = options.body;
    const { action, bodyEMail } = FeedbackMailService.describeAction(body);

    const attachments = FormatHelper.pairAttachments(
      FormatHelper.cleanList(body.url_link),
      FormatHelper.cleanList(body.file_name),
      ['url', 'file_name'],
    );

    const emailBack: Record<string, any> = {
      doc_no: body.doc_no,
      action,
      reason: body.reason,
      descs: body.descs,
      subject: body.subject,
      bodyEMail: options.bodyBuilder ? options.bodyBuilder(body, action) : bodyEMail,
      user_name: body.user_name,
      staff_act_send: body.staff_act_send,
      entity_name: body.entity_name,
      status: body.status,
      entity_cd: body.entity_cd,
      attachments,
      folderlink: options.folderlink,
      action_date: FormatHelper.nowJakarta(),
      ...(options.extraData ?? {}),
    };

    const result = await this.approvalMail.sendGuarded({
      emailAddr: body.email_addr,
      cacheDir: options.cacheDir,
      cacheKeyParts: [body.approve_seq, body.entity_cd, body.doc_no, body.status],
      cachePrefix: 'email_feedback_sent_',
      view: options.view ?? 'email.additional.staffaction',
      subject: `${body.subject ?? ''} ${body.descs ?? ''}`,
      data: { data: emailBack },
      bcc: options.bcc,
      entityCd: body.entity_cd,
      logChannel: 'sendmailfeedback',
      logLabel: `Email Feedback ${action}`,
      docNo: body.doc_no,
      entityCdForLog: body.entity_cd,
    });

    if (result.noRecipient) {
      this.logger.channel('sendmail').warn('Tidak ada alamat email yang diberikan.');
      return { Error: true, Pesan: 'Tidak ada alamat email yang diberikan.', Status: 400 };
    }
    if (result.error) {
      return { Error: true, Pesan: 'Gagal mengirim email. Cek log untuk detailnya.', Status: 500 };
    }
    if (result.alreadySent) {
      return { Error: false, Pesan: 'Email sudah dikirim sebelumnya.', Status: 200 };
    }
    return { Error: false, Pesan: 'Email berhasil dikirim.', Status: 200 };
  }
}
