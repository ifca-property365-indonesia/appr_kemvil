import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../../common/crypto/token.service';
import { DatabaseService } from '../../common/database/database.service';
import { FormatHelper } from '../../common/helpers/format.helper';
import { redactPayload } from '../../common/helpers/redact.helper';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { ApprovalMailService } from '../../common/mail/approval-mail.service';
import { ViewService } from '../../common/view/view.service';

/** Stored procedure approval PR (lihat mgr.x_send_mail_approval_po_request). */
const PROCEDURE = 'mgr.x_send_mail_approval_po_request';
const APPROVAL_TABLE = 'mgr.po_authorized_person';
const LABEL = 'Purchase Requisition';
const AUDIT_CHANNEL = 'approval';

/** Nilai default bila body dari SP tidak membawa module/type approval. */
const DEFAULT_APPR_MODULE = 'PR';
const DEFAULT_APPR_TYPE = 'C';

/** Status yang dikirim ke SP: A = Approve, M = Revise, R = Reject. */
const STATUS: Record<string, { name: string; color: string; button: string; done: string; image: string }> = {
  A: { name: 'Approval', color: '#1ee0ac', button: 'Approve', done: 'Approved', image: 'approved.png' },
  M: { name: 'Revision', color: '#f4bd0e', button: 'Revise', done: 'Revised', image: 'revise.png' },
  R: { name: 'Rejection', color: '#e85347', button: 'Reject', done: 'Rejected', image: 'reject.png' },
};

/** Isi token pada link Approve/Revise/Reject. */
interface ApprovalToken {
  entity_cd: string;
  project_no: string;
  doc_no: string;
  trx_type: string;
  level_no: string;
  user_id: string;
  email_address: string;
  entity_name: string;
  appr_module: string;
  appr_type: string;
}

/**
 * Satu-satunya alur email approval:
 *
 *   SP x_send_mail_approval_po_request --POST /api/maildata--> send()
 *     -> email ke approver berisi link /api/porequest/{A|M|R}/{token}
 *   approver klik link -> confirm() -> form -> execute()
 *     -> EXEC SP (update status, buka level berikutnya, SP memanggil /api/maildata lagi)
 */
@Injectable()
export class PoRequestService {
  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly token: TokenService,
    private readonly approvalMail: ApprovalMailService,
    private readonly view: ViewService,
    private readonly logger: AppLoggerService,
  ) {}

  /** POST /api/maildata - body JSON dari SP. Balasan teks dibaca SP sebagai penanda sukses. */
  async send(body: Record<string, any>): Promise<string> {
    if (body.module && body.module !== 'PoRequest') {
      this.logger.channel('sendmail').warn(`module "${body.module}" diproses sebagai PoRequest`);
    }

    const payload: ApprovalToken = {
      entity_cd: text(body.entity_cd),
      project_no: text(body.project_no),
      doc_no: text(body.doc_no),
      trx_type: text(body.trx_type),
      level_no: text(body.level_no),
      user_id: text(body.user_id),
      email_address: text(body.email_addr),
      entity_name: text(body.entity_name),
      appr_module: text(body.appr_module) || DEFAULT_APPR_MODULE,
      appr_type: text(body.appr_type) || DEFAULT_APPR_TYPE,
    };

    const dataArray = {
      entity_name: payload.entity_name,
      user_name: text(body.user_name),
      doc_no: payload.doc_no,
      descs: text(body.descs),
      url_file: FormatHelper.explode('; ', body.url_file ?? 'EMPTY'),
      file_name: FormatHelper.explode('; ', body.file_name ?? 'EMPTY'),
      approve_list: FormatHelper.explode('; ', body.approve_exist ?? 'EMPTY'),
      clarify_user: text(body.clarify_user),
      clarify_email: text(body.clarify_email),
      sender: text(body.sender),
      sender_addr: text(body.sender_addr),
      subject: `Need Approval for ${LABEL} No. ${payload.doc_no}`,
    };

    try {
      const encryptedData = await this.token.encrypt(payload);
      const appUrl = (this.config.get<string>('app.url') ?? '').replace(/\/+$/, '');
      const links = Object.fromEntries(
        Object.keys(STATUS).map((status) => [status, `${appUrl}/api/porequest/${status}/${encryptedData}`]),
      );

      const result = await this.approvalMail.sendGuarded({
        emailAddr: body.email_addr,
        cacheDir: 'send_porequest',
        cacheKeyParts: [payload.entity_cd, payload.doc_no, payload.level_no, payload.user_id],
        view: 'email.porequest.send',
        subject: dataArray.subject,
        data: { dataArray, links },
        entityCd: payload.entity_cd,
        entityName: payload.entity_name,
        logLabel: `Email ${LABEL}`,
        docNo: payload.doc_no,
      });

      return result.message;
    } catch (err: any) {
      this.logger.channel('sendmail').error(`Gagal mengirim email: ${err?.message ?? err}`);
      return `Gagal mengirim email: ${err?.message ?? err}`;
    }
  }

  /** GET /api/porequest/{status}/{token} - halaman konfirmasi + kolom alasan. */
  async confirm(status: string, encrypt: string): Promise<string> {
    const option = STATUS[String(status ?? '').toUpperCase()];
    if (!option) return this.message(`Unknown action "${status}"`);

    try {
      const data = await this.token.decrypt<ApprovalToken>(encrypt);
      this.logger.channel('daily').info(`Decrypted data: ${JSON.stringify(redactPayload(data))}`);

      const blocked = await this.checkPending(data, status);
      if (blocked) return blocked;

      this.logger
        .channel(AUDIT_CHANNEL)
        .info(`AKSES halaman konfirmasi ${option.button} ${LABEL} No. ${data.doc_no}`, auditContext(data, status));

      return this.view.render('email.porequest.confirm', {
        status: String(status).toUpperCase(),
        encrypt,
        doc_no: data.doc_no,
        name: option.name,
        bgcolor: option.color,
        valuebt: option.button,
        entity_name: data.entity_name,
      });
    } catch (err: any) {
      this.logger.channel('daily').error(`confirm porequest gagal: ${err?.message ?? err}`);
      return this.message(err?.message ?? String(err));
    }
  }

  /** POST /api/porequest/getaccess - jalankan SP sesuai keputusan approver. */
  async execute(body: Record<string, any>): Promise<string> {
    const status = String(body.status ?? '').toUpperCase();
    const option = STATUS[status];
    if (!option) return this.message(`Unknown action "${body.status}"`);

    let data: ApprovalToken;
    try {
      data = await this.token.decrypt<ApprovalToken>(String(body.encrypt ?? ''));
    } catch (err: any) {
      this.logger.channel('daily').error(`execute porequest gagal: ${err?.message ?? err}`);
      return this.message(err?.message ?? String(err));
    }

    const blocked = await this.checkPending(data, status);
    if (blocked) return blocked;

    const audit = this.logger.channel(AUDIT_CHANNEL);
    const context = auditContext(data, status);
    const rawReason = String(body.reason ?? '').trim();
    const reason = rawReason === '' || rawReason === '0' ? 'no note' : rawReason;
    const started = Date.now();

    audit.info(`MULAI ${option.done} ${LABEL} No. ${data.doc_no}`, context);

    try {
      await this.db.execProcedureDetailed(PROCEDURE, [
        data.entity_cd,
        data.project_no,
        data.doc_no,
        data.trx_type,
        data.appr_module,
        status,
        data.level_no,
        reason,
        data.user_id,
      ]);
    } catch (err: any) {
      const message = err?.message ?? String(err);
      audit.error(`GAGAL ${option.done} ${LABEL} No. ${data.doc_no}: ${message}`, {
        ...context,
        durationMs: Date.now() - started,
      });
      return this.message(`You Failed to ${option.button} the ${LABEL} No. ${data.doc_no}`, {
        notif: `Fail to ${option.button} !`,
        entity_name: data.entity_name,
      });
    }

    audit.info(`SUKSES ${option.done} ${LABEL} No. ${data.doc_no}`, {
      ...context,
      durationMs: Date.now() - started,
    });

    return this.message(`You Have Successfully ${option.done} the ${LABEL} No. ${data.doc_no}`, {
      notif: `${option.done} !`,
      image: option.image,
      entity_name: data.entity_name,
    });
  }

  /**
   * Link hanya berlaku selama baris approver masih 'O' (giliran approver ini).
   * Mengembalikan halaman penolakan, atau null bila boleh lanjut.
   */
  private async checkPending(data: ApprovalToken, status: string): Promise<string | null> {
    const row = await this.db.first<{ status: string }>(
      `SELECT TOP 1 status FROM ${APPROVAL_TABLE}
       WHERE entity_cd = ? AND doc_no = ? AND level_no = ? AND user_id = ?
         AND trx_type = ? AND module = ? AND type = ?`,
      [data.entity_cd, data.doc_no, data.level_no, data.user_id, data.trx_type, data.appr_module, data.appr_type],
    );

    if (row?.status === 'O') return null;

    const reason = !row
      ? `There is no ${LABEL} with No. ${data.doc_no}`
      : STATUS[row.status]
        ? `You Have Already Made a Request to ${LABEL} No. ${data.doc_no}`
        : `${LABEL} No. ${data.doc_no} is not waiting for your approval`;

    this.logger
      .channel(AUDIT_CHANNEL)
      .warn(`DITOLAK (${row ? `status ${row.status}` : 'tidak ada'}) ${LABEL} No. ${data.doc_no}`, auditContext(data, status));

    return this.message(reason, { image: 'double_approve.png', entity_name: data.entity_name });
  }

  private message(
    pesan: string,
    extra: { notif?: string; image?: string; entity_name?: string } = {},
  ): string {
    return this.view.render('email.after', {
      Pesan: pesan,
      St: 'OK',
      notif: extra.notif ?? 'Restricted !',
      image: extra.image ?? 'reject.png',
      entity_name: extra.entity_name || null,
    });
  }
}

function text(value: any): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function auditContext(data: ApprovalToken, status: string): Record<string, any> {
  return {
    entity_cd: data.entity_cd,
    doc_no: data.doc_no,
    level_no: data.level_no,
    user_id: data.user_id,
    status_diminta: status,
    entity_name: data.entity_name,
  };
}
