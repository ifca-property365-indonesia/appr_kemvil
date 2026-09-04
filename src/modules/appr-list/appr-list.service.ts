import { Injectable } from '@nestjs/common';
import { MailCacheService } from '../../common/cache/mail-cache.service';
import { DatabaseService } from '../../common/database/database.service';
import { dataTables, DataTablesResponse } from '../../common/helpers/datatables.helper';
import { FormatHelper } from '../../common/helpers/format.helper';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { ViewService } from '../../common/view/view.service';

interface ResendRoute {
  dir: string;
  proc: string;
  params: any[];
}

/**
 * Migrasi dari app/Http/Controllers/ApprListControllers.php
 *
 * - index()    : halaman daftar approval yang masih pending
 * - getData()  : sumber data DataTables (server-side)
 * - sendData() : kirim ulang email approval untuk satu dokumen
 */
@Injectable()
export class ApprListService {
  constructor(
    private readonly db: DatabaseService,
    private readonly view: ViewService,
    private readonly cache: MailCacheService,
    private readonly logger: AppLoggerService,
  ) {}

  index(): string {
    return this.view.render('apprlist.index');
  }

  /**
   * Padanan subquery ROW_NUMBER() + filter rn = 1 pada versi Laravel:
   * mengambil level approval terendah untuk tiap (doc_no, entity_cd, approve_seq)
   * yang masih berstatus P.
   */
  async getData(query: Record<string, any>): Promise<DataTablesResponse> {
    const rows = await this.db.query(`
      SELECT * FROM (
        SELECT *,
               ROW_NUMBER() OVER (
                   PARTITION BY doc_no, entity_cd, approve_seq
                   ORDER BY level_no ASC
               ) AS rn
        FROM mgr.cb_cash_request_appr
        WHERE status = 'P'
          AND currency_cd IS NOT NULL
          AND LTRIM(RTRIM(entity_cd)) NOT LIKE '%[^0-9]%'
      ) AS cte
      WHERE rn = 1
      ORDER BY doc_no DESC
    `);

    return dataTables(rows, query);
  }

  /** Padanan `sendData(Request $request)`. */
  async sendData(body: Record<string, any>): Promise<{ message: string; status: number }> {
    const entityCd = body.entity_cd;
    const docNo = body.doc_no;
    const userId = body.user_id;
    const approveSeq = body.approve_seq;

    this.logger
      .channel('resend')
      .info('Received Data: ', { entity_cd: entityCd, doc_no: docNo, user_id: userId });

    const query = await this.db.first(
      'SELECT TOP 1 * FROM mgr.cb_cash_request_appr WHERE entity_cd = ? AND doc_no = ? AND user_id = ?',
      [entityCd, docNo, userId],
    );

    const projectNo = await this.db.value<string>(
      'SELECT TOP 1 project_no FROM mgr.pl_project WHERE entity_cd = ?',
      [entityCd],
    );

    const userGroup = await this.db.value<string>(
      'SELECT TOP 1 group_name FROM mgr.security_groupings WHERE user_name = ?',
      [userId],
    );

    const spv = await this.db.value<string>(
      'SELECT TOP 1 supervisor FROM mgr.security_users WHERE name = ?',
      [userId],
    );

    const trxType = query?.trx_type ?? null;
    const type = query?.TYPE ?? null;
    const module = query?.module ?? null;
    const refNo = query?.ref_no ?? null;
    const trxDate = query?.doc_date ? FormatHelper.dateShort(query.doc_date) : null;
    const levelNo = query?.level_no ?? body.level_no;
    const reason = '0';

    const statussend = Number(levelNo) === 1 ? 'P' : 'A';
    const downLevel = Number(levelNo) === 1 ? '0' : Number(levelNo) - 1;

    const date = MailCacheService.today();
    const pattern = `email_sent_${trim(approveSeq)}_${trim(entityCd)}_${trim(docNo)}_${trim(levelNo)}`;

    const common = [entityCd, projectNo, docNo, trxType, statussend, downLevel, userGroup, userId, spv, reason];
    const withRef = [entityCd, projectNo, docNo, refNo, statussend, downLevel, userGroup, userId, spv, reason];
    const landParams = [entityCd, docNo, statussend, downLevel, reason];

    const routes: Record<string, Record<string, ResendRoute>> = {
      CB: {
        E: { dir: `send_cbfupd/${date}`, proc: 'mgr.x_send_mail_approval_cb_fupd', params: common },
        U: { dir: `send_cbppu/${date}`, proc: 'mgr.x_send_mail_approval_cb_ppu', params: common },
        V: { dir: `send_cbppuvvip/${date}`, proc: 'mgr.x_send_mail_approval_cb_ppu_vvip', params: common },
        D: { dir: `send_cbrpb/${date}`, proc: 'mgr.x_send_mail_approval_cb_rpb', params: common },
        G: { dir: `send_cbrum/${date}`, proc: 'mgr.x_send_mail_approval_cb_rum', params: common },
      },
      CM: {
        C: { dir: `send_cmclose/${date}`, proc: 'mgr.xrl_send_mail_approval_cm_contractclose', params: withRef },
        B: { dir: `send_cmdone/${date}`, proc: 'mgr.xrl_send_mail_approval_cm_contractdone', params: withRef },
        E: { dir: `send_cmentry/${date}`, proc: 'mgr.xrl_send_mail_approval_cm_contract_entry', params: withRef },
        A: { dir: `send_cmprogress/${date}`, proc: 'mgr.xrl_send_mail_approval_cm_progress', params: withRef },
        F: { dir: `send_cmprogresswu/${date}`, proc: 'mgr.xrl_send_mail_approval_cm_progress_with_unit', params: withRef },
        D: { dir: `send_varianorder/${date}`, proc: 'mgr.xrl_send_mail_approval_cm_varianorder', params: withRef },
      },
      LM: {
        D: { dir: `send_Land_Boundary/${date}`, proc: 'mgr.xrl_send_mail_approval_land_boundary', params: landParams },
        O: { dir: `send_Land_Ccancel_NOP/${date}`, proc: 'mgr.xrl_send_mail_approval_land_cancel_nop', params: landParams },
        '1': { dir: `send_Land_Change_Name/${date}`, proc: 'mgr.xrl_send_mail_approval_land_change_name', params: landParams },
        U: { dir: `send_Land_Extension_SHGB/${date}`, proc: 'mgr.xrl_send_mail_approval_land_extension_shgb', params: landParams },
        F: { dir: `send_Land_Fph/${date}`, proc: 'mgr.xrl_send_mail_approval_land_fph', params: landParams },
        M: { dir: `send_Land_Handover_Legal/${date}`, proc: 'mgr.xrl_send_mail_approval_land_handover_legal', params: landParams },
        H: { dir: `send_Land_Handover_SHGB/${date}`, proc: 'mgr.xrl_send_mail_approval_land_handover_shgb', params: landParams },
        B: { dir: `send_Land_Map/${date}`, proc: 'mgr.xrl_send_mail_approval_land_map', params: landParams },
        K: { dir: `send_Land_Measuring/${date}`, proc: 'mgr.xrl_send_mail_approval_land_measuring', params: landParams },
        A: { dir: `send_Land_Measuring_SFT/${date}`, proc: 'mgr.xrl_send_mail_approval_land_measuring_sft', params: landParams },
        J: { dir: `send_Land_Merge_SHGB/${date}`, proc: 'mgr.xrl_send_mail_approval_land_sft_merge_shgb', params: landParams },
        R: { dir: `send_Land_Request/${date}`, proc: 'mgr.xrl_send_mail_approval_land_request', params: landParams },
        Y: { dir: `send_Land_SFT_BPHTB/${date}`, proc: 'mgr.xrl_send_mail_approval_land_sft_bphtb', params: landParams },
        X: { dir: `send_Land_SFT_Propose/${date}`, proc: 'mgr.xrl_send_mail_approval_land_sft_propose', params: landParams },
        Z: { dir: `send_Land_SFT_SHGB/${date}`, proc: 'mgr.xrl_send_mail_approval_land_sft_shgb', params: landParams },
        S: { dir: `send_Land_SPH/${date}`, proc: 'mgr.xrl_send_mail_approval_land_sph', params: landParams },
        Q: { dir: `send_Land_Split_SHGB/${date}`, proc: 'mgr.xrl_send_mail_approval_land_split_shgb', params: landParams },
        E: { dir: `send_Land_Submission/${date}`, proc: 'mgr.xrl_send_mail_approval_land_submission', params: landParams },
        V: { dir: `send_Land_Verification/${date}`, proc: 'mgr.xrl_send_mail_approval_land_Verification', params: landParams },
        '2': { dir: `send_Land_Verification_Payment/${date}`, proc: 'mgr.xrl_send_mail_approval_land_verification_payment', params: landParams },
      },
      PL: {
        X: {
          dir: `send_pl_budget_lyman/${date}`,
          proc: 'mgr.xrl_send_mail_approval_pl_budget_lyman',
          params: [entityCd, projectNo, docNo, statussend, downLevel, userId],
        },
        Y: {
          dir: `send_pl_budget_revision/${date}`,
          proc: 'mgr.xrl_send_mail_approval_pl_budget_revision',
          params: [entityCd, projectNo, docNo, trxType, statussend, downLevel, userId],
        },
        A: {
          dir: `send_Land_PL_Overwrite/${date}`,
          proc: 'mgr.xrl_send_mail_approval_pl_overwrite',
          params: [entityCd, projectNo, docNo, statussend, downLevel, reason],
        },
      },
      PO: {
        A: { dir: `send_porder/${date}`, proc: 'mgr.x_send_mail_approval_po_order', params: common },
        Q: {
          dir: `send_porequeset/${date}`,
          proc: 'mgr.x_send_mail_approval_po_request',
          params: [entityCd, projectNo, docNo, statussend, downLevel, userGroup, userId, spv, reason],
        },
        S: {
          dir: `send_pos/${date}`,
          proc: 'mgr.x_send_mail_approval_po_selection',
          params: [entityCd, projectNo, docNo, refNo, trxDate, statussend, downLevel, userGroup, userId, spv, reason],
        },
      },
    };

    // Contract Renew butuh renew_no yang diambil terlebih dahulu.
    if (module === 'TM' && type === 'R') {
      const renewNo = await this.db.value(
        'SELECT TOP 1 renew_no FROM mgr.pm_tenancy_renew WHERE entity_cd = ? AND project_no = ? AND tenant_no = ?',
        [entityCd, projectNo, refNo],
      );

      routes.TM = {
        R: {
          dir: `send_contract_renew/${date}`,
          proc: 'mgr.xrl_send_mail_approval_tm_contractrenew',
          params: [
            entityCd, projectNo, docNo, refNo, renewNo,
            statussend, downLevel, userGroup, userId, spv, reason,
          ],
        },
      };
    }

    const route = routes[module as string]?.[type as string];
    if (!route) {
      return { message: 'INVALID REQUEST', status: 400 };
    }

    this.logger
      .channel('resend_apprlist')
      .info('DELETE CACHE INIT', { dir: route.dir, pattern, date });

    const removed = this.cache.forget(route.dir, pattern);
    this.logger.channel('resend_apprlist').info('=== DELETE CACHE FILE ===', {
      directory: route.dir,
      txt_path: removed.txt,
      lock_path: removed.lock,
      removed: removed.removed,
    });

    try {
      await this.db.execProcedure(route.proc, route.params);
      return { message: 'SUCCESS', status: 200 };
    } catch (err: any) {
      this.logger.channel('resend').error(`Resend gagal: ${err?.message ?? err}`);
      return { message: 'FAILED', status: 400 };
    }
  }
}

function trim(value: any): string {
  return String(value ?? '').trim();
}
