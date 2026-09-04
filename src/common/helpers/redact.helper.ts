/**
 * Penyamaran data sensitif sebelum ditulis ke log.
 *
 * Payload token approval memuat alamat email approver. Log harian tersimpan 30
 * hari, sehingga alamat email disamarkan sementara field penelusuran (doc_no,
 * entity_cd, level_no, type, approve_seq, user_id) tetap utuh.
 */

/** Nama field yang isinya dianggap alamat email. */
const EMAIL_KEYS = new Set([
  'email',
  'email_addr',
  'email_address',
  'emailaddr',
  'mail',
  'to',
  'cc',
  'bcc',
]);

/** `ahmad.ariffandy@ifca.co.id` -> `ah***@ifca.co.id` */
export function maskEmail(value: any): string {
  const raw = String(value ?? '');
  if (raw.trim() === '') return raw;

  // Beberapa field memuat banyak alamat dipisah `;` atau `,`.
  return raw
    .split(/([;,])/)
    .map((part) => {
      if (part === ';' || part === ',') return part;

      const trimmed = part.trim();
      const at = trimmed.lastIndexOf('@');
      if (at <= 0) return part;

      const local = trimmed.slice(0, at);
      const domain = trimmed.slice(at);
      const visible = local.slice(0, Math.min(2, local.length));

      return `${visible}***${domain}`;
    })
    .join('');
}

/** Salinan payload dengan seluruh field email tersamarkan. */
export function redactPayload(payload: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};

  Object.entries(payload ?? {}).forEach(([key, value]) => {
    if (EMAIL_KEYS.has(key.toLowerCase())) {
      out[key] = maskEmail(value);
      return;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = redactPayload(value as Record<string, any>);
      return;
    }
    out[key] = value;
  });

  return out;
}
