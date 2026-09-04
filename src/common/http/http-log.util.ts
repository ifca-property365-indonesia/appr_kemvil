import type { Request } from 'express';

/**
 * Alamat IP klien. Aplikasi berjalan di belakang IIS/nginx sehingga alamat asli
 * ada pada `X-Forwarded-For` (ambil hop pertama).
 */
export function clientIp(request?: Request): string {
  if (!request) return '';

  const forwarded = request.headers?.['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (raw) {
    const first = String(raw).split(',')[0]?.trim();
    if (first) return first;
  }

  return String(request.ip ?? request.socket?.remoteAddress ?? '');
}

export interface RequestMeta {
  method: string;
  url: string;
  ip: string;
  ua: string;
}

/** Metadata request yang aman ditulis ke log (tanpa body/payload). */
export function describeRequest(request?: Request): RequestMeta {
  return {
    method: request?.method ?? '',
    url: request?.originalUrl ?? request?.url ?? '',
    ip: clientIp(request),
    ua: String(request?.headers?.['user-agent'] ?? ''),
  };
}
