import type { Request } from 'express';

/**
 * Base URL sesuai alamat yang benar-benar dipakai untuk membuka halaman,
 * bukan nilai statis `APP_URL` pada .env.
 *
 * Contoh: aplikasi di-deploy di https://appr-befa.property365.co.id:4525/
 * akan menghasilkan `https://appr-befa.property365.co.id:4525` walaupun
 * APP_URL masih berisi http://localhost:3000.
 *
 * Aplikasi berjalan di belakang IIS/nginx sehingga header `X-Forwarded-*`
 * didahulukan; bila tidak ada, dipakai header `Host`.
 *
 * Catatan: `Host` dan `X-Forwarded-*` berasal dari klien, jadi nilai ini hanya
 * layak dipakai untuk tautan pada halaman itu sendiri - jangan dipakai untuk
 * menyusun URL di dalam email (email tetap memakai APP_URL).
 */
export function requestBaseUrl(request?: Request, fallback = ''): string {
  const fallbackUrl = stripTrailingSlash(fallback);
  if (!request) return fallbackUrl;

  const proto = firstValue(request.headers?.['x-forwarded-proto']) || request.protocol || 'http';

  const host = firstValue(request.headers?.['x-forwarded-host']) || String(request.headers?.host ?? '');
  if (host === '') return fallbackUrl;

  const port = firstValue(request.headers?.['x-forwarded-port']);
  const authority = hasPort(host) ? host : appendPort(host, port, proto);

  return `${proto}://${stripDefaultPort(authority, proto)}`;
}

/** Header proxy dapat berisi banyak nilai (`a, b`) atau berupa array. */
function firstValue(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw ?? '')
    .split(',')[0]
    .trim();
}

/** `example.com:4525` dan `[::1]:3000` dianggap sudah memuat port. */
function hasPort(host: string): boolean {
  return host.startsWith('[') ? host.includes(']:') : host.includes(':');
}

function appendPort(host: string, port: string, proto: string): string {
  if (port === '' || isDefaultPort(port, proto)) return host;
  return `${host}:${port}`;
}

function stripDefaultPort(authority: string, proto: string): string {
  const index = authority.startsWith('[') ? authority.indexOf(']:') + 1 : authority.lastIndexOf(':');
  if (index <= 0) return authority;

  const port = authority.slice(index + 1);
  return isDefaultPort(port, proto) ? authority.slice(0, index) : authority;
}

function isDefaultPort(port: string, proto: string): boolean {
  return (proto === 'https' && port === '443') || (proto === 'http' && port === '80');
}

function stripTrailingSlash(value: string): string {
  return String(value ?? '').replace(/\/+$/, '');
}
