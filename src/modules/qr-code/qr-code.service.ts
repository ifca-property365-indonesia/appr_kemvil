import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import * as QRCode from 'qrcode';
import { DatabaseService } from '../../common/database/database.service';
import { FtpService } from '../../common/ftp/ftp.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';

/** Folder di FTP (relatif terhadap root user FTP); dibuat bila belum ada. */
const QR_DIR = 'qrcode';
const APPR_TYPE = 'C';
const DEFAULT_MODULE = 'PR';
/** Awalan balasan sukses; dibaca SP x_send_qrcode_po_request. */
export const QR_SUCCESS_PREFIX = 'QR code berhasil disimpan: ';

interface ApprovedRow {
  user_id: string;
  user_name: string | null;
  approved_date: Date | null;
  entity_name: string | null;
}

/**
 * QR code bukti approve per level, dipanggil SP approval setiap ada approve (status A).
 * Data diambil ulang dari database (bukan dari body), lalu PNG disimpan di FTP:
 *   qrcode/{entity_cd}_{doc_no}_{level_no}.png  (ditimpa bila level yang sama di-approve ulang)
 */
@Injectable()
export class QrCodeService {
  constructor(
    private readonly db: DatabaseService,
    private readonly ftp: FtpService,
    private readonly logger: AppLoggerService,
  ) {}

  async create(body: Record<string, any>): Promise<string> {
    const entityCd = text(body?.entity_cd);
    const docNo = text(body?.doc_no);
    const levelNo = text(body?.level_no);
    const trxType = text(body?.trx_type);
    const module = text(body?.appr_module) || DEFAULT_MODULE;
    const userId = text(body?.user_id) || null;
    const context = { entity_cd: entityCd, doc_no: docNo, level_no: levelNo, user_id: userId };
    const started = Date.now();

    if (!entityCd || !docNo || !levelNo || !trxType) {
      const message = 'QR code tidak dibuat: entity_cd, doc_no, level_no dan trx_type wajib diisi';
      this.logger.transaction('QR_CODE', 'GAGAL', message, context);
      return message;
    }

    this.logger.transaction('QR_CODE', 'MULAI', `doc_no ${docNo} level ${levelNo}`, context);

    try {
      const rows = await this.db.query<ApprovedRow>(
        `SELECT a.user_id, u.description AS user_name, a.approved_date, e.entity_name
         FROM mgr.po_authorized_person a WITH (NOLOCK)
         LEFT JOIN mgr.security_users u WITH (NOLOCK) ON u.name = a.user_id
         LEFT JOIN mgr.cf_entity e WITH (NOLOCK) ON e.entity_cd = a.entity_cd
         WHERE a.entity_cd = ? AND a.doc_no = ? AND a.level_no = ? AND a.trx_type = ?
           AND a.module = ? AND a.type = ? AND a.status = 'A'
           AND (? IS NULL OR a.user_id = ?)
         ORDER BY a.approved_date`,
        [entityCd, docNo, levelNo, trxType, module, APPR_TYPE, userId, userId],
      );

      if (rows.length === 0) {
        const message = `QR code tidak dibuat: level ${levelNo} dokumen ${docNo} belum di-approve`;
        this.logger.transaction('QR_CODE', 'LEWAT', message, context);
        return message;
      }

      const content = qrContent(entityCd, docNo, levelNo, rows);
      const png = await QRCode.toBuffer(content, { type: 'png', errorCorrectionLevel: 'M', margin: 2, width: 300 });
      const fileName = `${safeName(entityCd)}_${safeName(docNo)}_${safeName(levelNo)}.png`;
      const path = await this.ftp.upload(QR_DIR, fileName, png);

      this.logger.transaction('QR_CODE', 'SUKSES', `${path}`, {
        ...context,
        approvers: rows.map((r) => text(r.user_id)),
        bytes: png.length,
        durationMs: Date.now() - started,
      });
      return `${QR_SUCCESS_PREFIX}${path}`;
    } catch (err: any) {
      const message = `QR code gagal dibuat: ${err?.message ?? err}`;
      this.logger.transaction('QR_CODE', 'GAGAL', `doc_no ${docNo} level ${levelNo}: ${err?.message ?? err}`, {
        ...context,
        durationMs: Date.now() - started,
      });
      return message;
    }
  }
}

/** Isi QR: teks bukti approve. Satu level bisa berisi lebih dari satu approver. */
function qrContent(entityCd: string, docNo: string, levelNo: string, rows: ApprovedRow[]): string {
  const names = rows.map((r) => text(r.user_name) || text(r.user_id)).join(', ');
  const latest = rows[rows.length - 1].approved_date;

  return [
    `Doc No: ${docNo}`,
    `Entity: ${text(rows[0].entity_name) || entityCd}`,
    `Level: ${levelNo}`,
    `Approved by: ${names}`,
    `Approved date: ${latest ? dayjs(latest).format('DD MMM YYYY HH:mm') : '-'}`,
  ].join('\n');
}

/** Bagian nama file: hanya karakter aman (huruf, angka, - dan _). */
function safeName(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, '');
}

function text(value: any): string {
  return value === null || value === undefined ? '' : String(value).trim();
}
