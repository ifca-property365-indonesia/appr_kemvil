import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandChangeNameController.php
 * Route lama: POST /api/landchangename, GET /api/landchangename/{status}/{encrypt}, POST /api/landchangename/getaccess
 */
export const LAND_CHANGE_NAME: LandApprovalDefinition = {
  link: 'landchangename',
  type: '1',
  typeModule: 'LM',
  text: 'Land Change Name',
  cacheDir: 'send_Land_Change_Name',
  procedure: 'mgr.xrl_send_mail_approval_land_change_name',
  includeAttachmentsAdd: false,
  subject: (body) => `Need Approval for Land Change Name No.  ${body.change_no}`,
  extraData: (body) => ({
    change_no: body.change_no,
    land_title_no: body.land_title_no,
    land_title_area: body.land_title_area,
    land_title_name: body.land_title_name,
    land_title_pt: body.land_title_pt,
    payment_dt_descs: FormatHelper.explode('; ', body.payment_dt_descs),
    payment_amount: FormatHelper.explode('; ', body.payment_amount),
  }),
};
