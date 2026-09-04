import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat as any);

/**
 * Padanan app/Helpers/FormatHelper.php + beberapa fungsi PHP yang sering
 * dipakai controller (number_format, explode + trim, Carbon::parse, dll).
 */
export class FormatHelper {
  /**
   * Format tanggal dengan aman.
   * Nilai kosong atau "EMPTY" menghasilkan string kosong.
   */
  static safeDateFormat(value: any): string {
    if (value === null || value === undefined) return '';
    const raw = String(value).trim();
    if (raw === '' || raw.toUpperCase() === 'EMPTY') return '';

    const parsed = parseDate(raw);
    return parsed ? parsed.format('DD MMMM YYYY') : '';
  }

  /**
   * Format angka dengan aman.
   * Nilai kosong atau bukan angka menghasilkan string kosong.
   */
  static safeNumber(value: any): string {
    if (value === null || value === undefined) return '';
    const raw = String(value).trim();
    if (raw === '' || raw.toUpperCase() === 'EMPTY') return '';

    const parsed = Number(raw.replace(/,/g, ''));
    if (!Number.isFinite(parsed)) return '';

    return FormatHelper.numberFormat(parsed, 2, '.', ',');
  }

  /** Padanan `number_format($value, $decimals, $decPoint, $thousandsSep)`. */
  static numberFormat(value: any, decimals = 2, decPoint = '.', thousandsSep = ','): string {
    const parsed = Number(String(value ?? '').replace(/,/g, ''));
    const safe = Number.isFinite(parsed) ? parsed : 0;
    const fixed = Math.abs(safe).toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
    const sign = safe < 0 ? '-' : '';
    return decPart ? `${sign}${grouped}${decPoint}${decPart}` : `${sign}${grouped}`;
  }

  /** Padanan `\Carbon\Carbon::parse($value)->format('d F Y')`. */
  static dateLong(value: any): string {
    const parsed = parseDate(value);
    return parsed ? parsed.format('DD MMMM YYYY') : '';
  }

  /** Padanan `Carbon::parse($value)->format('d-m-Y')`. */
  static dateShort(value: any): string {
    const parsed = parseDate(value);
    return parsed ? parsed.format('DD-MM-YYYY') : '';
  }

  /** Padanan `Carbon::now('Asia/Jakarta')->format('d-m-Y H:i')`. */
  static nowJakarta(): string {
    const jakarta = new Date(Date.now() + 7 * 3600000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(jakarta.getUTCDate())}-${pad(jakarta.getUTCMonth() + 1)}-${jakarta.getUTCFullYear()} ${pad(
      jakarta.getUTCHours(),
    )}:${pad(jakarta.getUTCMinutes())}`;
  }

  /** Padanan `date('Ymd')`. */
  static ymd(value?: any): string {
    const parsed = value === undefined ? dayjs() : parseDate(value) ?? dayjs();
    return parsed.format('YYYYMMDD');
  }

  /**
   * Padanan `explode($delimiter, $value)` lalu diubah menjadi array biasa.
   * Nilai null menghasilkan [''] persis seperti PHP.
   */
  static explode(delimiter: string, value: any): string[] {
    return String(value ?? '').split(delimiter);
  }

  /**
   * Padanan pola berulang di controller:
   *   array_filter(array_map('trim', explode(';', $x)), fn => strtoupper($i) !== 'EMPTY' && $i !== '')
   */
  static cleanList(value: any, delimiter = ';'): string[] {
    return String(value ?? '')
      .split(delimiter)
      .map((item) => item.trim())
      .filter((item) => item !== '' && item.toUpperCase() !== 'EMPTY');
  }

  /**
   * Pasangkan url dengan nama file (pola `$attachments` / `$attachmentsAdd`).
   */
  static pairAttachments(
    urls: string[],
    names: string[],
    keys: [string, string] = ['url', 'file_name'],
  ): Array<Record<string, string>> {
    const out: Array<Record<string, string>> = [];
    urls.forEach((url, index) => {
      if (names[index] !== undefined) {
        out.push({ [keys[0]]: url, [keys[1]]: names[index] });
      }
    });
    return out;
  }

  /** Padanan `strToArray()` yang dideklarasikan di beberapa Land controller. */
  static strToArray(value: any): string[] {
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (value === null || value === undefined) return [];
    const raw = String(value);
    if (raw === '' || raw.toUpperCase() === 'EMPTY') return [];
    return raw.split(';').map((item) => item.trim());
  }
}

const DATE_FORMATS = [
  'YYYY-MM-DD HH:mm:ss',
  'YYYY-MM-DD HH:mm:ss.SSS',
  'YYYY-MM-DDTHH:mm:ss',
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'DD/MM/YYYY',
  'MMM D YYYY h:mmA',
  'MMM  D YYYY h:mmA',
  'MMM DD YYYY h:mmA',
];

export function parseDate(value: any): dayjs.Dayjs | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return dayjs(value);

  const raw = String(value).trim();
  if (raw === '' || raw.toUpperCase() === 'EMPTY') return null;

  const native = dayjs(raw);
  if (native.isValid()) return native;

  for (const format of DATE_FORMATS) {
    const parsed = dayjs(raw.replace(/\s+/g, ' '), format, true);
    if (parsed.isValid()) return parsed;
  }

  return null;
}
