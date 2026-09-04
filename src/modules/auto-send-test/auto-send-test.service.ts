import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';
import { FormatHelper } from '../../common/helpers/format.helper';
import { AppLoggerService } from '../../common/logger/app-logger.service';

/**
 * Migrasi dari app/Http/Controllers/AutoSendTestController.php
 *
 * Versi Laravel hanya menyiapkan statement dan menampilkannya lewat `var_dump()`
 * tanpa `execute()`. Perilaku "dry run" itu dipertahankan: endpoint ini hanya
 * mengembalikan daftar perintah yang akan dijalankan, bukan menjalankannya.
 */
@Injectable()
export class AutoSendTestService {
  private static readonly SP_MAP: Record<string, Record<string, string>> = {
    CB: {
      U: 'mgr.x_send_mail_approval_cb_ppu',
      V: 'mgr.x_send_mail_approval_cb_ppu_vvip',
      D: 'mgr.x_send_mail_approval_cb_rpb',
      G: 'mgr.x_send_mail_approval_cb_rum',
    },
    CM: {
      E: 'mgr.xrl_send_mail_approval_cm_contract_entry',
      A: 'mgr.xrl_send_mail_approval_cm_progress',
      C: 'mgr.xrl_send_mail_approval_cm_contractclose',
      B: 'mgr.xrl_send_mail_approval_cm_contractdone',
      D: 'mgr.xrl_send_mail_approval_cm_varianorder',
    },
    PL: {
      B: 'mgr.xrl_send_mail_approval_pl_budget_lyman',
      R: 'mgr.xrl_send_mail_approval_pl_budget_revision',
    },
    PO: {
      A: 'mgr.x_send_mail_approval_po_order',
    },
  };

  constructor(
    private readonly db: DatabaseService,
    private readonly logger: AppLoggerService,
  ) {}

  /** GET /api/autosendtest */
  async index(): Promise<{ count: number; statements: string[] }> {
    const rows = await this.db.query(`
      SELECT * FROM mgr.cb_cash_request_appr
      WHERE sent_mail IS NOT NULL AND status = 'P'
      ORDER BY entity_cd DESC, doc_no DESC
    `);

    const statements: string[] = [];
    const supervisor = 'Y';
    const reason = '0';

    for (const data of rows) {
      const entityCd = data.entity_cd;
      const projectNo = `${String(entityCd ?? '').replace(/ /g, '')}01`;
      const type = data.TYPE;
      const module = data.module;
      const levelNo = Number(data.level_no);

      const userGroup = await this.db.value<string>(
        'SELECT TOP 1 group_name FROM mgr.security_groupings WHERE user_name = ?',
        [data.user_id],
      );

      const status = levelNo === 1 ? 'P' : 'A';
      const downLevel = levelNo === 1 ? '0' : String(levelNo - 1);
      const date = FormatHelper.dateShort(data.doc_date);

      if (type === 'S' && module === 'PO') {
        statements.push(
          `SET NOCOUNT ON; EXEC mgr.x_send_mail_approval_po_selection ${entityCd}, ${projectNo},${data.doc_no},${data.ref_no},${date},${status},${downLevel},${userGroup},${data.user_id},${supervisor},${reason}`,
        );
        continue;
      }

      if (type === 'Q' && module === 'PO') {
        statements.push(
          `SET NOCOUNT ON; EXEC mgr.x_send_mail_approval_po_request ${entityCd}, ${projectNo},${data.doc_no},${status},${downLevel},${userGroup},${data.user_id},${supervisor},${reason}`,
        );
        continue;
      }

      const exec = AutoSendTestService.SP_MAP[module]?.[type];
      if (!exec) continue;

      if (module === 'CM') {
        statements.push(
          `SET NOCOUNT ON; EXEC ${exec} ${entityCd}, ${projectNo},${data.doc_no},${data.ref_no},${status},${downLevel},${userGroup},${data.user_id},${supervisor},${reason}`,
        );
      } else {
        statements.push(
          `SET NOCOUNT ON; EXEC ${exec} ${entityCd}, ${projectNo},${data.doc_no},${data.trx_type},${status},${downLevel},${userGroup},${data.user_id},${supervisor},${reason}`,
        );
      }
    }

    this.logger.channel('daily').info('AutoSendTest (dry run) selesai', {
      dokumen_pending: rows.length,
      statement_disiapkan: statements.length,
      dilewati: rows.length - statements.length,
    });

    return { count: rows.length, statements };
  }
}
