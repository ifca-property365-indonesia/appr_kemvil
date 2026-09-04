import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandSplitShgbController.php
 * Route lama: POST /api/landsplitshgb, GET /api/landsplitshgb/{status}/{encrypt}, POST /api/landsplitshgb/getaccess
 */
export const LAND_SPLIT_SHGB: LandApprovalDefinition = {
  link: 'landsplitshgb',
  type: 'Q',
  typeModule: 'LM',
  text: 'Land Split SHGB',
  cacheDir: 'send_Land_Split_SHGB',
  procedure: 'mgr.xrl_send_mail_approval_land_split_shgb',
  procedureParams: (payload, status, reason) => [payload.entity_cd, payload.doc_no, status, Number(payload.level_no), reason],
  subject: (body) => `Need Approval for Split SHGB No. ${body.doc_no}`,
  extraData: (body) => ({
    shgb_no: FormatHelper.strToArray(body.shgb_no),
    shgb_no_bpn: FormatHelper.strToArray(body.shgb_no_bpn),
    nop_no: FormatHelper.strToArray(body.nop_no),
    nib_no: FormatHelper.strToArray(body.nib_no),
    shgb_date: FormatHelper.strToArray(body.shgb_date).map((v) => FormatHelper.safeDateFormat(v)),
    shgb_expired: FormatHelper.strToArray(body.shgb_expired).map((v) => FormatHelper.safeDateFormat(v)),
    shgb_area: FormatHelper.strToArray(body.shgb_area).map((v) => FormatHelper.safeNumber(v)),
    shgb_no_split: body.shgb_no_split ?? '',
    shgb_no_bpn_split: body.shgb_no_bpn_split ?? '',
    nop_no_split: body.nop_no_split ?? '',
    nib_no_split: body.nib_no_split ?? '',
    shgb_date_split: FormatHelper.safeDateFormat(body.shgb_date_split),
    shgb_expired_split: FormatHelper.safeDateFormat(body.shgb_expired_split),
    shgb_area_split: FormatHelper.safeNumber(body.shgb_area_split),
    remaining_area: FormatHelper.safeNumber(body.remaining_area),
    split_status_hd: FormatHelper.strToArray(body.split_status_hd),
    split_status_hdstr: FormatHelper.strToArray(body.split_status_hdstr),
    split_status_dtstr: FormatHelper.strToArray(body.split_status_dtstr),
  }),
};
