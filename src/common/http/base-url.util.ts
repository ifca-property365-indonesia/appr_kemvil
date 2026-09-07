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

  const rawHost = String(request.headers?.host ?? '');
  const forwardedHost = firstValue(request.headers?.['x-forwarded-host']);
  const host = forwardedHost || rawHost;
  if (host === '') return fallbackUrl;

  const authority = hasPort(host)
    ? host
    : appendPort(host, resolvePort(request, forwardedHost, rawHost), proto);

  return `${proto}://${stripDefaultPort(authority, proto)}`;
}

/**
 * Sebagian proxy (IIS ARR, nginx dengan `proxy_set_header Host $host`) mengirim
 * `X-Forwarded-Host` tanpa port dan tidak mengirim `X-Forwarded-Port`, padahal
 * portnya masih ada pada header `Host`. Port dari `Host` hanya dipinjam bila
 * nama host-nya sama, supaya port internal upstream (mis. `127.0.0.1:3000`)
 * tidak ikut terbawa ke URL publik.
 */
function resolvePort(request: Request, forwardedHost: string, rawHost: string): string {
  const forwardedPort = firstValue(request.headers?.['x-forwarded-port']);
  if (forwardedPort !== '') return forwardedPort;

  if (forwardedHost === '' || rawHost === '') return '';
  if (hostname(rawHost) !== hostname(forwardedHost)) return '';

  return portOf(rawHost);
}

/** `example.com:4525` -> `example.com`, `[::1]:3000` -> `[::1]` */
function hostname(host: string): string {
  const index = separatorIndex(host);
  return (index < 0 ? host : host.slice(0, index)).toLowerCase();
}

function portOf(host: string): string {
  const index = separatorIndex(host);
  return index < 0 ? '' : host.slice(index + 1);
}

/** Posisi `:` pemisah port, mengabaikan titik dua di dalam alamat IPv6. */
function separatorIndex(host: string): number {
  return host.startsWith('[') ? host.indexOf(']:') + 1 || -1 : host.lastIndexOf(':');
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
  return separatorIndex(host) >= 0;
}

function appendPort(host: string, port: string, proto: string): string {
  if (port === '' || isDefaultPort(port, proto)) return host;
  return `${host}:${port}`;
}

function stripDefaultPort(authority: string, proto: string): string {
  const index = separatorIndex(authority);
  if (index < 0) return authority;

  return isDefaultPort(authority.slice(index + 1), proto) ? authority.slice(0, index) : authority;
}

function isDefaultPort(port: string, proto: string): boolean {
  return (proto === 'https' && port === '443') || (proto === 'http' && port === '80');
}

function stripTrailingSlash(value: string): string {
  return String(value ?? '').replace(/\/+$/, '');
}
