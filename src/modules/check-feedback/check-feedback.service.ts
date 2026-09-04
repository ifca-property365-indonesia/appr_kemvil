import { Injectable } from '@nestjs/common';
import { MailCacheService } from '../../common/cache/mail-cache.service';
import { DatabaseService } from '../../common/database/database.service';
import {
  APPROVED_TOP_LEVEL_SQL,
  resolveFeedbackTarget,
} from '../../common/helpers/feedback-map.helper';
import { parseDate } from '../../common/helpers/format.helper';
import { AppLoggerService } from '../../common/logger/app-logger.service';

export interface PendingFeedback {
  doc_no: string;
  entity_cd: string;
  approve_seq: string;
  module: string;
  type: string;
  descs_long: string;
  cache_path: string;
}

/**
 * Migrasi dari app/Http/Controllers/CheckFeedbackController.php
 *
 * Hanya melaporkan dokumen yang sudah disetujui tetapi belum punya penanda
 * cache email feedback (versi Laravel melakukan `var_dump($doc_no)`).
 */
@Injectable()
export class CheckFeedbackService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: MailCacheService,
    private readonly logger: AppLoggerService,
  ) {}

  /** GET /api/checkfeedback */
  async index(): Promise<{ total: number; pending: PendingFeedback[] }> {
    const rows = await this.db.query(APPROVED_TOP_LEVEL_SQL, [new Date().getDate()]);
    const pending: PendingFeedback[] = [];
    const unmapped: string[] = [];

    for (const data of rows) {
      const target = resolveFeedbackTarget(data.TYPE, data.module);
      if (!target) {
        unmapped.push(`${trim(data.module)}/${trim(data.TYPE)}`);
        continue;
      }

      // Folder cache memakai tanggal approval dokumen, bukan tanggal hari ini.
      const approved = parseDate(data.approved_date);
      const formattedDate = approved ? approved.format('YYYYMMDD') : MailCacheService.today();

      const cacheFile = `email_feedback_sent_${trim(data.approve_seq)}_${trim(data.entity_cd)}_${trim(
        data.doc_no,
      )}_${trim(data.status)}.txt`;
      const relativeDir = `${target.folder}/${formattedDate}`;

      this.cache.ensureDirectory(relativeDir);

      if (!this.cache.exists(relativeDir, cacheFile)) {
        pending.push({
          doc_no: trim(data.doc_no),
          entity_cd: trim(data.entity_cd),
          approve_seq: trim(data.approve_seq),
          module: trim(data.module),
          type: trim(data.TYPE),
          descs_long: target.descsLong,
          cache_path: this.cache.markerPath(relativeDir, cacheFile),
        });
      }
    }

    if (unmapped.length > 0) {
      this.logger
        .channel('sendmailfeedback')
        .warn('CheckFeedback: kombinasi module/type tanpa pemetaan feedback', {
          kombinasi: Array.from(new Set(unmapped)),
        });
    }

    this.logger.channel('sendmailfeedback').info('CheckFeedback selesai', {
      diperiksa: rows.length,
      belum_terkirim: pending.length,
      doc_no: pending.map((item) => item.doc_no),
    });

    return { total: pending.length, pending };
  }
}

function trim(value: any): string {
  return String(value ?? '').trimEnd();
}
