import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandSftProposeController.php
 * Route lama: POST /api/landsftpropose, GET /api/landsftpropose/{status}/{encrypt}, POST /api/landsftpropose/getaccess
 */
export const LAND_SFT_PROPOSE: LandApprovalDefinition = {
  link: 'landsftpropose',
  type: 'X',
  typeModule: 'LM',
  text: 'Land SFT Propose',
  cacheDir: 'send_Land_SFT_Propose',
  procedure: 'mgr.xrl_send_mail_approval_land_sft_propose',
  subject: (body) => `Need Approval for Land SFT Propose No.  ${body.doc_no}`,
  extraData: (body) => ({
    ref_no: body.ref_no,
    sk_no: body.sk_no,
    sk_amt: FormatHelper.numberFormat(body.sk_amt, 2),
    transaction_date: FormatHelper.dateLong(body.transaction_date),
  }),
};
