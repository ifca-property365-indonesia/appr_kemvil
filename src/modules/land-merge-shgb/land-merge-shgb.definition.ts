import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandMergeShgbController.php
 * Route lama: POST /api/landmergeshgb, GET /api/landmergeshgb/{status}/{encrypt}, POST /api/landmergeshgb/getaccess
 */
export const LAND_MERGE_SHGB: LandApprovalDefinition = {
  link: 'landmergeshgb',
  type: 'J',
  typeModule: 'LM',
  text: 'Land Merge SHGB',
  cacheDir: 'send_Land_Merge_SHGB',
  procedure: 'mgr.xrl_send_mail_approval_land_sft_merge_shgb',
  clarifyFromRequest: true,
  subject: (body) => `Need Approval for ${body.doc_no}`,
  extraData: (body) => ({
    merge_ref_no: body.merge_ref_no,
    merge_nop: body.merge_nop,
    merge_area: FormatHelper.numberFormat(body.merge_area, 2),
    transaction_date: FormatHelper.dateLong(body.transaction_date),
    shgb_ref_no: FormatHelper.explode('; ', body.shgb_ref_no),
  }),
};
