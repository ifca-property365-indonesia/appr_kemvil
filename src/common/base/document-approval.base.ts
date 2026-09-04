import { Injectable } from '@nestjs/common';
import { TokenService } from '../crypto/token.service';
import { DatabaseService } from '../database/database.service';
import { AppLoggerService } from '../logger/app-logger.service';
import { ApprovalMailService } from '../mail/approval-mail.service';
import { ApprovalFlowService } from '../services/approval-flow.service';

export interface DocumentApprovalDefinition {
  /** Prefix route, contoh: `cmentry`. */
  key: string;
  /** Nilai `text` pada payload terenkripsi, contoh: `Contract Entry`. */
  text: string;
  /** Label dokumen pada pesan hasil, contoh: `Contract Entry`. */
  label: string;
  /** Kolom TYPE dan module pada mgr.cb_cash_request_appr. */
  type: string;
  typeModule: string;
  /** Sub folder cache email, contoh: `send_cmentry`. */
  cacheDir: string;
  /** View email approval. */
  mailView: string;
  /** View halaman konfirmasi approve/revise/cancel. */
  passCheckView: string;
  /** Stored procedure eksekusi keputusan. */
  procedure: string;
  /** Parameter stored procedure. */
  procedureParams: (payload: Record<string, any>, status: string, reason: string) => any[];
  /** Susun `$dataArray` (isi email). Wajib memuat `subject`. */
  buildData: (body: Record<string, any>) => Record<string, any>;
  /** Susun `$data2Encrypt` (payload token URL). */
  buildEncrypted: (body: Record<string, any>) => Record<string, any>;
  /** Bagian nama file cache. Default: [approve_seq, entity_cd, doc_no, level_no]. */
  cacheKeyParts?: (body: Record<string, any>) => any[];
  /** Label pada log, contoh: `Email CM Entry`. */
  logLabel: string;
  /** Kirim doc_no/email/module ke view konfirmasi (template generic). */
  withDocumentContext?: boolean;
  /**
   * Entity name pada halaman hasil. CbFupd mengambil `descs` dari mgr.pl_project,
   * selebihnya memakai entity_name dari payload.
   */
  entityNameForResult?: 'payload' | 'project';
}

/**
 * Alur bersama module non-Land (CB, CM, PO, PL, TM) yang pada Laravel diwakili
 * `Mail()`/`processModule()`, `processData()` dan `update()`/`getaccess()`.
 */
@Injectable()
export abstract class DocumentApprovalBaseService {
  protected abstract readonly definition: DocumentApprovalDefinition;

  constructor(
    protected readonly token: TokenService,
    protected readonly approvalMail: ApprovalMailService,
    protected readonly flow: ApprovalFlowService,
    protected readonly db: DatabaseService,
    protected readonly logger: AppLoggerService,
  ) {}

  /** Padanan `Mail(Request $request)` / `processModule($data)`. */
  async send(body: Record<string, any>): Promise<string> {
    const def = this.definition;

    const dataArray = def.buildData(body);
    const data2Encrypt = def.buildEncrypted(body);

    try {
      const encryptedData = await this.token.encrypt(data2Encrypt);

      const keyParts = def.cacheKeyParts
        ? def.cacheKeyParts(body)
        : [body.approve_seq, body.entity_cd, body.doc_no, body.level_no];

      const result = await this.approvalMail.sendGuarded({
        emailAddr: body.email_addr,
        cacheDir: def.cacheDir,
        cacheKeyParts: keyParts,
        view: def.mailView,
        subject: dataArray.subject,
        data: { encryptedData, dataArray },
        entityCd: body.entity_cd,
        entityName: body.entity_name,
        logLabel: def.logLabel,
        docNo: body.doc_no,
        entityCdForLog: body.entity_cd,
      });

      return result.message;
    } catch (err: any) {
      this.logger.channel('sendmail').error(`Gagal mengirim email: ${err?.message ?? err}`);
      return `Gagal mengirim email: ${err?.message ?? err}`;
    }
  }

  /** Padanan `processData($status, $encrypt)`. */
  async processData(status: string, encrypt: string): Promise<string> {
    const def = this.definition;

    try {
      const data = await this.token.decrypt(encrypt);

      return await this.flow.processData({
        data,
        encrypt,
        status,
        text: def.text,
        passCheckView: def.passCheckView,
        afterView: 'email.after',
        withDocumentContext: def.withDocumentContext,
        extraViewData: def.withDocumentContext ? { module: def.key } : undefined,
      });
    } catch (err: any) {
      this.logger.channel('daily').error(`processData ${def.key} gagal: ${err?.message ?? err}`);
      return this.flow.renderMessage('email.after', { Pesan: err?.message ?? String(err) });
    }
  }

  /** Padanan `update(Request $request)` (form konfirmasi). */
  async update(body: Record<string, any>): Promise<string> {
    return this.updateWith(String(body.status ?? ''), String(body.encrypt ?? ''), body.reason);
  }

  /** Padanan `update($status, $encrypt, $reason)` (dipanggil MailDataController). */
  async updateWith(status: string, encrypt: string, reason: any): Promise<string> {
    const def = this.definition;

    try {
      const data = await this.token.decrypt(encrypt);
      const normalizedReason = ApprovalFlowService.normalizeReason(reason, 'zero');

      let entityName = data.entity_name ?? 'PT Bekasi Fajar';
      if (def.entityNameForResult === 'project') {
        entityName =
          (await this.db.value<string>(
            'SELECT TOP 1 descs FROM mgr.pl_project WHERE entity_cd = ? AND project_no = ?',
            [data.entity_cd, data.project_no],
          )) ?? '';
      }

      return await this.flow.runProcedure({
        status,
        label: def.label,
        docNo: data.doc_no,
        entityName,
        afterView: 'email.after',
        procedure: def.procedure,
        params: def.procedureParams(data, status, normalizedReason),
      });
    } catch (err: any) {
      this.logger.channel('daily').error(`update ${def.key} gagal: ${err?.message ?? err}`);
      return this.flow.renderMessage('email.after', { Pesan: err?.message ?? String(err) });
    }
  }
}
