import { DocumentApprovalDefinition } from '../../common/base/document-approval.base';
import { FormatHelper, parseDate } from '../../common/helpers/format.helper';
import { expandNewline } from '../../common/helpers/text.helper';

/**
 * Migrasi dari app/Http/Controllers/PurchaseSelectionController.php
 * Route lama: POST /api/purchase_selection, GET /api/poselection/{status}/{encrypt},
 *             POST /api/poselection/getaccess, POST /api/pos/getaccess
 */
export const PURCHASE_SELECTION: DocumentApprovalDefinition = {
  key: 'poselection',
  text: 'Purchase Selection',
  label: 'Purchase Selection',
  type: 'S',
  typeModule: 'PO',
  cacheDir: 'send_pos',
  mailView: 'email.pos.send',
  passCheckView: 'email/pos/passcheckwithremark2',
  procedure: 'mgr.x_send_mail_approval_po_selection',
  logLabel: 'Email PO Selection',
  /**
   * Padanan:
   *   $trx_date = rtrim($data["trx_date"], '.');
   *   $dateTime = DateTime::createFromFormat('Y-m-d H:i:s', $trx_date)->format('d-m-Y');
   */
  procedureParams: (p, status, reason) => [
    p.entity_cd,
    p.project_no,
    p.doc_no,
    p.request_no,
    formatTrxDate(p.trx_date),
    status,
    p.level_no,
    p.usergroup,
    p.user_id,
    p.supervisor,
    reason,
  ],
  buildData: (body) => {
    const poDescs = expandNewline(body.po_descs);

    return {
      ref_no: body.ref_no,
      po_doc_no: body.po_doc_no,
      po_descs: poDescs,
      supplier_name: body.supplier_name,
      sender: body.sender,
      sender_addr: body.sender_addr,
      entity_name: body.entity_name,
      descs: body.descs,
      user_name: body.user_name,
      url_file: FormatHelper.explode('; ', body.url_file),
      file_name: FormatHelper.explode('; ', body.file_name),
      doc_link: FormatHelper.explode('; ', body.document_link),
      approve_list: FormatHelper.explode('; ', body.approve_exist),
      curr_cd: body.curr_cd,
      total_amt: FormatHelper.numberFormat(body.total_amt, 2),
      clarify_user: body.clarify_user,
      clarify_email: body.clarify_email,
      body: `Please approve Quotation No. ${body.po_doc_no} for ${poDescs}`,
      subject: `Need Approval for Quotation No.  ${body.po_doc_no}`,
    };
  },
  buildEncrypted: (body) => ({
    entity_cd: body.entity_cd,
    project_no: body.project_no,
    doc_no: body.doc_no,
    request_no: body.request_no,
    trx_date: body.trx_date,
    level_no: body.level_no,
    usergroup: body.usergroup,
    user_id: body.user_id,
    supervisor: body.supervisor,
    type: 'S',
    type_module: 'PO',
    text: 'Purchase Selection',
  }),
};

function formatTrxDate(value: any): string {
  const raw = String(value ?? '').replace(/\.+$/, '');
  const parsed = parseDate(raw);
  return parsed ? parsed.format('DD-MM-YYYY') : raw;
}
