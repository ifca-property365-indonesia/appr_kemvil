import { DocumentApprovalDefinition } from '../../common/base/document-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/CmCloseController.php
 */
export const CM_CLOSE: DocumentApprovalDefinition = {
  key: 'cmclose',
  text: 'Contract Progress',
  label: 'Contract Close',
  type: 'C',
  typeModule: 'CM',
  cacheDir: 'send_cmclose',
  mailView: 'email.cmclose.send',
  passCheckView: 'email/cmclose/passcheckwithremark',
  procedure: 'mgr.xrl_send_mail_approval_cm_contractclose',
  procedureParams: (p, status, reason) => [p.entity_cd, p.project_no, p.doc_no, p.ref_no, status, p.level_no, p.usergroup, p.user_id, p.supervisor, reason, 'w_cm_contract_close'],
  logLabel: 'Email CM Close',
  buildData: (body) => ({
    sender: body.sender,
    entity_name: body.entity_name,
    descs: body.descs,
    user_name: body.user_name,
    approve_seq: body.approve_seq,
    module: body.module,
    approve_list: FormatHelper.explode('; ', body.approve_exist),
    clarify_user: body.clarify_user,
    clarify_email: body.clarify_email,
    sender_addr: body.sender_addr,
    url_file: FormatHelper.explode('; ', body.url_file),
    file_name: FormatHelper.explode('; ', body.file_name),
    attachmentsAdd: FormatHelper.pairAttachments(
      FormatHelper.cleanList(body.add_attch_link),
      FormatHelper.cleanList(body.add_attch_name),
      ['urlAdd', 'file_nameAdd'],
    ),
    body: `Please approve Contract Close No. ${body.doc_no} for ${body.descs}`,
    subject: `Need Approval for Contract Close No.  ${body.doc_no}`,
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
    entity_name: body.entity_name,
    type: 'C',
    type_module: 'CM',
    text: 'Contract Progress',
  }),
};
