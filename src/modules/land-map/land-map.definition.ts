import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandMapController.php
 * Route lama: POST /api/landmap, GET /api/landmap/{status}/{encrypt}, POST /api/landmap/getaccess
 */
export const LAND_MAP: LandApprovalDefinition = {
  link: 'landmap',
  type: 'B',
  typeModule: 'LM',
  text: 'Land Map',
  cacheDir: 'send_Land_Map',
  procedure: 'mgr.xrl_send_mail_approval_land_map',
  subject: (body) => `Need Approval for Land Map No.  ${body.doc_no}`,
  extraData: (body) => ({
    nop_no: body.nop_no,
    name_owner: body.name_owner,
    land_area_spk: body.land_area_spk,
    land_area_bpn: body.land_area_bpn,
    map_land_no: body.map_land_no,
    land_title_no: body.land_title_no,
    land_area_final: body.land_area_final,
    transaction_date: FormatHelper.dateLong(body.transaction_date),
  }),
};
