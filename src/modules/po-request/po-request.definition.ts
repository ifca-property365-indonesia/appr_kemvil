import { DocumentApprovalDefinition } from '../../common/base/document-approval.base';
import { FormatHelper } from '../../common/helpers/format.helper';

/**
 * Migrasi dari app/Http/Controllers/PoRequestController.php
 */
export const PO_REQUEST: DocumentApprovalDefinition = {
  key: 'porequest',
  text: 'Purchase Requisition',
  label: 'Purchase Requisition',
  type: 'Q',
  typeModule: 'PO',
  cacheDir: 'send_porequeset',
  mailView: 'email.por.send',
  passCheckView: 'email/por/passcheckwithremark',
  procedure: 'mgr.x_send_mail_approval_po_request',
  procedureParams: (p, status, reason) => [p.entity_cd, p.project_no, p.doc_no, status, p.level_no, p.usergroup, p.user_id, p.supervisor, reason],
  logLabel: 'Email PO Request',
  withDocumentContext: true,
  buildData: (body) => ({
    sender: body.sender,
    entity_name: body.entity_name,
    descs: body.descs,
    email_address: body.email_addr,
    sender_addr: body.sender_addr,
    user_name: body.user_name,
    clarify_user: body.clarify_user,
    clarify_email: body.clarify_email,
    req_hd_descs: body.req_hd_descs,
    req_hd_no: body.req_hd_no,
    curr_cd: body.curr_cd,
    total_price: FormatHelper.numberFormat(body.total_price, 2),
    url_file: FormatHelper.explode('; ', body.url_file),
    file_name: FormatHelper.explode('; ', body.file_name),
    doc_link: FormatHelper.explode('; ', body.document_link),
    approve_list: FormatHelper.explode('; ', body.approve_exist),
    module: 'PoRequest',
    subject: `Need Approval for Purchase Requisition No.  ${body.req_hd_no}`,
  }),
  buildEncrypted: (body) => ({
    entity_cd: body.entity_cd,
    project_no: body.project_no,
    email_address: body.email_addr,
    entity_name: body.entity_name,
    level_no: body.level_no,
    doc_no: body.doc_no,
    usergroup: body.usergroup,
    user_id: body.user_id,
    supervisor: body.supervisor,
    type: 'Q',
    type_module: 'PO',
    text: 'Purchase Requisition',
  }),
};
