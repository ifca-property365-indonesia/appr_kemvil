import { Injectable } from '@nestjs/common';
import { MailCacheService } from '../../common/cache/mail-cache.service';
import { DatabaseService } from '../../common/database/database.service';
import {
  APPROVED_TOP_LEVEL_SQL,
  resolveFeedbackTarget,
} from '../../common/helpers/feedback-map.helper';
import { AppLoggerService } from '../../common/logger/app-logger.service';

/**
 * Migrasi dari app/Http/Controllers/OldFeedbackController.php
 *
 * Sama dengan AutoFeedback, tetapi memproses tanggal tertentu (versi Laravel
 * memakai nilai tetap `$day = '16'`). Di sini hari dapat dikirim lewat query
 * `?day=16`, defaultnya tetap 16 agar perilaku lama terjaga.
 *
 * Catatan: versi Laravel tidak menangani module CM pada controller ini, dan
 * nama file penanda cache-nya tidak memuat approve_seq. Keduanya dipertahankan.
 */
@Injectable()
export class OldFeedbackService {
  constructor(
    private readonly db: DatabaseService,
    private readonly cache: MailCacheService,
    private readonly logger: AppLoggerService,
  ) {}

  /** GET /api/oldfeedback */
  async index(day = 16): Promise<{ processed: number; skipped: number; documents: string[] }> {
    const rows = await this.db.query(APPROVED_TOP_LEVEL_SQL, [day]);

    const documents: string[] = [];
    let processed = 0;
    let skipped = 0;

    const now = new Date();
    const folderDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      day,
    ).padStart(2, '0')}`;

    for (const data of rows) {
      // OldFeedback hanya menangani module CB dan PO.
      if (!['CB', 'PO'].includes(String(data.module ?? '').trim())) {
        skipped += 1;
        continue;
      }

      const target = resolveFeedbackTarget(data.TYPE, data.module);
      if (!target) {
        skipped += 1;
        continue;
      }

      const cacheFile = `email_feedback_sent_${trim(data.entity_cd)}_${trim(data.doc_no)}_${trim(
        data.status,
      )}.txt`;
      const relativeDir = `${target.folder}/${folderDate}`;

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
      .info(`OldFeedback selesai: ${processed} diproses, ${skipped} dilewati`);

    return { processed, skipped, documents };
  }
}

function trim(value: any): string {
  return String(value ?? '').trim();
}
