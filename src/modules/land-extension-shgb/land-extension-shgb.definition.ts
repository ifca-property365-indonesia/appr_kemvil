import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandExtensionShgbController.php
 * Route lama: POST /api/landextensionshgb, GET /api/landextensionshgb/{status}/{encrypt}, POST /api/landextensionshgb/getaccess
 */
export const LAND_EXTENSION_SHGB: LandApprovalDefinition = {
  link: 'landextensionshgb',
  type: 'U',
  typeModule: 'LM',
  text: 'Land SHGB Extension',
  cacheDir: 'send_Land_Extension_SHGB',
  procedure: 'mgr.xrl_send_mail_approval_land_extension_shgb',
  clarifyFromRequest: true,
  subject: (body) => `Need Approval for ${body.doc_no}`,
  extraData: (body) => ({
    shgb_no: FormatHelper.explode('; ', body.shgb_no),
    nop_no: FormatHelper.explode('; ', body.nop_no),
    nib_no: FormatHelper.explode('; ', body.nib_no),
    nib_no_extension: FormatHelper.explode(';', body.nib_no_extension),
    shgb_area: FormatHelper.explode('; ', body.shgb_area).map((v) => FormatHelper.numberFormat(v, 2)),
    shgb_date: FormatHelper.explode('; ', body.shgb_date).map((v) => FormatHelper.dateLong(v)),
    shgb_date_extension: FormatHelper.explode(';', body.shgb_date_extension).map((v) => FormatHelper.dateLong(v)),
    shgb_expired: FormatHelper.explode('; ', body.shgb_expired).map((v) => FormatHelper.dateLong(v)),
    shgb_expired_extension: FormatHelper.explode('; ', body.shgb_expired_extension).map((v) => FormatHelper.dateLong(v)),
  }),
};
