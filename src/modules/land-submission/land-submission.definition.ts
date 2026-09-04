import { DocumentApprovalDefinition } from '../../common/base/document-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/LandSubmissionController.php
 * Route lama: POST /api/landsubmission, GET /api/landsubmission/{status}/{encrypt},
 *             POST /api/landsubmission/update
 *
 * Subject email diambil dari LandSubmissionEmail: 'Need Approval ' . desc_sub.
 */
export const LAND_SUBMISSION: DocumentApprovalDefinition = {
  key: 'landsubmission',
  text: 'Land Submission',
  label: 'Land Submission',
  type: 'E',
  typeModule: 'LM',
  cacheDir: 'send_Land_Submission',
  mailView: 'email.landsubmission.send',
  passCheckView: 'email/landsubmission/passcheckwithremark',
  procedure: 'mgr.xrl_send_mail_approval_land_submission',
  procedureParams: (p, status, reason) => [p.entity_cd, p.doc_no, status, p.level_no, reason],
  logLabel: 'Email Land Submission',
  cacheKeyParts: (body) => [body.approved_seq, body.entity_cd, body.doc_no, body.level_no],
  buildData: (body) => ({
    entity_cd: body.entity_cd,
    entity_name: body.entity_name,
    doc_no: body.doc_no,
    level_no: body.level_no,
    approved_seq: body.approved_seq,
    descs: body.descs,
    ref_no: body.ref_no,
    user_id: body.user_id,
    user_name: body.user_name,
    email_addr: body.email_addr,
    sender: body.sender,
    sender_addr: body.sender_addr,
    desc_sub: body.desc_sub,
    request_amt: FormatHelper.explode(';', body.request_amt)
      .map((amt) => FormatHelper.numberFormat(amt, 2))
      .join(', '),
    submission_no: body.submission_no,
    url_file: FormatHelper.explode(';', body.url_file),
    file_name: FormatHelper.explode(';', body.file_name),
    attachmentsAdd: FormatHelper.pairAttachments(
      FormatHelper.cleanList(body.add_attch_link),
      FormatHelper.cleanList(body.add_attch_name),
      ['urlAdd', 'file_nameAdd'],
    ),
    approve_list: FormatHelper.explode('; ', body.approve_exist),
    clarify_user: body.clarify_user,
    clarify_email: body.clarify_email,
    link: 'landsubmission',
    subject: `Need Approval ${body.desc_sub ?? ''}`,
  }),
  buildEncrypted: (body) => ({
    entity_cd: body.entity_cd,
    doc_no: body.doc_no,
    level_no: body.level_no,
    user_id: body.user_id,
    email_addr: body.email_addr,
    entity_name: body.entity_name,
    type: 'E',
    type_module: 'LM',
    text: 'Land Submission',
  }),
};
