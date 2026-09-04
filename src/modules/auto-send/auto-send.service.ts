import { Injectable } from '@nestjs/common';
import { DatabaseService, Row } from '../../common/database/database.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';

/**
 * Migrasi dari app/Http/Controllers/AutoSendController.php
 *
 * Menyisir dokumen berstatus P yang belum pernah dikirim email (sent_mail_date
 * masih NULL) lalu memanggil stored procedure pengirim email sesuai module/TYPE.
 */
@Injectable()
export class AutoSendService {
  /** Padanan `$spMap` pada versi Laravel. */
  private static readonly SP_MAP: Record<string, Record<string, string>> = {
    CB: {
      U: 'mgr.x_send_mail_approval_cb_ppu',
      V: 'mgr.x_send_mail_approval_cb_ppu_vvip',
      D: 'mgr.x_send_mail_approval_cb_rpb',
      E: 'mgr.x_send_mail_approval_cb_fupd',
      G: 'mgr.x_send_mail_approval_cb_rum',
    },
    PO: {
      A: 'mgr.x_send_mail_approval_po_order',
      Q: 'mgr.x_send_mail_approval_po_request',
    },
    LM: {
      F: 'mgr.xrl_send_mail_approval_land_fph',
      M: 'mgr.xrl_send_mail_approval_land_handover_legal',
      H: 'mgr.xrl_send_mail_approval_land_handover_shgb',
      B: 'mgr.xrl_send_mail_approval_land_map',
      K: 'mgr.xrl_send_mail_approval_land_measuring',
      A: 'mgr.xrl_send_mail_approval_land_measuring_sft',
      R: 'mgr.xrl_send_mail_approval_land_request',
      W: 'mgr.xrl_send_mail_approval_land_request_legal',
      T: 'mgr.xrl_send_mail_approval_land_sertifikat',
      Y: 'mgr.xrl_send_mail_approval_land_sft_bphtb',
      J: 'mgr.xrl_send_mail_approval_land_sft_merge_shgb',
      X: 'mgr.xrl_send_mail_approval_land_sft_propose',
      Z: 'mgr.xrl_send_mail_approval_land_sft_shgb',
      S: 'mgr.xrl_send_mail_approval_land_sph',
      Q: 'mgr.xrl_send_mail_approval_land_split_shgb',
      E: 'mgr.xrl_send_mail_approval_land_submission',
      V: 'mgr.xrl_send_mail_approval_land_verification',
      '2': 'mgr.xrl_send_mail_approval_land_verification_payment',
    },
    CM: {
      E: 'mgr.xrl_send_mail_approval_cm_contract_entry',
      C: 'mgr.xrl_send_mail_approval_cm_contractclose',
      B: 'mgr.xrl_send_mail_approval_cm_contractdone',
      A: 'mgr.xrl_send_mail_approval_cm_progress',
      D: 'mgr.xrl_send_mail_approval_cm_varianorder',
    },
  };

  constructor(
    private readonly db: DatabaseService,
    private readonly logger: AppLoggerService,
  ) {}

  /** GET /api/autosend */
  async index(): Promise<{ processed: number; skipped: number }> {
    const rows = await this.db.query(`
      SELECT * FROM mgr.cb_cash_request_appr
      WHERE sent_mail_date IS NULL
        AND status = 'P'
        AND entity_cd NOT IN ('DKY', 'DAN', 'KIA')
      ORDER BY doc_no DESC
    `);

    let processed = 0;
    let skipped = 0;
    const reason = '0';

    for (const data of rows) {
      const type = data.TYPE;
      const module = data.module;

      // CM tipe Y dan F dilewati (sama seperti versi Laravel).
      if ((type === 'Y' || type === 'F') && module === 'CM') {
        skipped += 1;
        continue;
      }

      const exec = AutoSendService.SP_MAP[module]?.[type];
      if (!exec) {
        skipped += 1;
        continue;
      }

      const levelNo = Number(data.level_no);

      if (levelNo === 1) {
        await this.dispatch(exec, data, module, 'P', 0, reason);
        processed += 1;
        continue;
      }

      const downLevel = levelNo - 1;
      const prevStatus = await this.db.value<string>(
        'SELECT TOP 1 status FROM mgr.cb_cash_request_appr WHERE doc_no = ? AND entity_cd = ? AND level_no = ?',
        [data.doc_no, data.entity_cd, downLevel],
      );

      if (String(prevStatus ?? '').trim() !== 'A') {
        skipped += 1;
        continue;
      }

      await this.dispatch(exec, data, module, 'A', downLevel, reason);
      processed += 1;
    }

    this.logger
      .channel('daily')
      .info(`AutoSend selesai: ${processed} diproses, ${skipped} dilewati`);

    return { processed, skipped };
  }

  private async dispatch(
    sp: string,
    data: Row,
    module: string,
    status: string,
    downLevel: number,
    reason: string,
  ): Promise<void> {
    if (module === 'LM') {
      await this.execSpLM(sp, data.entity_cd, data.doc_no, status, downLevel, reason);
      return;
    }
    if (module === 'CM') {
      await this.execSpRefNo(sp, data, status, downLevel, reason);
      return;
    }
    if (module === 'PL') {
      await this.execPL(sp, data, status, downLevel, reason);
      return;
    }
    await this.execSpDefault(sp, data, status, downLevel, reason);
  }

  /** SP untuk CB & PO selain PO Selection (10 parameter). */
  private async execSpDefault(
    sp: string,
    data: Row,
    status: string,
    downLevel: number,
    reason: string,
  ): Promise<void> {
    const projectNo = `${String(data.entity_cd ?? '').replace(/ /g, '')}01`;
    const { userGroup, supervisor } = await this.userInfo(data.user_id);

    await this.db.execProcedure(sp, [
      data.entity_cd,
      projectNo,
      data.doc_no,
      data.trx_type,
      status,
      downLevel,
      userGroup,
      data.user_id,
      supervisor,
      reason,
    ]);
  }

  /** SP khusus module Land (5 parameter). */
  private async execSpLM(
    sp: string,
    entityCd: any,
    docNo: any,
    status: string,
    level: number,
    reason: string,
  ): Promise<void> {
    await this.db.execProcedure(sp, [entityCd, docNo, status, level, reason]);
  }

  /** SP untuk CM (10 parameter, memakai ref_no). */
  private async execSpRefNo(
    sp: string,
    data: Row,
    status: string,
    downLevel: number,
    reason: string,
  ): Promise<void> {
    const projectNo = `${String(data.entity_cd ?? '').replace(/ /g, '')}01`;
    // ref_no tetap string kosong (bukan NULL) seperti versi Laravel.
    const refNo = typeof data.ref_no === 'string' ? data.ref_no.trim() : '';
    const { userGroup, supervisor } = await this.userInfo(data.user_id);

    await this.db.execProcedure(sp, [
      data.entity_cd,
      projectNo,
      data.doc_no,
      refNo,
      status,
      downLevel,
      userGroup,
      data.user_id,
      supervisor,
      reason,
    ]);
  }

  /**
   * SP untuk PL (6 parameter).
   * Catatan: `$spMap` tidak memuat entry PL sehingga cabang ini tidak pernah
   * tercapai - sama seperti versi Laravel (di sana `execPL()` bahkan tidak
   * pernah didefinisikan). Implementasi disertakan agar cabangnya tidak fatal
   * bila entry PL ditambahkan di kemudian hari.
   */
  private async execPL(
    sp: string,
    data: Row,
    status: string,
    downLevel: number,
    reason: string,
  ): Promise<void> {
    const projectNo = `${String(data.entity_cd ?? '').replace(/ /g, '')}01`;
    await this.db.execProcedure(sp, [
      data.entity_cd,
      projectNo,
      data.doc_no,
      status,
      downLevel,
      data.user_id,
    ]);
  }

  private async userInfo(userId: any): Promise<{ userGroup: string; supervisor: string }> {
    const userGroup = await this.db.value<string>(
      'SELECT TOP 1 group_name FROM mgr.security_groupings WHERE user_name = ?',
      [userId],
    );
    const supervisor = await this.db.value<string>(
      'SELECT TOP 1 supervisor FROM mgr.security_users WHERE name = ?',
      [userId],
    );
    return { userGroup, supervisor };
  }
}
