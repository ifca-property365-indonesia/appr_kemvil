import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandMeasuringController.php
 * Route lama: POST /api/landmeasuring, GET /api/landmeasuring/{status}/{encrypt}, POST /api/landmeasuring/getaccess
 */
export const LAND_MEASURING: LandApprovalDefinition = {
  link: 'landmeasuring',
  type: 'K',
  typeModule: 'LM',
  text: 'Land Measuring',
  cacheDir: 'send_Land_Measuring',
  procedure: 'mgr.xrl_send_mail_approval_land_measuring',
  subject: (body) => `Need Approval for Land Measuring No.  ${body.doc_no}`,
  extraData: (body) => ({
    ref_no: body.ref_no,
    descs_officer: body.descs_officer,
    measuring_descs: body.measuring_descs,
    transaction_date: FormatHelper.dateLong(body.transaction_date),
  }),
};
