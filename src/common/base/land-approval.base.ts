import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailCacheService } from '../cache/mail-cache.service';
import { TokenService } from '../crypto/token.service';
import { AppLoggerService } from '../logger/app-logger.service';
import { logModuleFromClass, runWithLogModule } from '../logger/log-context';
import { ApprovalMailService } from '../mail/approval-mail.service';
import { ApprovalFlowService } from '../services/approval-flow.service';
import { FormatHelper } from '../helpers/format.helper';

/** Bentuk balikan `response()->json($callback, $callback['Status'])` pada controller Land. */
export interface LandCallback {
  data: { payload: Record<string, any>; encrypted: string } | null;
  Error: boolean;
  Pesan: string;
  Status: number;
}

export interface LandApprovalDefinition {
  /** Nilai `link` pada dataArray sekaligus prefix route, contoh: `landboundary`. */
  link: string;
  /** Kolom TYPE pada mgr.cb_cash_request_appr. */
  type: string;
  /** Kolom module, umumnya `LM` (Land) atau `PL` (PL Overwrite). */
  typeModule: string;
  /** Label dokumen, contoh: `Land Boundary`. */
  text: string;
  /** Sub folder cache email, contoh: `send_Land_Boundary`. */
  cacheDir: string;
  /** Stored procedure yang dijalankan saat approve/revise/cancel. */
  procedure: string;
  /** Nama view email. Default: `email.<link>mail.send`. */
  mailView?: string;
  /** Susun subject email dari request. */
  subject: (body: Record<string, any>) => string;
  /** Field khusus module yang ditambahkan ke dataArray. */
  extraData?: (body: Record<string, any>) => Record<string, any>;
  /** Sumber `clarify_user` / `clarify_email`; default memakai sender_name/sender_addr. */
  clarifyFromRequest?: boolean;
  /**
   * Beberapa controller lama tidak mengisi `attachmentsAdd` pada dataArray
   * (LandChangeName, LandHandoverLegal, PlOverwrite). Perilaku itu
   * dipertahankan supaya isi email tidak berubah.
   */
  includeAttachmentsAdd?: boolean;
  /** Parameter stored procedure. Default: [entity_cd, doc_no, status, level_no, reason]. */
  procedureParams?: (payload: Record<string, any>, status: string, reason: string) => any[];
  /** Field tambahan pada payload terenkripsi. */
  extraEncrypted?: (body: Record<string, any>) => Record<string, any>;
}

/**
 * Alur bersama seluruh module Land (`LandBoundary`, `LandMap`, `LandSph`, ...)
 * yang pada Laravel diwakili method `index()`, `processData()` dan `getaccess()`.
 */
@Injectable()
export abstract class LandApprovalBaseService {
  protected abstract readonly definition: LandApprovalDefinition;

  constructor(
    protected readonly token: TokenService,
    protected readonly approvalMail: ApprovalMailService,
    protected readonly flow: ApprovalFlowService,
    protected readonly logger: AppLoggerService,
    protected readonly config: ConfigService,
  ) {}

  /** Padanan `index(Request $request)`. */
  async index(body: Record<string, any>): Promise<LandCallback> {
    return runWithLogModule(logModuleFromClass(this), () => this.indexInner(body));
  }

  private async indexInner(body: Record<string, any>): Promise<LandCallback> {
    const def = this.definition;

    const callback: LandCallback = { data: null, Error: false, Pesan: '', Status: 200 };

    try {
      const attachments = FormatHelper.pairAttachments(
        FormatHelper.cleanList(body.url_link),
        FormatHelper.cleanList(body.file_name),
        ['url', 'file_name'],
      );

      const attachmentsAdd = FormatHelper.pairAttachments(
        FormatHelper.cleanList(body.add_attch_link),
        FormatHelper.cleanList(body.add_attch_name),
        ['urlAdd', 'file_nameAdd'],
      );

      const approveData = FormatHelper.explode('; ', body.approve_exist);

      const dataArray: Record<string, any> = {
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
        attachments,
        ...(def.includeAttachmentsAdd === false ? {} : { attachmentsAdd }),
        descs: body.descs,
        approve_list: approveData,
        ...(def.extraData ? def.extraData(body) : {}),
        clarify_user: def.clarifyFromRequest ? body.clarify_user : body.sender_name,
        clarify_email: def.clarifyFromRequest ? body.clarify_email : body.sender_addr,
        subject: def.subject(body),
        link: def.link,
      };

      const data2Encrypt: Record<string, any> = {
        entity_cd: body.entity_cd,
        email_address: body.email_addr,
        level_no: body.level_no,
        approve_seq: body.approve_seq,
        doc_no: body.doc_no,
        entity_name: body.entity_name,
        type: def.type,
        type_module: def.typeModule,
        text: def.text,
        ...(def.extraEncrypted ? def.extraEncrypted(body) : {}),
      };

      const encryptedData = await this.token.encrypt(data2Encrypt);

      callback.data = { payload: dataArray, encrypted: encryptedData };

      const result = await this.approvalMail.sendGuarded({
        emailAddr: body.email_addr,
        cacheDir: def.cacheDir,
        cacheKeyParts: [body.approve_seq, body.entity_cd, body.doc_no, body.level_no],
        view: def.mailView ?? `email.${def.link}mail.send`,
        subject: dataArray.subject,
        data: { encryptedData, dataArray },
        entityCd: body.entity_cd,
        entityName: body.entity_name,
        logLabel: `Email ${def.text}`,
        docNo: body.doc_no,
        entityCdForLog: body.entity_cd,
      });

      if (result.noRecipient) {
        callback.Pesan = 'No email address provided';
        callback.Error = true;
        callback.Status = 400;
      } else if (result.error) {
        callback.Pesan = result.message;
        callback.Error = true;
        callback.Status = 500;
      } else if (result.alreadySent) {
        callback.Pesan = `Email sudah pernah dikirim ke: ${result.recipients.join(', ')}`;
        callback.Error = false;
        callback.Status = 201;
      } else {
        callback.Pesan = `Email berhasil dikirim ke: ${result.recipients.join(', ')}`;
        callback.Error = false;
        callback.Status = 200;
      }
    } catch (err: any) {
      this.logger.channel('sendmail').error(`Gagal mengirim email: ${err?.message ?? err}`);
      callback.Pesan = `Gagal mengirim email: ${err?.message ?? err}`;
      callback.Error = true;
      callback.Status = 500;
    }

    return callback;
  }

  /** Padanan `processData($status, $encrypt)`. */
  async processData(status: string, encrypt: string): Promise<string> {
    return runWithLogModule(logModuleFromClass(this), () => this.processDataInner(status, encrypt));
  }

  private async processDataInner(status: string, encrypt: string): Promise<string> {
    const def = this.definition;

    try {
      const data = await this.token.decrypt(encrypt);

      return await this.flow.processData({
        data,
        encrypt,
        status,
        text: def.text,
        passCheckView: 'email/remark/passcheckwithremark',
        afterView: 'email.remark.after',
        useApproveSeq: true,
        withDocumentContext: true,
        link: def.link,
      });
    } catch (err: any) {
      this.logger.channel('daily').error(`processData ${def.link} gagal: ${err?.message ?? err}`);
      return this.flow.renderMessage('email.remark.after', { Pesan: err?.message ?? String(err) });
    }
  }

  /** Padanan `getaccess(Request $request)`. */
  async getaccess(body: Record<string, any>): Promise<string> {
    return runWithLogModule(logModuleFromClass(this), () => this.getaccessInner(body));
  }

  private async getaccessInner(body: Record<string, any>): Promise<string> {
    const def = this.definition;

    try {
      const data = await this.token.decrypt(body.encrypt);
      const status = String(body.status ?? '');
      const reason = ApprovalFlowService.normalizeReason(body.reason, 'text');

      const params = def.procedureParams
        ? def.procedureParams(data, status, reason)
        : [data.entity_cd, data.doc_no, status, data.level_no, reason];

      return await this.flow.runProcedure({
        status,
        label: def.text,
        docNo: data.doc_no,
        entityName: body.entity_name ?? data.entity_name,
        afterView: 'email.remark.after',
        procedure: def.procedure,
        params,
        failStatusText: 'FAIL',
      });
    } catch (err: any) {
      this.logger.channel('daily').error(`getaccess ${def.link} gagal: ${err?.message ?? err}`);
      return this.flow.renderMessage('email.remark.after', { Pesan: err?.message ?? String(err) });
    }
  }
}

/** Dipakai module Land yang butuh `MailCacheService` langsung (feedback). */
export type LandBaseDeps = {
  token: TokenService;
  approvalMail: ApprovalMailService;
  flow: ApprovalFlowService;
  logger: AppLoggerService;
  config: ConfigService;
  cache: MailCacheService;
};
