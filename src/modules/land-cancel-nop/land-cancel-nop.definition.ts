import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandCancelNopController.php
 * Route lama: POST /api/landcancelnop, GET /api/landcancelnop/{status}/{encrypt}, POST /api/landcancelnop/getaccess
 */
export const LAND_CANCEL_NOP: LandApprovalDefinition = {
  link: 'landcancelnop',
  type: 'O',
  typeModule: 'LM',
  text: 'Land Cancel NOP',
  cacheDir: 'send_Land_Ccancel_NOP',
  procedure: 'mgr.xrl_send_mail_approval_land_cancel_nop',
  subject: (body) => `Need Approval for Land Cancel NOP No.  ${body.doc_no}`,
  extraData: (body) => ({
    transaction_date: FormatHelper.dateLong(body.transaction_date),
    sppt_name: body.sppt_name,
    nop_no: body.nop_no,
    owner_name: body.owner_name,
    cancel_remarks: body.cancel_remarks,
  }),
};
