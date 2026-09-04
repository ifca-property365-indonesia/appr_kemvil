import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandSftBphtbController.php
 * Route lama: POST /api/landsftbphtb, GET /api/landsftbphtb/{status}/{encrypt}, POST /api/landsftbphtb/getaccess
 */
export const LAND_SFT_BPHTB: LandApprovalDefinition = {
  link: 'landsftbphtb',
  type: 'Y',
  typeModule: 'LM',
  text: 'Land SFT BPHTB',
  cacheDir: 'send_Land_SFT_BPHTB',
  procedure: 'mgr.xrl_send_mail_approval_land_sft_bphtb',
  subject: (body) => `Need Approval for Land SFT BPHTB No.  ${body.doc_no}`,
  extraData: (body) => ({
    transaction_date: FormatHelper.dateLong(body.transaction_date),
    bphtb_ref_no: body.bphtb_ref_no,
    nib_no: body.nib_no,
    nop_bphtb: body.nop_bphtb,
    bphtb_amt: FormatHelper.numberFormat(body.bphtb_amt, 2),
    land_title_no: FormatHelper.explode('; ', body.land_title_no),
  }),
};
