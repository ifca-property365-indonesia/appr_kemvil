import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandSftShgbController.php
 * Route lama: POST /api/landsftshgb, GET /api/landsftshgb/{status}/{encrypt}, POST /api/landsftshgb/getaccess
 */
export const LAND_SFT_SHGB: LandApprovalDefinition = {
  link: 'landsftshgb',
  type: 'Z',
  typeModule: 'LM',
  text: 'Land SFT SHGB',
  cacheDir: 'send_Land_SFT_SHGB',
  procedure: 'mgr.xrl_send_mail_approval_land_sft_shgb',
  subject: (body) => `Need Approval for Land SFT SHGB No.  ${body.doc_no}`,
  extraData: (body) => ({
    transaction_date: FormatHelper.dateLong(body.transaction_date),
    shgb_ref_no: body.shgb_ref_no,
    nop_no_new: body.nop_no_new,
    pbt_area_nib: FormatHelper.numberFormat(body.pbt_area_nib, 2),
    shgb_amt: FormatHelper.numberFormat(body.shgb_amt, 2),
  }),
};
