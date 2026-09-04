export interface FeedbackTarget {
  /** Deskripsi panjang dokumen yang dikirim ke stored procedure. */
  descsLong: string;
  /** Stored procedure pengirim email feedback. */
  exec: string;
  /** Sub folder penanda cache email feedback. */
  folder: string;
}

/**
 * Pemetaan (TYPE, module) -> stored procedure feedback yang dipakai bersama oleh
 * AutoFeedbackController, OldFeedbackController dan CheckFeedbackController.
 *
 * Catatan: pada versi Laravel, cabang `type == 'D' && module == 'CB'` ditulis dua
 * kali (Recapitulation Bank lalu Cash Advance Settlement). Cabang kedua tidak
 * pernah tercapai, jadi di sini hanya Recapitulation Bank yang dipertahankan.
 */
export const FEEDBACK_MAP: Record<string, Record<string, FeedbackTarget>> = {
  CB: {
    E: {
      descsLong: 'Propose Transfer to Bank',
      exec: 'mgr.x_send_mail_approval_feedback_cb_fupd',
      folder: 'feedbackCbFupd',
    },
    U: {
      descsLong: 'Payment Request',
      exec: 'mgr.x_send_mail_approval_feedback_cb_ppu',
      folder: 'feedbackCb',
    },
    V: {
      descsLong: 'Payment Request',
      exec: 'mgr.x_send_mail_approval_feedback_cb_ppu_vvip',
      folder: 'feedbackCb',
    },
    D: {
      descsLong: 'Recapitulation Bank',
      exec: 'mgr.x_send_mail_approval_feedback_cb_rpb',
      folder: 'feedbackCb',
    },
    G: {
      descsLong: 'Cash Advance Settlement',
      exec: 'mgr.x_send_mail_approval_feedback_cb_rum',
      folder: 'feedbackCb',
    },
  },
  PO: {
    A: {
      descsLong: 'Purchase Order',
      exec: 'mgr.x_send_mail_approval_feedback_po_order',
      folder: 'feedbackPoOrder',
    },
    Q: {
      descsLong: 'Purchase Requisition',
      exec: 'mgr.x_send_mail_approval_feedback_po_request',
      folder: 'feedbackPOR',
    },
    S: {
      descsLong: 'Purchase Selection',
      exec: 'mgr.x_send_mail_approval_feedback_po_selection',
      folder: 'feedbackPOS',
    },
  },
  CM: {
    A: {
      descsLong: 'Contract Progress',
      exec: 'mgr.x_send_mail_approval_feedback',
      folder: 'feedbackCb',
    },
    B: {
      descsLong: 'Contract Complete',
      exec: 'mgr.x_send_mail_approval_feedback',
      folder: 'feedbackCb',
    },
    C: {
      descsLong: 'Contract Close',
      exec: 'mgr.x_send_mail_approval_feedback',
      folder: 'feedbackCb',
    },
    D: {
      descsLong: 'Varian Order',
      exec: 'mgr.x_send_mail_approval_feedback',
      folder: 'feedbackCb',
    },
    E: {
      descsLong: 'Contract Entry',
      exec: 'mgr.x_send_mail_approval_feedback',
      folder: 'feedbackCb',
    },
  },
};

export function resolveFeedbackTarget(type: any, module: any): FeedbackTarget | null {
  const key = String(module ?? '').trim();
  const code = String(type ?? '').trim();
  return FEEDBACK_MAP[key]?.[code] ?? null;
}

/**
 * Query dokumen berstatus A yang sudah berada di level approval tertinggi.
 * Padanan query Eloquent pada AutoFeedback/OldFeedback/CheckFeedback.
 */
export const APPROVED_TOP_LEVEL_SQL = `
  SELECT r.* FROM mgr.cb_cash_request_appr r
  WHERE r.status = 'A'
    AND DAY(r.approved_date) = ?
    AND MONTH(r.approved_date) = MONTH(GETDATE())
    AND YEAR(r.approved_date) = YEAR(GETDATE())
    AND r.level_no = (
      SELECT MAX(a.level_no) FROM mgr.cb_cash_request_appr a
      WHERE a.entity_cd = r.entity_cd
        AND a.approve_seq = r.approve_seq
        AND a.doc_no = r.doc_no
        AND a.module = r.module
        AND a.request_type = r.request_type
    )
  ORDER BY r.approved_date DESC
`;
