import { Injectable } from '@nestjs/common';
import { MailCacheService } from '../../common/cache/mail-cache.service';
import { FormatHelper, parseDate } from '../../common/helpers/format.helper';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { ApprovalMailService } from '../../common/mail/approval-mail.service';

interface FeedbackVariant {
  /** Sub folder cache, contoh: `feedbackPoOrder`. */
  cacheDir: string;
  /** View email. */
  view: string;
  /** Ambil tanggal folder cache dari `approved_date`, bukan tanggal hari ini. */
  useApprovedDate?: boolean;
  /** Sertakan `document_link` pada data email. */
  withDocLink?: boolean;
}

/**
 * Migrasi dari app/Http/Controllers/StaffFeedbackController.php
 *
 * - feedback_po()          : StaffActionPoOrderMail  (email.staffaction.poorder)
 * - feedback_cb_fupd()     : StaffActionCbFupdMail   (email.staffaction.cbfupd)
 * - feedback_cb()          : StaffActionCbMail       (email.staffaction.cb)
 * - feedback_cm_progress() : StaffActionCbMail       (email.staffaction.cb)
 */
@Injectable()
export class StaffFeedbackService {
  constructor(
    private readonly approvalMail: ApprovalMailService,
    private readonly logger: AppLoggerService,
  ) {}

  /** POST /api/feedback_po */
  feedbackPo(body: Record<string, any>): Promise<string> {
    return this.send(body, {
      cacheDir: 'feedbackPoOrder',
      view: 'email.staffaction.poorder',
      withDocLink: true,
    });
  }

  /** POST /api/feedback_cb_fupd */
  feedbackCbFupd(body: Record<string, any>): Promise<string> {
    return this.send(body, { cacheDir: 'feedbackCbFupd', view: 'email.staffaction.cbfupd' });
  }

  /** POST /api/feedback_cb */
  feedbackCb(body: Record<string, any>): Promise<string> {
    return this.send(body, {
      cacheDir: 'feedbackCb',
      view: 'email.staffaction.cb',
      useApprovedDate: true,
    });
  }

  /** POST /api/feedback_cm_progress */
  feedbackCmProgress(body: Record<string, any>): Promise<string> {
    return this.send(body, {
      cacheDir: 'feedback_cm_progress_wu',
      view: 'email.staffaction.cb',
      useApprovedDate: true,
    });
  }

  private async send(body: Record<string, any>, variant: FeedbackVariant): Promise<string> {
    const status = String(body.status ?? '').toUpperCase();
    const descs = body.descs ?? '';
    const docNo = body.doc_no ?? '';
    const reason = body.reason ?? '';

    let action = '';
    let bodyEMail = '';
    if (status === 'R') {
      action = 'Revision';
      bodyEMail = `Please revise ${descs} No. ${docNo} with the reason : ${reason}`;
    } else if (status === 'C') {
      action = 'Cancellation';
      bodyEMail = `${descs} No. ${docNo} has been cancelled with the reason : ${reason}`;
    } else if (status === 'A') {
      action = 'Approval';
      bodyEMail = `Your Request ${descs} No. ${docNo} has been Approved`;
    }

    const emailBack: Record<string, any> = {
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

    if (variant.withDocLink) {
      emailBack.doc_link = FormatHelper.explode('; ', body.document_link);
    }

    let cacheDate = MailCacheService.today();
    if (variant.useApprovedDate) {
      const approved = parseDate(body.approved_date);
      if (approved) cacheDate = approved.format('YYYYMMDD');
    }

    const result = await this.approvalMail.sendGuarded({
      emailAddr: body.email_addr,
      cacheDir: variant.cacheDir,
      cacheDate,
      cacheKeyParts: [body.approve_seq, body.entity_cd, body.doc_no, body.status],
      cachePrefix: 'email_feedback_sent_',
      view: variant.view,
      subject: `${body.subject ?? ''} ${descs} No. ${docNo}`,
      data: { data: emailBack },
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
    if (result.alreadySent) return `Email Sudah dikirim ke: ${result.recipients.join(', ')}`;
    return `Email berhasil dikirim ke: ${result.recipients.join(', ')}`;
  }
}
