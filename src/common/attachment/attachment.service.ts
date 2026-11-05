import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'basic-ftp';
import { AppLoggerService } from '../logger/app-logger.service';

/** Daftar link + nama file yang dibaca template email (`url_file[i]` <-> `file_name[i]`). */
export interface AttachmentLinks {
  url_file: string[];
  file_name: string[];
}

/** Batas tunggu FTP: SP menunggu balasan /api/maildata, jadi jangan terlalu lama. */
const FTP_TIMEOUT_MS = 10000;

/**
 * Attachment email approval, dibaca langsung dari FTP dan dipakai semua module.
 *
 * File milik dokumen dikenali dari namanya: {entity_cd}_{doc_no}_{apa saja}.
 * Link: URL_PDF/{LIVE|TRAIN}/{dir}/{nama file}, `dir` adalah folder milik module.
 * User FTP mengikuti STATUS_PDF (lihat `ftp.username` pada configuration.ts).
 */
@Injectable()
export class AttachmentService {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
  ) {}

  /** Gagal membaca FTP tidak menggagalkan email: dicatat, lalu email terkirim tanpa link. */
  async links(dir: string, entityCd: string, docNo: string): Promise<AttachmentLinks> {
    const context = { entity_cd: entityCd, doc_no: docNo, dir };
    const started = Date.now();

    try {
      const files = matchFiles(await this.list(dir), entityCd, docNo);
      const { url, folder } = this.config.get<{ url: string; folder: string }>('attachment');

      this.logger.transaction('FTP_ATTACHMENT', 'SUKSES', `${files.length} file doc_no ${docNo}`, {
        ...context,
        files,
        durationMs: Date.now() - started,
      });

      return {
        url_file: files.map((file) => `${url}/${folder}/${dir}/${encodeURIComponent(file)}`),
        file_name: files,
      };
    } catch (err: any) {
      this.logger.transaction('FTP_ATTACHMENT', 'GAGAL', `doc_no ${docNo}: ${err?.message ?? err}`, {
        ...context,
        durationMs: Date.now() - started,
      });
      return { url_file: [], file_name: [] };
    }
  }

  /** Nama seluruh file (bukan folder) di dalam `dir`. */
  private async list(dir: string): Promise<string[]> {
    const ftp = this.config.get('ftp');
    const client = new Client(FTP_TIMEOUT_MS);

    try {
      await client.access({
        host: ftp.host,
        port: ftp.port,
        user: ftp.username,
        password: ftp.password,
      });
      const entries = await client.list(dir);
      return entries.filter((entry) => entry.isFile).map((entry) => entry.name);
    } finally {
      client.close();
    }
  }
}

/** `_` wajib setelah doc_no supaya PR26100033 tidak ikut mengambil file PR261000330. */
export function matchFiles(names: string[], entityCd: string, docNo: string): string[] {
  if (!entityCd || !docNo) return [];

  const prefix = `${entityCd}_${docNo}_`.toLowerCase();
  return names.filter((name) => name.toLowerCase().startsWith(prefix)).sort();
}
