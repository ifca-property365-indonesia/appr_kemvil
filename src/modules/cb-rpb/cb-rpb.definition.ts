import { DocumentApprovalDefinition } from '../../common/base/document-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';
import { expandNewline } from '../../common/helpers/text.helper';

/**
 * Migrasi dari app/Http/Controllers/CbRpbController.php
 */
export const CB_RPB: DocumentApprovalDefinition = {
  key: 'cbrpb',
  text: 'Recapitulation Bank',
  label: 'Recapitulation Bank',
  type: 'D',
  typeModule: 'CB',
  cacheDir: 'send_cbrpb',
  mailView: 'email.cbrpb.send',
  passCheckView: 'email/passcheckwithremark',
  procedure: 'mgr.x_send_mail_approval_cb_rpb',
  procedureParams: (p, status, reason) => [p.entity_cd, p.project_no, p.doc_no, p.trx_type, status, p.level_no, p.usergroup, p.user_id, p.supervisor, reason],
  logLabel: 'Email CB RPB',
  withDocumentContext: true,
  buildData: (body) => {
    const rpbDescs = expandNewline(body.rpb_descs);

    return {
      module: 'CbRpb',
      sender: body.sender,
      url_file: FormatHelper.explode(',', body.url_file),
      file_name: FormatHelper.explode(',', body.file_name),
      entity_name: body.entity_name,
      email_address: body.email_addr,
      user_name: body.user_name,
      reason: body.reason,
      rpb_descs: rpbDescs,
      approve_list: FormatHelper.explode('; ', body.approve_exist),
      clarify_user: body.clarify_user,
      clarify_email: body.clarify_email,
      currency_cd: body.currency_cd,
      trx_amt: FormatHelper.numberFormat(body.trx_amt, 2),
      sender_addr: body.sender_addr,
      hd_doc_no: body.hd_doc_no,
      body: `Please approve Recapitulation Bank No. ${body.doc_no} for ${rpbDescs}`,
      subject: `Need Approval for Recapitulation Bank No.  ${body.doc_no}`,
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
    type: 'D',
    type_module: 'CB',
    text: 'Recapitulation Bank',
  }),
};
