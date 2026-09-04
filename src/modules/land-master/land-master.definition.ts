import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandMasterController.php
 * Route lama: POST /api/landmaster, GET /api/landmaster/{status}/{encrypt}, POST /api/landmaster/getaccess
 */
export const LAND_MASTER: LandApprovalDefinition = {
  link: 'landmaster',
  type: 'L',
  typeModule: 'LM',
  text: 'Land Master',
  cacheDir: 'send_Land_Master',
  procedure: 'mgr.xrl_send_mail_approval_land_master',
  subject: (body) => `Need Approval for Land Master No.  ${body.doc_no}`,
  extraData: (body) => ({
    entity_cd_land: body.entity_cd_land,
    land_no: body.land_no,
    area: body.area,
    city: body.city,
    transaction_date: FormatHelper.dateLong(body.transaction_date),
  }),
};
