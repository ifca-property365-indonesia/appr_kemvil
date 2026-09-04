import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../logger/app-logger.service';
import { DatabaseService } from '../database/database.service';
import { redactPayload } from '../helpers/redact.helper';
import { ViewService } from '../view/view.service';

export const APPROVAL_TABLE = 'mgr.cb_cash_request_appr';

/** Channel jejak keputusan approval -> storage/logs/approval-YYYY-MM-DD.log */
export const AUDIT_CHANNEL = 'approval';

/** Padanan `$statusOptions` pada controller lama. */
export const STATUS_OPTIONS: Record<string, [string, string, string]> = {
  A: ['Approval', '#40de1d', 'Approve'],
  R: ['Revision', '#f4bd0e', 'Revise'],
  C: ['Cancellation', '#e85347', 'Cancel'],
};

/** Padanan pemetaan status -> teks & gambar pada method update()/getaccess(). */
export function describeStatus(status: string): { descstatus: string; imagestatus: string } {
  if (status === 'A') return { descstatus: 'Approved', imagestatus: 'approved.png' };
  if (status === 'R') return { descstatus: 'Revised', imagestatus: 'revise.png' };
  return { descstatus: 'Cancelled', imagestatus: 'reject.png' };
}

export interface ProcessDataOptions {
  /** payload hasil dekripsi token URL */
  data: Record<string, any>;
  /** token asli, dikirim kembali ke form konfirmasi */
  encrypt: string;
  /** A | R | C */
  status: string;
  /** label dokumen untuk pesan, contoh: 'Contract Entry'. Default: data.text */
  text?: string;
  /** view halaman konfirmasi, contoh: 'email/cmentry/passcheckwithremark' */
  passCheckView: string;
  /** view halaman pesan, 'email.after' (CB/CM/PO/PL) atau 'email.remark.after' (Land) */
  afterView: string;
  /** true bila kondisi where ikut menyertakan approve_seq (dipakai modul Land) */
  useApproveSeq?: boolean;
  /** ikut mengirim doc_no/email/link ke view (dipakai template remark & generic) */
  withDocumentContext?: boolean;
  /** nilai `link` pada form action view remark */
  link?: string;
  /** field tambahan yang dikirim ke view */
  extraViewData?: Record<string, any>;
  /** default entity_name bila payload tidak memuatnya */
  defaultEntityName?: string;
}

export interface RunProcedureOptions {
  status: string;
  /** label dokumen untuk pesan sukses/gagal, contoh 'Contract Entry' */
  label: string;
  docNo: string;
  entityName?: string;
  afterView: string;
  procedure: string;
  params: any[];
  /** 'OK' (CB/CM/PO/PL) atau 'FAIL' (Land) saat gagal */
  failStatusText?: string;
}

/**
 * Logika bersama `processData()` dan `update()/getaccess()` yang diulang di
 * hampir seluruh controller Laravel. Dipisah agar setiap module hanya perlu
 * mendeklarasikan perbedaannya (nama view, stored procedure, label dokumen).
 */
@Injectable()
export class ApprovalFlowService {
  constructor(
    private readonly db: DatabaseService,
    private readonly view: ViewService,
    private readonly logger: AppLoggerService,
  ) {}

  /**
   * Padanan `processData($status, $encrypt)`:
   *  1. tolak bila dokumen sudah pernah diproses (status A/R/C)
   *  2. tolak bila dokumen tidak ada / tidak berstatus P
   *  3. selain itu tampilkan halaman konfirmasi
   */
  async processData(options: ProcessDataOptions): Promise<string> {
    const data = options.data ?? {};
    const text = options.text ?? data.text ?? '';
    const entityName = data.entity_name ?? options.defaultEntityName ?? 'PT Bekasi Fajar';

    // Alamat email disamarkan: log harian tersimpan 30 hari.
    this.logger
      .channel('daily')
      .info(`Decrypted data: ${JSON.stringify(redactPayload(data))}`);

    const where: Record<string, any> = {
      doc_no: data.doc_no,
      entity_cd: data.entity_cd,
      level_no: data.level_no,
      type: data.type,
      module: data.type_module,
    };
    if (options.useApproveSeq) {
      where.approve_seq = data.approve_seq;
    }

    const alreadyProcessed = await this.db.exists(APPROVAL_TABLE, where, {
      status: ['A', 'R', 'C'],
    });

    if (alreadyProcessed) {
      this.logger
        .channel(AUDIT_CHANNEL)
        .warn(`DITOLAK (sudah pernah diproses) ${text} No. ${data.doc_no}`, {
          ...where,
          status_diminta: options.status,
          entity_name: entityName,
        });

      return this.view.render(options.afterView, {
        Pesan: `You Have Already Made a Request to ${text} No. ${data.doc_no}`,
        St: 'OK',
        notif: 'Restricted !',
        image: 'double_approve.png',
        entity_name: entityName,
      });
    }

    const stillPending = await this.db.exists(APPROVAL_TABLE, { ...where, status: 'P' });

    if (!stillPending) {
      this.logger
        .channel(AUDIT_CHANNEL)
        .warn(`DITOLAK (dokumen tidak ada atau bukan status P) ${text} No. ${data.doc_no}`, {
          ...where,
          status_diminta: options.status,
          entity_name: entityName,
        });

      return this.view.render(options.afterView, {
        Pesan: `There is no ${text} with No. ${data.doc_no}`,
        St: 'OK',
        notif: 'Restricted !',
        image: 'double_approve.png',
        entity_name: entityName,
      });
    }

    const statusData = STATUS_OPTIONS[options.status] ?? STATUS_OPTIONS.C;

    this.logger
      .channel(AUDIT_CHANNEL)
      .info(`AKSES halaman konfirmasi ${statusData[2]} ${text} No. ${data.doc_no}`, {
        ...where,
        status_diminta: options.status,
        entity_name: entityName,
      });

    const viewData: Record<string, any> = {
      status: options.status,
      encrypt: options.encrypt,
      name: statusData[0],
      bgcolor: statusData[1],
      valuebt: statusData[2],
      entity_name: entityName,
      ...(options.extraViewData ?? {}),
    };

    if (options.withDocumentContext) {
      viewData.doc_no = data.doc_no;
      viewData.email = data.email_address ?? data.email_addr ?? '';
      if (options.link) viewData.link = options.link;
    }

    return this.view.render(options.passCheckView, viewData);
  }

  /**
   * Padanan bagian akhir `update()/getaccess()`: jalankan stored procedure lalu
   * tampilkan halaman hasil.
   */
  async runProcedure(options: RunProcedureOptions): Promise<string> {
    const { descstatus, imagestatus } = describeStatus(options.status);
    const audit = this.logger.channel(AUDIT_CHANNEL);

    const context = {
      doc_no: options.docNo,
      status: options.status,
      keputusan: descstatus,
      label: options.label,
      entity_name: options.entityName ?? '',
      procedure: options.procedure,
    };

    audit.info(`MULAI ${descstatus} ${options.label} No. ${options.docNo}`, context);

    const started = Date.now();
    let success = true;
    let returnCode: number | null = null;

    try {
      const result = await this.db.execProcedureDetailed(options.procedure, options.params);
      success = result.ok;
      returnCode = result.returnCode;
    } catch (err: any) {
      success = false;
      const message = err?.message ?? String(err);

      this.logger.channel('daily').error(`Gagal menjalankan ${options.procedure}: ${message}`);
      audit.error(`GAGAL ${descstatus} ${options.label} No. ${options.docNo}: ${message}`, {
        ...context,
        durationMs: Date.now() - started,
      });
    }

    if (success) {
      audit.info(`SUKSES ${descstatus} ${options.label} No. ${options.docNo}`, {
        ...context,
        return_code: returnCode,
        durationMs: Date.now() - started,
      });
    }

    const message = success
      ? `You Have Successfully ${descstatus} the ${options.label} No. ${options.docNo}`
      : `You Failed to ${descstatus} the ${options.label} No.${options.docNo}`;

    return this.view.render(options.afterView, {
      Pesan: message,
      St: success ? 'OK' : (options.failStatusText ?? 'OK'),
      notif: success ? `${descstatus} !` : `Fail to ${descstatus} !`,
      image: success ? imagestatus : 'reject.png',
      entity_name: options.entityName ?? '',
    });
  }

  /** Halaman pesan umum (dipakai penanganan error). */
  renderMessage(
    afterView: string,
    payload: { Pesan: string; St?: string; notif?: string; image?: string; entity_name?: string },
  ): string {
    return this.view.render(afterView, {
      St: 'OK',
      notif: 'Restricted !',
      image: 'reject.png',
      entity_name: 'PT Bekasi Fajar',
      ...payload,
    });
  }

  /**
   * Padanan normalisasi `reason` pada update()/getaccess().
   * `mode = 'zero'`  -> string kosong menjadi '0'          (CB/CM/PO/PL)
   * `mode = 'text'`  -> string kosong menjadi 'no reason'  (Land)
   */
  static normalizeReason(reason: any, mode: 'zero' | 'text' = 'zero'): string {
    const raw = reason === null || reason === undefined ? '' : String(reason);
    if (mode === 'text') {
      return raw.trim() === '' ? 'no reason' : raw;
    }
    return raw === '' ? '0' : raw;
  }
}
