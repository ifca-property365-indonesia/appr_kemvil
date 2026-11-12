import { Injectable } from '@nestjs/common';
import { MailCacheService } from '../../common/cache/mail-cache.service';
import { DatabaseService } from '../../common/database/database.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';

/** SP yang sama dengan alur approval; level_no '0' = lewati update, hanya kirim email ke level 'O' / 'M'. */
const PROCEDURE = 'mgr.x_send_mail_approval_po_request';
/** Folder & prefix penanda email approval, sama dengan PoRequestService.send(). */
const APPROVAL_CACHE_DIR = 'send_porequest';
const MARKER_PREFIX = 'email_sent_';
const APPR_TYPE = 'C';
const APPR_MODULE = 'PR';

/** Satu approver di level yang sedang ditunggu. */
interface PendingRow {
  entity_cd: string;
  entity_name: string | null;
  project_no: string;
  doc_no: string;
  trx_type: string;
  module: string;
  level_no: number;
  user_id: string;
  user_name: string | null;
  request_date: Date | null;
  descs: string | null;
}

export interface PendingDocument {
  entity_cd: string;
  entity_name: string;
  project_no: string;
  doc_no: string;
  trx_type: string;
  module: string;
  request_date: string | null;
  descs: string;
  level_no: number;
  approvers: Array<{ user_id: string; user_name: string }>;
}

export interface ResendResult {
  ok: boolean;
  message: string;
  recipients: Array<{ user_id: string; level_no: string; sent: boolean; response: string }>;
}

/**
 * Hanya level 'O' terendah per dokumen: level sebelumnya sudah approve, level sesudahnya masih 'N'.
 * 'M' ikut dihitung: level terkecil setelah reset Modify, saat diajukan ulang dari awal.
 * Dokumen yang sudah final (A), diminta revisi (M) atau ditolak (C) tidak ikut.
 */
const PENDING_SQL = `
SELECT a.entity_cd, e.entity_name, a.project_no, a.doc_no, a.trx_type, a.module,
       a.level_no, a.user_id, u.description AS user_name,
       h.request_date, COALESCE(h.descs, a.remarks) AS descs
FROM mgr.po_authorized_person a WITH (NOLOCK)
LEFT JOIN mgr.po_request_hd h WITH (NOLOCK)
       ON h.entity_cd = a.entity_cd AND h.request_no = a.doc_no AND h.request_trx_type = a.trx_type
LEFT JOIN mgr.security_users u WITH (NOLOCK) ON u.name = a.user_id
LEFT JOIN mgr.cf_entity e WITH (NOLOCK) ON e.entity_cd = a.entity_cd
WHERE a.type = ? AND a.module = ? AND a.status IN ('O', 'M')
  AND a.level_no = (SELECT MIN(l.level_no)
                    FROM mgr.po_authorized_person l WITH (NOLOCK)
                    WHERE l.entity_cd = a.entity_cd AND l.doc_no = a.doc_no
                      AND l.type = a.type AND l.module = a.module AND l.trx_type = a.trx_type
                      AND l.status IN ('O', 'M'))
  AND ISNULL(h.approved_status, '') NOT IN ('A', 'M', 'C')
`;

/**
 * Daftar approval yang masih menunggu dan kirim ulang emailnya
 * (padanan ApprListControllers::getData() / sendData() di Laravel).
 */
@Injectable()
export class ApprListService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: MailCacheService,
    private readonly logger: AppLoggerService,
  ) {}

  async pending(): Promise<PendingDocument[]> {
    const rows = await this.db.query<PendingRow>(
      `${PENDING_SQL} ORDER BY a.doc_no DESC, a.entity_cd, a.user_id`,
      [APPR_TYPE, APPR_MODULE],
    );

    const docs = new Map<string, PendingDocument>();
    for (const row of rows) {
      const entityCd = text(row.entity_cd);
      const docNo = text(row.doc_no);
      const key = `${entityCd}|${docNo}`;

      let doc = docs.get(key);
      if (!doc) {
        doc = {
          entity_cd: entityCd,
          entity_name: text(row.entity_name),
          project_no: text(row.project_no),
          doc_no: docNo,
          trx_type: text(row.trx_type),
          module: text(row.module),
          request_date: row.request_date ? new Date(row.request_date).toISOString() : null,
          descs: text(row.descs),
          level_no: Number(row.level_no),
          approvers: [],
        };
        docs.set(key, doc);
      }

      const userId = text(row.user_id);
      doc.approvers.push({ user_id: userId, user_name: text(row.user_name) || userId });
    }

    return [...docs.values()];
  }

  /**
   * Kirim ulang email ke approver level yang sedang ditunggu. Data diambil ulang dari database
   * (bukan dari browser), penanda hari ini dihapus supaya tidak dianggap sudah terkirim,
   * lalu SP dijalankan dengan level_no '0' sehingga tidak ada status yang berubah.
   */
  async resend(entityCdInput: any, docNoInput: any): Promise<ResendResult> {
    const entityCd = text(entityCdInput);
    const docNo = text(docNoInput);
    const context = { entity_cd: entityCd, doc_no: docNo };

    if (!entityCd || !docNo) {
      return { ok: false, message: 'entity_cd and doc_no are required', recipients: [] };
    }

    this.logger.transaction('RESEND_APPROVAL', 'MULAI', `doc_no ${docNo}`, context);

    const rows = await this.db.query<PendingRow>(
      `${PENDING_SQL} AND a.entity_cd = ? AND a.doc_no = ?`,
      [APPR_TYPE, APPR_MODULE, entityCd, docNo],
    );
    if (rows.length === 0) {
      const message = `${docNo} is not waiting for approval (already processed or not found)`;
      this.logger.transaction('RESEND_APPROVAL', 'LEWAT', message, context);
      return { ok: false, message, recipients: [] };
    }

    // Penanda dibuat per tanggal; yang memblokir pengiriman hanya penanda hari ini.
    const today = `${APPROVAL_CACHE_DIR}/${MailCacheService.today()}`;
    for (const row of rows) {
      this.cache.forget(today, markerName(entityCd, docNo, String(row.level_no), text(row.user_id)).replace(/\.txt$/, ''));
    }

    const first = rows[0];
    try {
      const result = await this.db.execProcedureDetailed(PROCEDURE, [
        entityCd,
        text(first.project_no),
        docNo,
        text(first.trx_type),
        text(first.module),
        '',
        '0',
        '',
        null,
      ]);

      const log = result.recordsets.find((set) => set?.[0] && 'SentOk' in set[0]) ?? [];
      const recipients = log.map((r: any) => ({
        user_id: text(r.UserId),
        level_no: text(r.LevelNo),
        sent: r.SentOk === true || r.SentOk === 1,
        response: text(r.ResponseText) || text(r.OleError),
      }));
      const ok = recipients.length > 0 && recipients.every((r) => r.sent);
      const message = recipients.length === 0
        ? 'Procedure finished without any recipient'
        : `${recipients.filter((r) => r.sent).length} of ${recipients.length} email(s) sent`;

      this.logger.transaction('RESEND_APPROVAL', ok ? 'SUKSES' : 'GAGAL', `doc_no ${docNo}: ${message}`, {
        ...context,
        recipients,
      });
      return { ok, message, recipients };
    } catch (err: any) {
      const message = `Failed to run the procedure: ${err?.message ?? err}`;
      this.logger.transaction('RESEND_APPROVAL', 'GAGAL', `doc_no ${docNo}: ${message}`, context);
      return { ok: false, message, recipients: [] };
    }
  }
}

/** Nama penanda yang ditulis PoRequestService.send(): email_sent_{entity}_{doc}_{level}_{user}.txt */
function markerName(entityCd: string, docNo: string, levelNo: string, userId: string): string {
  return `${MARKER_PREFIX}${entityCd}_${docNo}_${levelNo}_${userId}.txt`;
}

function text(value: any): string {
  return value === null || value === undefined ? '' : String(value).trim();
}
