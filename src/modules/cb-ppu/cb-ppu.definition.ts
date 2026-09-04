import { DocumentApprovalDefinition } from '../../common/base/document-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';
import { expandNewline } from '../../common/helpers/text.helper';

/**
 * Migrasi dari app/Http/Controllers/CbPpuController.php
 */
export const CB_PPU: DocumentApprovalDefinition = {
  key: 'cbppu',
  text: 'Payment Request',
  label: 'Payment Request',
  type: 'U',
  typeModule: 'CB',
  cacheDir: 'send_cbppu',
  mailView: 'email.cbppu.send',
  passCheckView: 'email/cbppu/passcheckwithremark',
  procedure: 'mgr.x_send_mail_approval_cb_ppu',
  procedureParams: (p, status, reason) => [p.entity_cd, p.project_no, p.doc_no, p.trx_type, status, p.level_no, p.usergroup, p.user_id, p.supervisor, reason],
  logLabel: 'Email CB PPU',
  buildData: (body) => {
    const ppuDescs = expandNewline(body.ppu_descs);

    return {
      module: 'CbPpu',
      ppu_no: body.ppu_no,
      ppu_descs: body.ppu_descs,
      sender: body.sender,
      sender_addr: body.sender_addr,
      url_file: FormatHelper.explode(',', body.url_file),
      file_name: FormatHelper.explode(',', body.file_name),
      entity_name: body.entity_name,
      descs: body.descs,
      doc_link: body.document_link,
      user_name: body.user_name,
      reason: body.reason,
      pay_to: body.pay_to,
      forex: body.forex,
      ppu_amt: FormatHelper.numberFormat(body.ppu_amt, 2),
      approve_list: FormatHelper.explode('; ', body.approve_exist),
      clarify_user: body.clarify_user,
      clarify_email: body.clarify_email,
      attachmentsAdd: FormatHelper.pairAttachments(
        FormatHelper.cleanList(body.add_attch_link),
        FormatHelper.cleanList(body.add_attch_name),
        ['urlAdd', 'file_nameAdd'],
      ),
      body: `Please approve Payment Request No. ${body.ppu_no} for ${ppuDescs}`,
      subject: `Need Approval for Payment Request No.  ${body.ppu_no}`,
    };
  },
  buildEncrypted: (body) => ({
    entity_cd: body.entity_cd,
    project_no: body.project_no,
    doc_no: body.doc_no,
    trx_type: body.trx_type,
    level_no: body.level_no,
    usergroup: body.usergroup,
    user_id: body.user_id,
    supervisor: body.supervisor,
    email_address: body.email_addr,
    entity_name: body.entity_name,
    type: 'U',
    type_module: 'CB',
    text: 'Payment Request',
  }),
};
