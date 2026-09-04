import { LandApprovalDefinition } from '../../common/base/land-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandVerificationPaymentController.php
 * Route lama: POST /api/landverificationpayment, GET /api/landverificationpayment/{status}/{encrypt}, POST /api/landverificationpayment/getaccess
 */
export const LAND_VERIFICATION_PAYMENT: LandApprovalDefinition = {
  link: 'landverificationpayment',
  type: '2',
  typeModule: 'LM',
  text: 'Land Verification Payment',
  cacheDir: 'send_Land_Verification_Payment',
  procedure: 'mgr.xrl_send_mail_approval_land_verification_payment',
  subject: (body) => `Need Approval for Land Verification Payment No.  ${body.change_no}`,
  extraData: (body) => ({
    verification_no: body.verification_no,
    land_title_no: body.land_title_no,
    land_title_area: body.land_title_area,
    book_no: body.book_no,
    incoming_form_no: body.incoming_form_no,
    sph_amt_m2: FormatHelper.numberFormat(body.sph_amt_m2, 2),
    pph_amt: FormatHelper.numberFormat(body.pph_amt, 2),
    bphtb_amt: FormatHelper.numberFormat(body.bphtb_amt, 2),
    submission_tax_no: body.submission_tax_no,
    pph_payment_date: FormatHelper.dateLong(body.pph_payment_date),
    pph_reg_date: FormatHelper.dateLong(body.pph_reg_date),
    pph_validation_date: FormatHelper.dateLong(body.pph_validation_date),
  }),
};
