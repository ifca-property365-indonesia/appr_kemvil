import { AsyncLocalStorage } from 'async_hooks';
import { randomBytes } from 'crypto';

/**
 * Nama module yang sedang diproses (dipakai `AppLoggerService` untuk memilih
 * file log) beserta id request (ditulis di setiap baris log supaya satu alur
 * dapat ditelusuri lintas channel). Disimpan pada AsyncLocalStorage supaya
 * seluruh pemanggilan log di dalam satu alur (termasuk `await` berlapis)
 * otomatis ikut, tanpa perlu mengoper nilainya ke setiap `logger.channel(...)`.
 */
interface LogContext {
  module: string;
  requestId: string;
}

const storage = new AsyncLocalStorage<LogContext>();

/** Dipakai bila proses berjalan di luar konteks module (startup, error pool DB). */
export const DEFAULT_LOG_MODULE = 'general';

/** Jalankan `fn` dengan nama module tertentu sebagai konteks log, dengan id request baru. */
export function runWithLogModule<T>(module: string, fn: () => T): T {
  return storage.run({ module: sanitizeLogModule(module), requestId: newRequestId() }, fn);
}

export function currentLogModule(): string {
  return storage.getStore()?.module ?? DEFAULT_LOG_MODULE;
}

/** Id request yang sedang berjalan; kosong bila di luar request (startup, timer). */
export function currentRequestId(): string {
  return storage.getStore()?.requestId ?? '';
}

/** 8 karakter hex, cukup unik untuk menelusuri log harian. */
function newRequestId(): string {
  return randomBytes(4).toString('hex');
}

/**
 * Turunkan nama module dari nama kelas service.
 *   LandVerificationService -> land_verification
 *   CbPpuVvipService        -> cb_ppu_vvip
 *   LandSphService          -> land_sph
 */
export function logModuleFromClass(instance: object): string {
  const raw = instance?.constructor?.name ?? '';
  const trimmed = raw.replace(/(Service|Controller)$/, '');
  const snake = trimmed
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
  return sanitizeLogModule(snake);
}

/** Buang karakter yang tidak aman untuk nama file. */
export function sanitizeLogModule(value: string): string {
  const clean = String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return clean === '' ? DEFAULT_LOG_MODULE : clean.slice(0, 60);
}
