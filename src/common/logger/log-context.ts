import { AsyncLocalStorage } from 'async_hooks';

/**
 * Nama module yang sedang diproses, dipakai `AppLoggerService` untuk memilih
 * file log. Disimpan pada AsyncLocalStorage supaya seluruh pemanggilan log di
 * dalam satu alur (termasuk `await` berlapis) otomatis ikut, tanpa perlu
 * mengoper nama module ke setiap `logger.channel(...)`.
 */
const storage = new AsyncLocalStorage<string>();

/** Dipakai bila proses berjalan di luar konteks module (startup, error pool DB). */
export const DEFAULT_LOG_MODULE = 'general';

/** Jalankan `fn` dengan nama module tertentu sebagai konteks log. */
export function runWithLogModule<T>(module: string, fn: () => T): T {
  return storage.run(sanitizeLogModule(module), fn);
}

export function currentLogModule(): string {
  return storage.getStore() ?? DEFAULT_LOG_MODULE;
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
