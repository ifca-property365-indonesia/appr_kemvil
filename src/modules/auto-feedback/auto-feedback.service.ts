import { Injectable } from '@nestjs/common';
import { MailCacheService } from '../../common/cache/mail-cache.service';
import { DatabaseService } from '../../common/database/database.service';
import {
  APPROVED_TOP_LEVEL_SQL,
  resolveFeedbackTarget,
} from '../../common/helpers/feedback-map.helper';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { parseDate } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/AutoFeedbackController.php
 *
 * Menjalankan stored procedure pengirim email feedback untuk dokumen yang hari
 * ini sudah disetujui pada level tertinggi dan belum punya penanda cache.
 */
@Injectable()
export class AutoFeedbackService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: MailCacheService,
    private readonly logger: AppLoggerService,
  ) {}

  /** GET /api/autofeedback */
  async index(): Promise<{ processed: number; skipped: number; documents: string[] }> {
    const rows = await this.db.query(APPROVED_TOP_LEVEL_SQL, [new Date().getDate()]);

    const documents: string[] = [];
    let processed = 0;
    let skipped = 0;

    for (const data of rows) {
      const target = resolveFeedbackTarget(data.TYPE, data.module);
      if (!target) {
        skipped += 1;
        continue;
      }

      const cacheFile = `email_feedback_sent_${trim(data.approve_seq)}_${trim(data.entity_cd)}_${trim(
        data.doc_no,
      )}_${trim(data.status)}.txt`;
      const relativeDir = `${target.folder}/${MailCacheService.today()}`;

      this.cache.ensureDirectory(relativeDir);

      if (this.cache.exists(relativeDir, cacheFile)) {
        skipped += 1;
        continue;
      }

      await this.db.execProcedure(target.exec, [
        data.entity_cd,
        data.doc_no,
        data.level_no,
        data.status,
        data.TYPE,
        data.module,
        '(APPROVED)',
        target.descsLong,
        '0',
      ]);

      documents.push(String(data.doc_no ?? '').trim());
      processed += 1;
    }

    this.logger
      .channel('daily')
      .info(`AutoFeedback selesai: ${processed} diproses, ${skipped} dilewati`);

    return { processed, skipped, documents };
  }
}

function trim(value: any): string {
  if (value instanceof Date) {
    const parsed = parseDate(value);
    return parsed ? parsed.format('YYYY-MM-DD') : '';
  }
  return String(value ?? '').trim();
}
