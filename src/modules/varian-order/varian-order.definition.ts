import { DocumentApprovalDefinition } from '../../common/base/document-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/VarianOrderController.php
 */
export const VARIAN_ORDER: DocumentApprovalDefinition = {
  key: 'varianorder',
  text: 'Varian Order',
  label: 'Varian Order',
  type: 'D',
  typeModule: 'CM',
  cacheDir: 'send_varianorder',
  mailView: 'email.varianorder.send',
  passCheckView: 'email/varianorder/passcheckwithremark',
  procedure: 'mgr.xrl_send_mail_approval_cm_varianorder',
  procedureParams: (p, status, reason) => [p.entity_cd, p.project_no, p.doc_no, p.ref_no, status, p.level_no, p.usergroup, p.user_id, p.supervisor, reason],
  logLabel: 'Email Varian Order',
  buildData: (body) => ({
    sender: body.sender,
    entity_name: body.entity_name,
    descs: body.descs,
    user_name: body.user_name,
    approve_seq: body.approve_seq,
    url_file: FormatHelper.explode(',', body.url_file),
    file_name: FormatHelper.explode(',', body.file_name),
    doc_link: body.doc_link,
    attachmentsAdd: FormatHelper.pairAttachments(
      FormatHelper.cleanList(body.add_attch_link),
      FormatHelper.cleanList(body.add_attch_name),
      ['urlAdd', 'file_nameAdd'],
    ),
    vo_sub_amt: FormatHelper.numberFormat(body.vo_sub_amt, 2),
    vo_appr_amt: FormatHelper.numberFormat(body.vo_appr_amt, 2),
    curr_cd: body.curr_cd,
    doc_no: body.doc_no,
    approve_list: FormatHelper.explode('; ', body.approve_exist),
    clarify_user: body.clarify_user,
    clarify_email: body.clarify_email,
    sender_addr: body.sender_addr,
    body: `Please approve Varian Order No. ${body.doc_no} for ${body.descs}`,
    subject: `Need Approval for Varian Order No.  ${body.doc_no}`,
  }),
  buildEncrypted: (body) => ({
    entity_cd: body.entity_cd,
    project_no: body.project_no,
    email_address: body.email_addr,
    level_no: body.level_no,
    doc_no: body.doc_no,
    ref_no: body.ref_no,
    usergroup: body.usergroup,
    user_id: body.user_id,
    supervisor: body.supervisor,
    type: 'D',
    type_module: 'CM',
    text: 'Varian Order',
  }),
};
