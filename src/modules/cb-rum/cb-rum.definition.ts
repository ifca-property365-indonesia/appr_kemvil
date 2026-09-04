import { DocumentApprovalDefinition } from '../../common/base/document-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';
import { expandNewline } from '../../common/helpers/text.helper';

/**
 * Migrasi dari app/Http/Controllers/CbRumController.php
 */
export const CB_RUM: DocumentApprovalDefinition = {
  key: 'cbrum',
  text: 'Cash Advance Settlement',
  label: 'Cash Advance Settlement',
  type: 'G',
  typeModule: 'CB',
  cacheDir: 'send_cbrum',
  mailView: 'email.cbrum.send',
  passCheckView: 'email/passcheckwithremark',
  procedure: 'mgr.x_send_mail_approval_cb_rum',
  procedureParams: (p, status, reason) => [p.entity_cd, p.project_no, p.doc_no, p.trx_type, status, p.level_no, p.usergroup, p.user_id, p.supervisor, reason],
  logLabel: 'Email CB RUM',
  withDocumentContext: true,
  buildData: (body) => {
    const remarksHd = expandNewline(body.remarks_hd);

    return {
      module: 'CbRum',
      sender: body.sender,
      url_file: FormatHelper.explode(',', body.url_file),
      file_name: FormatHelper.explode(',', body.file_name),
      remarks_hd: remarksHd,
      entity_name: body.entity_name,
      email_address: body.email_addr,
      user_name: body.user_name,
      reason: body.reason,
      currency_cd: body.currency_cd,
      total_amt: FormatHelper.numberFormat(body.total_amt, 2),
      replenish_doc: body.replenish_doc,
      approve_list: FormatHelper.explode('; ', body.approve_exist),
      clarify_user: body.clarify_user,
      clarify_email: body.clarify_email,
      sender_addr: body.sender_addr,
      body: `Please approve Cash Advance Settlement No. ${body.doc_no} for ${remarksHd}`,
      subject: `Need Approval for Cash Advance Settlement No.  ${body.doc_no}`,
    };
  },
  buildEncrypted: (body) => ({
    entity_cd: body.entity_cd,
    project_no: body.project_no,
    doc_no: body.doc_no,
    trx_type: body.trx_type,
    level_no: body.level_no,
    email_address: body.email_addr,
    usergroup: body.usergroup,
    user_id: body.user_id,
    supervisor: body.supervisor,
    entity_name: body.entity_name,
    type: 'G',
    type_module: 'CB',
    text: 'Cash Advance Settlement',
  }),
};
