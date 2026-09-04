import { DocumentApprovalDefinition } from '../../common/base/document-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';
import { expandNewline } from '../../common/helpers/text.helper';

/**
 * Migrasi dari app/Http/Controllers/CbPPuVvipController.php
 */
export const CB_PPU_VVIP: DocumentApprovalDefinition = {
  key: 'cbppuvvip',
  text: 'Payment Request',
  label: 'Payment Request',
  type: 'V',
  typeModule: 'CB',
  cacheDir: 'send_cbppuvvip',
  mailView: 'email.cbppuvvip.send',
  passCheckView: 'email/cbppuvvip/passcheckwithremark',
  procedure: 'mgr.x_send_mail_approval_cb_ppu_vvip',
  procedureParams: (p, status, reason) => [p.entity_cd, p.project_no, p.doc_no, p.trx_type, status, p.level_no, p.usergroup, p.user_id, p.supervisor, reason],
  logLabel: 'Email CB PPU VVIP',
  buildData: (body) => {
    const ppuDescs = expandNewline(body.ppu_descs);

    return {
      module: 'CbPpuVvip',
      ppu_no: body.ppu_no,
      ppu_descs: body.ppu_descs,
      sender: body.sender,
      sender_addr: body.sender_addr,
      url_file: FormatHelper.explode(',', body.url_file),
      file_name: FormatHelper.explode(',', body.file_name),
      entity_name: body.entity_name,
      descs: body.descs,
      user_name: body.user_name,
      reason: body.reason,
      doc_link: body.document_link,
      pay_to: body.pay_to,
      forex: body.forex,
      ppu_amt: FormatHelper.numberFormat(body.ppu_amt, 2),
      approve_list: FormatHelper.explode('; ', body.approve_exist),
      clarify_user: body.clarify_user,
      clarify_email: body.clarify_email,
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
    type: 'V',
    type_module: 'CB',
    text: 'Payment Request',
  }),
};
