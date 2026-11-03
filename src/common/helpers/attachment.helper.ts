import { FormatHelper } from './format.helper';

/** Bagian `attachment` dari configuration.ts (URL_PDF + STATUS_PDF). */
export interface AttachmentConfig {
  url: string;
  folder: 'LIVE' | 'TRAIN';
}

/** Daftar link + nama file yang dibaca template email (`url_file[i]` <-> `file_name[i]`). */
export interface AttachmentLinks {
  url_file: string[];
  file_name: string[];
}

/**
 * Link attachment untuk email approval, dipakai semua module.
 *
 * SP mengirim `file_attachment` (nama file, dipisah `; `); URL disusun:
 *   URL_PDF/{LIVE|TRAIN}/{dir}/{file_attachment}
 * `dir` adalah folder milik module, contoh PR: `po_pr_attach`.
 *
 * Body tanpa `file_attachment` (SP versi lama) tetap memakai `url_file` apa adanya.
 */
export function attachmentLinks(
  body: Record<string, any>,
  dir: string,
  config: AttachmentConfig,
): AttachmentLinks {
  if (body.file_attachment === undefined) {
    return {
      url_file: FormatHelper.explode('; ', body.url_file ?? 'EMPTY'),
      file_name: FormatHelper.explode('; ', body.file_name ?? 'EMPTY'),
    };
  }

  const files = FormatHelper.cleanList(body.file_attachment);

  return {
    url_file: files.map((file) => `${config.url}/${config.folder}/${dir}/${encodeURIComponent(file)}`),
    file_name: files,
  };
}
