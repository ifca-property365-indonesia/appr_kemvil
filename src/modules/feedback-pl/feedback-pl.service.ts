import { Injectable } from '@nestjs/common';
import { FormatHelper } from '../../common/helpers/format.helper';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { ApprovalMailService } from '../../common/mail/approval-mail.service';

/**
 * Migrasi dari app/Http/Controllers/FeedbackPLController.php
 *
 * - feedbackbudgetlyman()    : FeedbackPLLymanMail    (email.staffaction.plbudgetlyman)
 * - feedbackbudgetrevision() : FeedbackPLRevisionMail (email.staffaction.plbudgetrevision)
 */
@Injectable()
export class FeedbackPlService {
  constructor(
    private readonly approvalMail: ApprovalMailService,
    private readonly logger: AppLoggerService,
  ) {}

  /** POST /api/feedback_pl_budget_lyman */
  async feedbackBudgetLyman(body: Record<string, any>): Promise<string> {
    const status = String(body.status ?? '').toUpperCase();
    const docNo = body.doc_no ?? '';

    let action = '';
    let bodyEMail = '';
    if (status === 'R') {
      action = 'Revision';
      bodyEMail = `Please revise RAB Budget No. ${docNo}`;
    } else if (status === 'C') {
      action = 'Cancellation';
      bodyEMail = `RAB Budget No. ${docNo} has been cancelled with the reason : `;
    } else if (status === 'A') {
      action = 'Approval';
      bodyEMail = `Your Request RAB Budget No. ${docNo} has been Approved`;
    }

    return this.dispatch(body, {
      action,
      bodyEMail,
      cacheDir: 'feedbackPLBudgetLyman',
      view: 'email.staffaction.plbudgetlyman',
      subject: `${body.subject ?? ''} RAB Budget No. ${docNo}`,
    });
  }

  /** POST /api/feedback_pl_budget_revision */
  async feedbackBudgetRevision(body: Record<string, any>): Promise<string> {
    const status = String(body.status ?? '').toUpperCase();
    const docNo = body.doc_no ?? '';
    const descs = body.descs ?? '';

    let action = '';
    let bodyEMail = '';
    if (status === 'R') {
      action = 'Revision';
      bodyEMail = `Please revise ${descs} No. ${docNo}`;
    } else if (status === 'C') {
      action = 'Cancellation';
      bodyEMail = `${descs} No. ${docNo}`;
    } else if (status === 'A') {
      action = 'Approval';
      bodyEMail = `Your Request ${descs} No. ${docNo} has been Approved`;
    }

    return this.dispatch(body, {
      action,
      bodyEMail,
      cacheDir: 'feedbackPLBudgetRevision',
      view: 'email.staffaction.plbudgetrevision',
      subject: `${body.subject ?? ''} ${descs} No. ${docNo}`,
    });
  }

  private async dispatch(
    body: Record<string, any>,
    options: { action: string; bodyEMail: string; cacheDir: string; view: string; subject: string },
  ): Promise<string> {
    const emailBack = {
      doc_no: body.doc_no,
      action: options.action,
      reason: body.reason,
      descs: body.descs,
      subject: body.subject,
      bodyEMail: options.bodyEMail,
      user_name: body.user_name,
      staff_act_send: body.staff_act_send,
      entity_name: body.entity_name,
      entity_cd: body.entity_cd,
      action_date: FormatHelper.nowJakarta(),
    };

    const result = await this.approvalMail.sendGuarded({
      emailAddr: body.email_addr,
      cacheDir: options.cacheDir,
      cacheKeyParts: [body.approve_seq, body.entity_cd, body.doc_no, body.status],
      cachePrefix: 'email_feedback_sent_',
      view: options.view,
      subject: options.subject,
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
    if (result.error) return `Gagal mengirim email: ${result.error.message}`;
    return result.message;
  }
}
