import { DocumentApprovalDefinition } from '../../common/base/document-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/PLBudgetLymanController.php
 */
export const PL_BUDGET_LYMAN: DocumentApprovalDefinition = {
  key: 'budgetlyman',
  text: 'Budget Lyman',
  label: 'RAB Budget',
  type: 'X',
  typeModule: 'PL',
  cacheDir: 'send_pl_budget_lyman',
  mailView: 'email.plbudget.send',
  passCheckView: 'email/plbudget/passcheckwithremark',
  procedure: 'mgr.xrl_send_mail_approval_pl_budget_lyman',
  procedureParams: (p, status, reason) => [p.entity_cd, p.project_no, p.doc_no, status, p.level_no, p.user_id],
  logLabel: 'Email PL Budget Lyman',
  buildData: (body) => ({
    descs: body.descs,
    entity_name: body.entity_name,
    project_name: body.project_name,
    amount: FormatHelper.numberFormat(body.amount, 2),
    doc_no: body.doc_no,
    user_name: body.user_name,
    sender: body.sender,
    module: body.module,
    url_file: FormatHelper.explode('; ', body.url_file),
    file_name: FormatHelper.explode('; ', body.file_name),
    approve_list: FormatHelper.explode('; ', body.approve_exist),
    clarify_user: body.clarify_user,
    clarify_email: body.clarify_email,
    sender_addr: body.sender_addr,
    body: `Please approve RAB Budget No. ${body.doc_no} project ${body.project_name} with Amount ${FormatHelper.numberFormat(body.amount, 2)}`,
    subject: `Need Approval for RAB Budget No. ${body.doc_no}`,
  }),
  buildEncrypted: (body) => ({
    entity_cd: body.entity_cd,
    project_no: body.project_no,
    email_address: body.email_addr,
    entity_name: body.entity_name,
    level_no: body.level_no,
    doc_no: body.doc_no,
    user_id: body.user_id,
    type: 'X',
    type_module: 'PL',
    text: 'Budget Lyman',
  }),
};
