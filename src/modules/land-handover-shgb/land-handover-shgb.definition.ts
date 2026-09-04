import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandHandoverShgbController.php
 * Route lama: POST /api/landhandovershgb, GET /api/landhandovershgb/{status}/{encrypt}, POST /api/landhandovershgb/getaccess
 */
export const LAND_HANDOVER_SHGB: LandApprovalDefinition = {
  link: 'landhandovershgb',
  type: 'H',
  typeModule: 'LM',
  text: 'Land Handover SHGB',
  cacheDir: 'send_Land_Handover_SHGB',
  procedure: 'mgr.xrl_send_mail_approval_land_handover_shgb',
  subject: (body) => `Need Approval for Land Handover SHGB No.  ${body.doc_no}`,
  extraData: (body) => ({
    transaction_date: FormatHelper.dateLong(body.transaction_date),
    shgb_no: body.shgb_no,
    nop_no: body.nop_no,
    shgb_name: body.shgb_name,
    shgb_area: FormatHelper.numberFormat(body.shgb_area, 2),
    handover_to: body.handover_to,
  }),
};
