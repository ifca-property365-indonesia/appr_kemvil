import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';
import * as QRCode from 'qrcode';
import { DatabaseService } from '../../common/database/database.service';
import { FtpService } from '../../common/ftp/ftp.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';

/** Folder di FTP (relatif terhadap root user FTP); dibuat bila belum ada. */
const QR_DIR = 'qrcode';
const APPR_TYPE = 'C';
const DEFAULT_MODULE = 'PR';
/** Lokasi QR per dokumen per level (lihat database/002_create_approval_qrcode.sql). */
const QR_TABLE = 'mgr.approval_qrcode';
/** Awalan balasan sukses; dibaca SP x_send_qrcode_po_request. */
export const QR_SUCCESS_PREFIX = 'QR code berhasil disimpan: ';

interface ApprovedRow {
  project_no: string | null;
  user_id: string;
  user_name: string | null;
  approved_date: Date | null;
  entity_name: string | null;
}

/**
 * QR code bukti approve per level, dipanggil SP approval setiap ada approve (status A).
 * Data diambil ulang dari database (bukan dari body), lalu PNG disimpan di FTP:
 *   qrcode/{entity_cd}_{doc_no}_{level_no}.png  (ditimpa bila level yang sama di-approve ulang)
 * Lokasinya dicatat di mgr.approval_qrcode (satu baris per dokumen per level).
 */
@Injectable()
export class QrCodeService implements OnModuleInit {
  constructor(
    private readonly db: DatabaseService,
    private readonly ftp: FtpService,
    private readonly logger: AppLoggerService,
    private readonly config: ConfigService,
  ) {}

  /** Buat tabel bila belum ada (sama seperti tabel token). Gagal hanya dicatat; script ada di database/. */
  async onModuleInit(): Promise<void> {
    try {
      await this.db.query(CREATE_TABLE_SQL);
    } catch (err: any) {
      this.logger
        .channel('daily')
        .warn(`Tabel ${QR_TABLE} tidak dapat dibuat otomatis (jalankan npm run migrate): ${err?.message ?? err}`);
    }
  }

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
        `SELECT a.project_no, a.user_id, u.description AS user_name, a.approved_date, e.entity_name
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
      const { url, folder } = this.config.get<{ url: string; folder: string }>('attachment');
      const fileUrl = `${url}/${folder}/${QR_DIR}/${encodeURIComponent(fileName)}`;

      // File sudah di FTP; gagal mencatat ke tabel tidak menggagalkan QR, hanya dicatat di log.
      let saved = true;
      try {
        await this.save({
          entity_cd: entityCd,
          project_no: text(rows[0].project_no) || text(body?.project_no),
          trx_type: trxType,
          module,
          doc_no: docNo,
          level_no: Number(levelNo),
          file_path: path,
          file_url: fileUrl,
        });
      } catch (err: any) {
        saved = false;
        this.logger.transaction('QR_CODE', 'GAGAL', `simpan ${QR_TABLE} doc_no ${docNo} level ${levelNo}: ${err?.message ?? err}`, {
          ...context,
          file_path: path,
        });
      }

      this.logger.transaction('QR_CODE', 'SUKSES', `${path}`, {
        ...context,
        approvers: rows.map((r) => text(r.user_id)),
        bytes: png.length,
        table: saved ? QR_TABLE : 'gagal disimpan',
        durationMs: Date.now() - started,
      });
      return `${QR_SUCCESS_PREFIX}${path}${saved ? '' : ` (gagal dicatat ke ${QR_TABLE})`}`;
    } catch (err: any) {
      const message = `QR code gagal dibuat: ${err?.message ?? err}`;
      this.logger.transaction('QR_CODE', 'GAGAL', `doc_no ${docNo} level ${levelNo}: ${err?.message ?? err}`, {
        ...context,
        durationMs: Date.now() - started,
      });
      return message;
    }
  }

  /** Satu baris per dokumen per level: perbarui bila sudah ada, tambah bila belum. */
  private async save(row: QrRecord): Promise<void> {
    const key = [row.entity_cd, row.project_no, row.trx_type, row.module, row.doc_no, row.level_no];
    await this.db.query(
      `UPDATE ${QR_TABLE} WITH (UPDLOCK, SERIALIZABLE)
       SET file_path = ?, file_url = ?, updated_at = GETDATE()
       WHERE entity_cd = ? AND project_no = ? AND trx_type = ? AND module = ? AND doc_no = ? AND level_no = ?;
       IF @@ROWCOUNT = 0
         INSERT INTO ${QR_TABLE} (entity_cd, project_no, trx_type, module, doc_no, level_no, file_path, file_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [row.file_path, row.file_url, ...key, ...key, row.file_path, row.file_url],
    );
  }
}

interface QrRecord {
  entity_cd: string;
  project_no: string;
  trx_type: string;
  module: string;
  doc_no: string;
  level_no: number;
  file_path: string;
  file_url: string;
}

/** Sama dengan database/002_create_approval_qrcode.sql. */
const CREATE_TABLE_SQL = `
IF NOT EXISTS (
    SELECT 1 FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE s.name = 'mgr' AND t.name = 'approval_qrcode'
)
BEGIN
    CREATE TABLE mgr.approval_qrcode (
        entity_cd     VARCHAR(4)    NOT NULL,
        project_no    VARCHAR(20)   NOT NULL,
        trx_type      VARCHAR(4)    NOT NULL,
        module        VARCHAR(4)    NOT NULL,
        doc_no        VARCHAR(30)   NOT NULL,
        level_no      INT           NOT NULL,
        file_path     VARCHAR(255)  NOT NULL,
        file_url      VARCHAR(500)  NULL,
        created_at    DATETIME      NOT NULL
            CONSTRAINT DF_approval_qrcode_created DEFAULT (GETDATE()),
        updated_at    DATETIME      NOT NULL
            CONSTRAINT DF_approval_qrcode_updated DEFAULT (GETDATE()),
        CONSTRAINT PK_approval_qrcode
            PRIMARY KEY (entity_cd, project_no, trx_type, module, doc_no, level_no)
    );
END`;

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
