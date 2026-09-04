import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/PlOverwriteController.php
 * Route lama: POST /api/ploverwrite, GET /api/ploverwrite/{status}/{encrypt}, POST /api/ploverwrite/getaccess
 */
export const PL_OVERWRITE: LandApprovalDefinition = {
  link: 'ploverwrite',
  type: 'A',
  typeModule: 'PL',
  text: 'Overwrite Actual Inventory',
  cacheDir: 'send_Land_PL_Overwrite',
  procedure: 'mgr.xrl_send_mail_approval_pl_overwrite',
  mailView: 'email.ploverwritemail.send',
  includeAttachmentsAdd: false,
  procedureParams: (payload, status, reason) => [payload.entity_cd, payload.project_no, payload.doc_no, status, payload.level_no, reason],
  extraEncrypted: (body) => ({ project_no: body.project_no, }),
  subject: (body) => `Need Approval for ${body.doc_no}`,
  extraData: (body) => ({
    project_no: body.project_no,
    amount: FormatHelper.numberFormat(body.amount, 2),
  }),
};
