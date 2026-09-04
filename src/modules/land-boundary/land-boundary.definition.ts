import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandBoundaryController.php
 * Route lama: POST /api/landboundary, GET /api/landboundary/{status}/{encrypt}, POST /api/landboundary/getaccess
 */
export const LAND_BOUNDARY: LandApprovalDefinition = {
  link: 'landboundary',
  type: 'D',
  typeModule: 'LM',
  text: 'Land Boundary',
  cacheDir: 'send_Land_Boundary',
  procedure: 'mgr.xrl_send_mail_approval_land_boundary',
  subject: (body) => `Need Approval for Land Boundary No.  ${body.doc_no}`,
  extraData: (body) => ({
    transaction_date: FormatHelper.dateLong(body.transaction_date),
    boundary_ref: body.boundary_ref,
    officer_cd: body.officer_cd,
    off_name: body.off_name,
  }),
};
