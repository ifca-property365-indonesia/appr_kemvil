import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandMasterRenewController.php
 * Route lama: POST /api/landmasterrenew, GET /api/landmasterrenew/{status}/{encrypt}, POST /api/landmasterrenew/getaccess
 */
export const LAND_MASTER_RENEW: LandApprovalDefinition = {
  link: 'landmasterrenew',
  type: 'P',
  typeModule: 'LM',
  text: 'Land Master Renewal',
  cacheDir: 'send_Land_Master_Renewal',
  procedure: 'mgr.xrl_send_mail_approval_land_master_renew',
  subject: (body) => `Need Approval for Land Master Renewal No.  ${body.doc_no}`,
  extraData: (body) => ({
    ref_no: body.ref_no,
    entity_cd_land: body.entity_cd_land,
    land_no: body.land_no,
    area: body.area,
    city: body.city,
    transaction_date: FormatHelper.dateLong(body.transaction_date),
  }),
};
