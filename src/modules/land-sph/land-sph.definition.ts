import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandSphController.php
 * Route lama: POST /api/landsph, GET /api/landsph/{status}/{encrypt}, POST /api/landsph/getaccess
 */
export const LAND_SPH: LandApprovalDefinition = {
  link: 'landsph',
  type: 'S',
  typeModule: 'LM',
  text: 'Land SPH',
  cacheDir: 'send_Land_SPH',
  procedure: 'mgr.xrl_send_mail_approval_land_sph',
  subject: (body) => `Need Approval for Land SPH No.  ${body.doc_no}`,
  extraData: (body) => ({
    nop_no: body.nop_no,
    name_owner: body.name_owner,
    land_title_no: body.land_title_no,
    land_title_name: body.land_title_name,
    laf: FormatHelper.numberFormat(body.laf, 2),
    baf: FormatHelper.numberFormat(body.baf, 2),
    sph_amt: FormatHelper.numberFormat(body.sph_amt, 2),
    book_amt: FormatHelper.numberFormat(body.book_amt, 2),
    total_amt: FormatHelper.numberFormat(body.total_amt, 2),
    transaction_date: FormatHelper.dateLong(body.transaction_date),
  }),
};
