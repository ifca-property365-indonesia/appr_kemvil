import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandMeasuringSftController.php
 * Route lama: POST /api/landmeasuringsft, GET /api/landmeasuringsft/{status}/{encrypt}, POST /api/landmeasuringsft/getaccess
 */
export const LAND_MEASURING_SFT: LandApprovalDefinition = {
  link: 'landmeasuringsft',
  type: 'A',
  typeModule: 'LM',
  text: 'Land Measuring SFT',
  cacheDir: 'send_Land_Measuring_SFT',
  procedure: 'mgr.xrl_send_mail_approval_land_measuring_sft',
  subject: (body) => `Need Approval for Land Measuring SFT No.  ${body.doc_no}`,
  extraData: (body) => ({
    transaction_date: FormatHelper.dateLong(body.transaction_date),
    kloter: body.kloter,
    file_no: body.file_no,
    nib_no: body.nib_no,
    measuring_amt: FormatHelper.numberFormat(body.measuring_amt, 2),
  }),
};
