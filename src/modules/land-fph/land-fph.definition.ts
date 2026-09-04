import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandfphController.php
 * Route lama: POST /api/landfph, GET /api/landfph/{status}/{encrypt},
 *             POST /api/landfph/getaccess, POST /api/landfph/feedback
 *
 * Catatan migrasi: pada versi Laravel `link` bernilai 'LandFph' sehingga form
 * konfirmasi mengarah ke /api/LandFph/getaccess yang tidak cocok dengan route
 * terdaftar (/api/landfph/getaccess). Di sini `link` disamakan dengan route dan
 * nama view email ditulis eksplisit agar tetap memakai folder landfphMail.
 */
export const LAND_FPH: LandApprovalDefinition = {
  link: 'landfph',
  type: 'F',
  typeModule: 'LM',
  text: 'Land FPH',
  cacheDir: 'send_Land_Fph',
  procedure: 'mgr.xrl_send_mail_approval_land_fph',
  mailView: 'email.landfphMail.send',
  clarifyFromRequest: true,
  subject: (body) => `Need Approval for ${body.doc_no}`,
  extraData: (body) => ({
    no_alas_hak: body.no_alas_hak,
    name_alas_hak: body.name_alas_hak,
    luas_alas_hak: body.luas_alas_hak,
    name_owner: body.name_owner,
    total_amt: FormatHelper.numberFormat(body.total_amt, 2),
    book_amt: FormatHelper.numberFormat(body.book_amt, 2),
    transaction_date: FormatHelper.dateLong(body.transaction_date),
  }),
};
