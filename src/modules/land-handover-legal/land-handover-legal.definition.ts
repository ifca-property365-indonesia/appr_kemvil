import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandHandoverLegalController.php
 * Route lama: POST /api/landhandoverlegal, GET /api/landhandoverlegal/{status}/{encrypt}, POST /api/landhandoverlegal/getaccess
 */
export const LAND_HANDOVER_LEGAL: LandApprovalDefinition = {
  link: 'landhandoverlegal',
  type: 'M',
  typeModule: 'LM',
  text: 'Land Handover Legal',
  cacheDir: 'send_Land_Handover_Legal',
  procedure: 'mgr.xrl_send_mail_approval_land_handover_legal',
  includeAttachmentsAdd: false,
  subject: (body) => `Need Approval for Land Handover Legal No. ${body.doc_no}`,
  extraData: (body) => ({
    customer_name: FormatHelper.strToArray(body.customer_name),
    transaction_date: FormatHelper.dateLong(body.transaction_date),
    shgb_no: body.shgb_no,
    nop_no: body.nop_no,
    shgb_name: body.shgb_name,
    shgb_area: FormatHelper.numberFormat(body.shgb_area, 0),
    handover_to: FormatHelper.strToArray(body.handover_to),
    remarks: FormatHelper.strToArray(body.remarks),
  }),
};
