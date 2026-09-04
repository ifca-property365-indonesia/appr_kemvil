import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailCacheService } from '../../common/cache/mail-cache.service';
import { FormatHelper, parseDate } from '../../common/helpers/format.helper';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { ApprovalMailService, splitEmails } from '../../common/mail/approval-mail.service';
import { FeedbackCallback, FeedbackMailService } from '../../common/services/feedback-mail.service';

export interface StaffActionCallback {
  Error: boolean;
  Pesan: string;
  Status: number;
  data?: Record<string, any>;
}

/**
 * Migrasi dari app/Http/Controllers/StaffActionController.php
 *
 * - staffaction()            : email balasan umum (StaffActionMail)
 * - staffaction_por()        : email balasan Purchase Requisition (StaffActionPoRMail)
 * - staffaction_pos()        : email balasan Purchase Selection (StaffActionPoSMail)
 * - fileexist()              : cek keberadaan lampiran di server FTP
 * - feedback_land()          : email balasan module Land (FeedbackMail)
 * - feedback_land_request()  : email terusan Land Request (SendNextLandReqeuest)
 */
@Injectable()
export class StaffActionService {
  constructor(
    private readonly approvalMail: ApprovalMailService,
    private readonly feedback: FeedbackMailService,
    private readonly logger: AppLoggerService,
    private readonly config: ConfigService,
  ) {}

  private get bccFeedback(): string[] {
    return this.config.get<string[]>('mail.bccFeedback') ?? [];
  }

  /** Padanan pemetaan status -> action + isi email pada StaffActionController. */
  private describe(body: Record<string, any>, withNote = false): { action: string; bodyEMail: string } {
    const status = String(body.status ?? '').toUpperCase();
    const descs = body.descs ?? '';
    const docNo = body.doc_no ?? '';
    const reason = body.reason ?? '';

    if (status === 'R') {
      return {
        action: 'Revision',
        bodyEMail: `Please revise ${descs} No. ${docNo} with the reason : ${reason}`,
      };
    }
    if (status === 'C') {
      return {
        action: 'Cancellation',
        bodyEMail: `${descs} No. ${docNo} has been cancelled with the reason : ${reason}`,
      };
    }
    if (status === 'A') {
      return {
        action: 'Approval',
        bodyEMail: withNote
          ? `Your Request ${descs} No. ${docNo} has been Approved with the Note : ${reason}`
          : `Your Request ${descs} No. ${docNo} has been Approved`,
      };
    }
    return { action: '', bodyEMail: '' };
  }

  /** POST /api/staffaction */
  async staffaction(body: Record<string, any>): Promise<string> {
    const { action, bodyEMail } = this.describe(body);

    const emailBack = {
      doc_no: body.doc_no,
      action,
      reason: body.reason,
      descs: body.descs,
      subject: body.subject,
      bodyEMail,
      user_name: body.user_name,
      staff_act_send: body.staff_act_send,
      entity_name: body.entity_name,
      entity_cd: body.entity_cd,
      action_date: FormatHelper.nowJakarta(),
    };

    const result = await this.approvalMail.sendGuarded({
      emailAddr: body.email_addr,
      cacheDir: 'feedbackStaffAction',
      cacheKeyParts: [body.approve_seq, body.entity_cd, body.doc_no, body.status],
      cachePrefix: 'email_feedback_sent_',
      view: 'email.staffaction',
      subject: `${body.subject ?? ''} ${body.descs ?? ''} No. ${body.doc_no ?? ''}`,
      data: { data: emailBack },
      bcc: this.bccFeedback,
      logChannel: 'sendmailfeedback',
      logLabel: 'Email Feedback',
      docNo: body.doc_no,
      entityCdForLog: body.entity_cd,
    });

    if (result.noRecipient) {
      this.logger
        .channel('sendmail')
        .warn('Tidak ada alamat email untuk feedback yang diberikan');
      return 'Tidak ada alamat email untuk feedback yang diberikan';
    }
    if (result.error) return `Gagal mengirim email: ${result.error.message}`;
    return result.message;
  }

  /** POST /api/staffaction_por */
  async staffactionPor(body: Record<string, any>): Promise<string> {
    const { action, bodyEMail } = this.describe(body, true);

    const emailBack = {
      doc_no: body.doc_no,
      action,
      reason: body.reason,
      descs: body.descs,
      subject: body.subject,
      bodyEMail,
      user_name: body.user_name,
      staff_act_send: body.staff_act_send,
      entity_name: body.entity_name,
      status: body.status,
      entity_cd: body.entity_cd,
      url_file: FormatHelper.explode('; ', body.url_file),
      file_name: FormatHelper.explode('; ', body.file_name),
      doc_link: FormatHelper.explode('; ', body.doc_link),
      action_date: FormatHelper.nowJakarta(),
    };

    const recipients = splitEmails(body.email_addr);

    // CC hanya diproses saat status Approved, dan alamat yang sudah ada pada
    // penerima utama dibuang.
    let cc: string[] = [];
    if (String(body.status ?? '').toUpperCase() === 'A' && body.email_cc) {
      cc = Array.from(new Set(splitEmails(body.email_cc))).filter(
        (item) => !recipients.includes(item),
      );
    }

    // Folder cache mengikuti tanggal approval dokumen.
    const approved = parseDate(body.date_approved);
    const cacheDate = approved ? approved.format('YYYYMMDD') : MailCacheService.today();

    const result = await this.approvalMail.sendGuarded({
      emailAddr: body.email_addr,
      cacheDir: 'feedbackPOR',
      cacheDate,
      cacheKeyParts: [body.approve_seq, body.entity_cd, body.doc_no, body.status],
      cachePrefix: 'email_feedback_sent_',
      view: 'email.staffaction.por',
      subject: `${body.subject ?? ''} ${body.descs ?? ''} No. ${body.doc_no ?? ''}`,
      data: { data: emailBack },
      cc,
      bcc: this.bccFeedback,
      logChannel: 'sendmailfeedback',
      logLabel: `Email Feedback ${action}`,
      docNo: body.doc_no,
      entityCdForLog: body.entity_cd,
    });

    if (result.noRecipient) {
      this.logger.channel('sendmail').warn('Tidak ada alamat email yang diberikan.');
      return 'Tidak ada alamat email yang diberikan.';
    }
    if (result.error) return 'Gagal mengirim email. Cek log untuk detailnya.';
    if (result.alreadySent) return 'Email sudah dikirim sebelumnya.';

    const sentTo = result.recipients.join(', ');
    return `Email berhasil dikirim ke: ${sentTo}${cc.length > 0 ? ` & CC ke : ${cc.join(', ')}` : ''}`;
  }

  /** POST /api/staffaction_pos */
  async staffactionPos(body: Record<string, any>): Promise<string> {
    const { action, bodyEMail } = this.describe(body);

    const emailBack = {
      doc_no: body.doc_no,
      action,
      reason: body.reason,
      descs: body.descs,
      subject: body.subject,
      bodyEMail,
      user_name: body.user_name,
      staff_act_send: body.staff_act_send,
      entity_name: body.entity_name,
      entity_cd: body.entity_cd,
      url_file: FormatHelper.explode('; ', body.url_file),
      file_name: FormatHelper.explode('; ', body.file_name),
      action_date: FormatHelper.nowJakarta(),
    };

    const result = await this.approvalMail.sendGuarded({
      emailAddr: body.email_addr,
      cacheDir: 'feedbackPOS',
      cacheKeyParts: [body.approve_seq, body.entity_cd, body.doc_no, body.status],
      cachePrefix: 'email_feedback_sent_',
      view: 'email.staffaction.pos',
      subject: `${body.subject ?? ''} ${body.descs ?? ''} No. ${body.doc_no ?? ''}`,
      data: { data: emailBack },
      bcc: this.bccFeedback,
      logChannel: 'sendmailfeedback',
      logLabel: 'Email Feedback',
      docNo: body.doc_no,
      entityCdForLog: body.entity_cd,
    });

    if (result.noRecipient) {
      this.logger
        .channel('sendmail')
        .warn('Tidak ada alamat email untuk feedback yang diberikan');
      return 'Tidak ada alamat email untuk feedback yang diberikan';
    }
    if (result.error) return 'Gagal mengirim email. Cek log untuk detailnya.';
    return result.message;
  }

  /**
   * POST /api/fileexist
   * Padanan pengecekan `ftp_size()` pada versi PHP.
   */
  async fileexist(body: Record<string, any>): Promise<string> {
    const ftpConfig = this.config.get('ftp');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Client } = require('basic-ftp');
    const client = new Client(30000);

    try {
      await client.access({
        host: ftpConfig.host,
        port: ftpConfig.port,
        user: ftpConfig.username,
        password: ftpConfig.password,
        secure: false,
      });

      const remote = `${ftpConfig.baseDir}/${body.folder_name}/${body.file_name}`;
      const size = await client.size(remote);
      return size > 0 ? 'Ada File' : 'Tidak Ada File';
    } catch (err: any) {
      this.logger.channel('daily').error(`Cek file FTP gagal: ${err?.message ?? err}`);
      return 'Tidak Ada File';
    } finally {
      client.close();
    }
  }

  /** POST /api/feedbackland */
  async feedbackLand(body: Record<string, any>): Promise<FeedbackCallback> {
    return this.feedback.send({
      body,
      cacheDir: `feedback/${body.descs_send}`,
      folderlink: `${body.descs_send}Mail`,
      bcc: this.bccFeedback,
      extraData: { descs_send: body.descs_send },
    });
  }

  /**
   * POST /api/feedbacklandrequest
   * Email terusan Land Request - satu email per alamat penerima.
   */
  async feedbackLandRequest(body: Record<string, any>): Promise<StaffActionCallback> {
    const paymentMap: Record<string, string> = {
      A: 'Tolong proses AP Advance dengan detail :',
      I: 'Tolong proses AP Invoice dengan detail :',
    };
    const subjectMap: Record<string, string> = {
      A: `Land Transaction AP Advance No. ${body.doc_no}`,
      I: `Land Transaction AP Invoice No. ${body.doc_no}`,
    };

    const dataArray = {
      user_id: body.user_id,
      level_no: body.level_no,
      entity_cd: body.entity_cd,
      doc_no: body.doc_no,
      approve_seq: body.approve_seq,
      email_addr: body.email_addr,
      user_name: body.user_name,
      sender_addr: body.sender_addr,
      sender_name: body.sender_name,
      entity_name: body.entity_name,
      attachments: FormatHelper.pairAttachments(
        FormatHelper.cleanList(body.url_link),
        FormatHelper.cleanList(body.file_name),
        ['url', 'file_name'],
      ),
      descs: body.descs,
      approve_list: FormatHelper.explode('; ', body.approve_exist),
      type: FormatHelper.explode(';', body.type),
      name_owner: FormatHelper.explode(';', body.name_owner),
      nop_no: FormatHelper.explode(';', body.nop_no),
      sph_trx_no: FormatHelper.explode(';', body.sph_trx_no),
      request_amt: FormatHelper.explode(';', body.request_amt).map((amt) =>
        FormatHelper.numberFormat(amt, 2),
      ),
      clarify_user: body.sender_name,
      clarify_email: body.sender_addr,
      detail_text: paymentMap[body.payment_cd] ?? 'Tolong proses Pengajuan Pembayaran dengan detail :',
      subject: subjectMap[body.payment_cd] ?? `Land Transaction No. ${body.doc_no}`,
      link: 'landrequest',
    };

    const callback: StaffActionCallback = {
      Error: false,
      Pesan: '',
      Status: 200,
      data: { payload: dataArray },
    };

    const result = await this.approvalMail.sendGuarded({
      emailAddr: body.email_addr,
      cacheDir: 'email_terusan/send_Land_Request',
      cacheKeyParts: [body.approve_seq, body.entity_cd, body.doc_no, body.level_no],
      perRecipient: true,
      view: 'email.landrequestmail.terusan',
      subject: dataArray.subject,
      data: { dataArray },
      bcc: this.bccFeedback,
      entityCd: body.entity_cd,
      entityName: body.entity_name,
      logLabel: 'Email Terusan Land Request',
      docNo: body.doc_no,
      entityCdForLog: body.entity_cd,
    });

    if (result.noRecipient) {
      callback.Pesan = 'No email address provided';
      callback.Error = true;
      callback.Status = 400;
    } else if (result.error) {
      callback.Pesan = `Gagal mengirim email: ${result.error.message}`;
      callback.Error = true;
      callback.Status = 500;
    } else if (result.alreadySent) {
      callback.Pesan = result.message;
      callback.Error = true;
      callback.Status = 400;
    } else {
      callback.Pesan = result.message;
      callback.Error = false;
      callback.Status = 200;
    }

    return callback;
  }
}
