import { DocumentApprovalDefinition } from '../../common/base/document-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/ContractRenewController.php
 */
export const CONTRACT_RENEW: DocumentApprovalDefinition = {
  key: 'contractrenew',
  text: 'Contract Renew',
  label: 'Contract Renew',
  type: 'R',
  typeModule: 'TM',
  cacheDir: 'send_contract_renew',
  mailView: 'email.contractrenew.send',
  passCheckView: 'email/contractrenew/passcheckwithremark',
  procedure: 'mgr.xrl_send_mail_approval_tm_contractrenew',
  procedureParams: (p, status, reason) => [p.entity_cd, p.project_no, p.doc_no, p.ref_no, p.renew_no, status, p.level_no, p.usergroup, p.user_id, p.supervisor, reason],
  logLabel: 'Email Contract Renew',
  buildData: (body) => ({
    sender: body.sender,
    entity_name: body.entity_name,
    descs: body.descs,
    user_name: body.user_name,
    currency_cd: body.currency_cd,
    contract_sum: FormatHelper.numberFormat(body.contract_sum, 2),
    approve_seq: body.approve_seq,
    approve_list: FormatHelper.explode('; ', body.approve_exist),
    clarify_user: body.clarify_user,
    clarify_email: body.clarify_email,
    sender_addr: body.sender_addr,
    body: `Please approve Contract Renew No. ${body.doc_no} for ${body.descs}`,
    subject: `Need Approval for Contract Renew No.  ${body.doc_no}`,
  }),
  buildEncrypted: (body) => ({
    entity_cd: body.entity_cd,
    project_no: body.project_no,
    doc_no: body.doc_no,
    ref_no: body.ref_no,
    renew_no: body.renew_no,
    level_no: body.level_no,
    usergroup: body.usergroup,
    user_id: body.user_id,
    supervisor: body.supervisor,
    email_address: body.email_addr,
    type: 'R',
    type_module: 'TM',
    text: 'Contract Renew',
  }),
};
