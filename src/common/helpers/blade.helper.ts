import * as fs from 'fs';
import * as path from 'path';

/**
 * Kumpulan helper yang dipakai template hasil konversi Blade -> EJS.
 * Nama fungsi sengaja dipertahankan sama dengan versi PHP-nya supaya isi
 * template tetap mudah dibandingkan dengan file .blade.php aslinya.
 */
export function blade(options: { appUrl: string; appName?: string }): Record<string, any> {
  const appUrl = (options.appUrl ?? '').replace(/\/+$/, '');

  /** Padanan `url('public/images/x.png')`. */
  const url = (relative = ''): string => {
    const clean = String(relative ?? '').replace(/^\/+/, '');
    return clean === '' ? appUrl : `${appUrl}/${clean}`;
  };

  /** Padanan `config('app.url')` / `config('app.name')`. */
  const config = (key: string, fallback: any = ''): any => {
    if (key === 'app.url') return appUrl;
    if (key === 'app.name') return options.appName ?? fallback;
    return fallback;
  };

  /** Padanan `route('nama')` - hanya rute yang benar-benar dipakai template. */
  const route = (name: string): string => {
    const map: Record<string, string> = {
      'apprlist.getData': `${appUrl}/apprlist/data`,
      'apprlist.sendData': `${appUrl}/apprlist/sendData`,
    };
    return map[name] ?? appUrl;
  };

  /** Padanan helper `getEntityLogo()` di app/Helpers/logo_helper.php. */
  const getEntityLogo = (entityName?: string): string => {
    if (!entityName || String(entityName).trim() === '') {
      return url('public/images/ifca_header.png');
    }

    const baseName = String(entityName).trim();
    const candidates = [
      `${baseName}.png`,
      `${baseName.replace(/ /g, '_')}.png`,
      `${baseName.replace(/ /g, '_').toLowerCase()}.png`,
    ];

    for (const file of candidates) {
      const absolute = path.join(process.cwd(), 'public', 'images', 'logo', file);
      if (fs.existsSync(absolute)) {
        return url(`public/images/logo/${file}`);
      }
    }

    return url('public/images/ifca_header.png');
  };

  const count = (value: any): number => {
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === 'object') return Object.keys(value).length;
    if (value === null || value === undefined || value === '') return 0;
    return 1;
  };

  /** Padanan `empty()` PHP (0, '0', '', null, [] dianggap kosong). */
  const empty = (value: any): boolean => {
    if (value === null || value === undefined || value === false) return true;
    if (value === 0 || value === '0' || value === '') return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  };

  /** Padanan `isset($a, $b, ...)`. */
  const isset = (...values: any[]): boolean =>
    values.length > 0 && values.every((value) => value !== null && value !== undefined);

  /** Padanan `strpos()` - mengembalikan false bila tidak ditemukan. */
  const strpos = (haystack: any, needle: any): number | false => {
    const index = String(haystack ?? '').indexOf(String(needle ?? ''));
    return index === -1 ? false : index;
  };

  /** Padanan `strrpos()` - posisi terakhir, false bila tidak ditemukan. */
  const strrpos = (haystack: any, needle: any): number | false => {
    const index = String(haystack ?? '').lastIndexOf(String(needle ?? ''));
    return index === -1 ? false : index;
  };

  const implode = (glue: string, values: any): string => arr(values).join(glue);

  const explode = (delimiter: string, value: any): string[] => String(value ?? '').split(delimiter);

  const rtrim = (value: any, chars = ' \t\n\r\0\x0B'): string => {
    let out = String(value ?? '');
    while (out.length > 0 && chars.includes(out[out.length - 1])) out = out.slice(0, -1);
    return out;
  };

  const ltrim = (value: any, chars = ' \t\n\r\0\x0B'): string => {
    let out = String(value ?? '');
    while (out.length > 0 && chars.includes(out[0])) out = out.slice(1);
    return out;
  };

  const trim = (value: any, chars?: string): string =>
    chars === undefined ? String(value ?? '').trim() : ltrim(rtrim(value, chars), chars);

  const str_replace = (search: any, replace: any, subject: any): string => {
    const searches = Array.isArray(search) ? search : [search];
    const replaces = Array.isArray(replace) ? replace : [replace];
    let out = String(subject ?? '');
    searches.forEach((needle, index) => {
      const to = Array.isArray(replace) ? (replaces[index] ?? '') : replaces[0];
      out = out.split(String(needle)).join(String(to));
    });
    return out;
  };

  const substr = (value: any, start: number, length?: number): string => {
    const text = String(value ?? '');
    const from = start < 0 ? Math.max(text.length + start, 0) : start;
    if (length === undefined) return text.slice(from);
    return length < 0 ? text.slice(from, text.length + length) : text.slice(from, from + length);
  };

  const strtoupper = (value: any): string => String(value ?? '').toUpperCase();
  const strtolower = (value: any): string => String(value ?? '').toLowerCase();

  const array_slice = (value: any, offset: number, length?: number): any[] => {
    const list = arr(value);
    const from = offset < 0 ? Math.max(list.length + offset, 0) : offset;
    if (length === undefined) return list.slice(from);
    return length < 0 ? list.slice(from, list.length + length) : list.slice(from, from + length);
  };

  const is_array = (value: any): boolean => Array.isArray(value);

  const is_object = (value: any): boolean =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

  const is_string = (value: any): boolean => typeof value === 'string';

  const is_numeric = (value: any): boolean => {
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value !== 'string' || value.trim() === '') return false;
    return Number.isFinite(Number(value));
  };

  const strlen = (value: any): number => String(value ?? '').length;

  const nl2br = (value: any): string => String(value ?? '').replace(/\r?\n/g, '<br>');

  const array_key_exists = (key: any, target: any): boolean =>
    target !== null && typeof target === 'object' && String(key) in target;

  const in_array = (needle: any, haystack: any): boolean =>
    arr(haystack).some((item) => item == needle); // eslint-disable-line eqeqeq

  /** Padanan `number_format($n, $decimals, $decPoint, $thousandsSep)`. */
  const number_format = (
    value: any,
    decimals = 0,
    decPoint = '.',
    thousandsSep = ',',
  ): string => {
    const parsed = Number(String(value ?? '').replace(/,/g, ''));
    const safe = Number.isFinite(parsed) ? parsed : 0;
    const fixed = Math.abs(safe).toFixed(decimals);
    const [intPart, decPart] = fixed.split('.');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
    const sign = safe < 0 ? '-' : '';
    return decPart ? `${sign}${grouped}${decPoint}${decPart}` : `${sign}${grouped}`;
  };

  /** Selalu kembalikan array - dipakai oleh @foreach hasil konversi. */
  const arr = (value: any): any[] => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    if (typeof value === 'object') return Object.values(value);
    return [value];
  };

  /** Pasangan [key, value] untuk `@foreach($a as $k => $v)`. */
  const entries = (value: any): Array<[any, any]> => {
    if (Array.isArray(value)) return value.map((item, index) => [index, item] as [any, any]);
    if (value === null || value === undefined) return [];
    if (typeof value === 'object') return Object.entries(value);
    return [[0, value]];
  };

  /** Escape HTML - padanan `{{ }}` pada Blade. */
  const e = (value: any): string =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  /** Blade mencetak string kosong untuk null/undefined, bukan "undefined". */
  const nz = (value: any): any => (value === null || value === undefined ? '' : value);

  return {
    url,
    config,
    route,
    getEntityLogo,
    count,
    empty,
    isset,
    strpos,
    strrpos,
    implode,
    explode,
    trim,
    rtrim,
    ltrim,
    str_replace,
    substr,
    strtoupper,
    strtolower,
    array_slice,
    array_key_exists,
    in_array,
    is_array,
    is_object,
    is_string,
    is_numeric,
    strlen,
    nl2br,
    number_format,
    arr,
    entries,
    e,
    nz,
    csrf_token: () => '',
  };
}
