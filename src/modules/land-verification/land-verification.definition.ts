import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandVerificationController.php
 * Route lama: POST /api/landverification, GET /api/landverification/{status}/{encrypt},
 *             POST /api/landverification/getaccess, POST /api/landverification/feedback
 *
 * Catatan migrasi: pada versi Laravel `link` bernilai 'LandVerification' sehingga
 * form konfirmasi mengarah ke /api/LandVerification/getaccess yang tidak cocok
 * dengan route terdaftar. `link` disamakan dengan route dan view email ditulis
 * eksplisit agar tetap memakai folder landverificationMail.
 */
export const LAND_VERIFICATION: LandApprovalDefinition = {
  link: 'landverification',
  type: 'V',
  typeModule: 'LM',
  text: 'Land Verification',
  cacheDir: 'send_Land_Verification',
  procedure: 'mgr.xrl_send_mail_approval_land_Verification',
  mailView: 'email.landverificationMail.send',
  subject: (body) => `Need Approval for Land Verification No.  ${body.doc_no}`,
  extraData: (body) => ({
    nop_no: body.nop_no,
    name_owner: body.name_owner,
    own_descs: body.own_descs,
    transaction_date: FormatHelper.dateLong(body.transaction_date),
    land_title_no: body.land_title_no,
    land_title_name: body.land_title_name,
  }),
};
