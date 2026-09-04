import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandRequestController.php
 * Route lama: POST /api/landrequest, GET /api/landrequest/{status}/{encrypt}, POST /api/landrequest/getaccess
 */
export const LAND_REQUEST: LandApprovalDefinition = {
  link: 'landrequest',
  type: 'R',
  typeModule: 'LM',
  text: 'Land Request',
  cacheDir: 'send_Land_Request',
  procedure: 'mgr.xrl_send_mail_approval_land_request',
  subject: (body) => `Need Approval for Land Request No.  ${body.doc_no}`,
  extraData: (body) => {
    const paymentMap: Record<string, string> = {
      A: 'Tolong berikan persetujuan untuk proses AP Advanced dengan detail :',
      I: 'Tolong berikan persetujuan untuk proses AP Invoice dengan detail :',
    };

    return {
      type: FormatHelper.explode(';', body.type),
      name_owner: FormatHelper.explode(';', body.name_owner),
      nop_no: FormatHelper.explode(';', body.nop_no),
      sph_trx_no: FormatHelper.explode(';', body.sph_trx_no),
      request_amt: FormatHelper.explode(';', body.request_amt).map((v) => FormatHelper.numberFormat(v, 2)),
      detail_text: paymentMap[body.payment_cd] ?? 'Tolong berikan persetujuan untuk proses Pengajuan Pembayaran dengan detail :',
    };
  },
};
