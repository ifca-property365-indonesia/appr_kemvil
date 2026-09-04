import { DocumentApprovalDefinition } from '../../common/base/document-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';
import { expandNewline } from '../../common/helpers/text.helper';

/**
 * Migrasi dari app/Http/Controllers/CbFupdController.php
 */
export const CB_FUPD: DocumentApprovalDefinition = {
  key: 'cbfupb',
  text: 'Propose Transfer to Bank',
  label: 'Propose Transfer to Bank',
  type: 'E',
  typeModule: 'CB',
  cacheDir: 'send_cbfupd',
  mailView: 'email.cbfupd.send',
  passCheckView: 'email/passcheckwithremark',
  procedure: 'mgr.x_send_mail_approval_cb_fupd',
  procedureParams: (p, status, reason) => [p.entity_cd, p.project_no, p.doc_no, p.trx_type, status, p.level_no, p.usergroup, p.user_id, p.supervisor, reason],
  logLabel: 'Email CB FUPD',
  withDocumentContext: true,
  entityNameForResult: 'project',
  buildData: (body) => {
    const bandHdDescs = expandNewline(body.band_hd_descs);

    return {
      module: 'CbFupd',
      sender: body.sender,
      sender_addr: body.sender_addr,
      entity_name: body.entity_name,
      band_hd_descs: bandHdDescs,
      band_hd_no: body.band_hd_no,
      dt_amount: FormatHelper.numberFormat(body.dt_amount, 2),
      comm_amt: FormatHelper.numberFormat(body.comm_amt, 2),
      url_file: FormatHelper.explode('; ', body.url_file),
      file_name: FormatHelper.explode('; ', body.file_name),
      user_name: body.user_name,
      reason: body.reason,
      approve_list: FormatHelper.explode('; ', body.approve_exist),
      clarify_user: body.clarify_user,
      clarify_email: body.clarify_email,
      body: `Please approve Propose Transfer to Bank No. ${body.band_hd_no} for ${bandHdDescs}`,
      subject: `Need Approval for Propose Transfer to Bank No. ${body.band_hd_no}`,
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
    type: 'E',
    type_module: 'CB',
    text: 'Propose Transfer to Bank',
  }),
};
