/**
 * Padanan pola berikut pada controller Laravel:
 *
 *   if (strpos($x, "\n") !== false) {
 *       $x = str_replace("\n", ' (', $x) . ')';
 *   }
 *
 * Dipakai untuk deskripsi dokumen yang memuat baris kedua (CbPpu, CbRpb,
 * CbRum, CbFupd, PurchaseSelection).
 */
export function expandNewline(value: any): string {
  const raw = value === null || value === undefined ? '' : String(value);
  if (!raw.includes('\n')) return raw;
  return `${raw.split('\n').join(' (')})`;
}
