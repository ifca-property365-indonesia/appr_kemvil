import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AppLoggerService } from '../logger/app-logger.service';

export interface MailGuardResult<T = unknown> {
  /** true bila email memang baru dikirim pada pemanggilan ini */
  sent: boolean;
  /** true bila penanda cache sudah ada sebelumnya (email pernah dikirim) */
  alreadySent: boolean;
  result?: T;
}

/**
 * Padanan mekanisme anti-double-send milik project Laravel:
 *
 *   $cacheFilePath = storage_path('app/mail_cache/<dir>/<Ymd>/<file>.txt');
 *   $lockHandle = fopen($cacheFilePath . '.lock', 'w'); flock($lockHandle, LOCK_EX);
 *   if (!file_exists($cacheFilePath)) { Mail::send(...); file_put_contents(...,'sent'); }
 *
 * Struktur folder dipertahankan sama persis supaya proses lain (mis. resend dari
 * halaman Approval List) tetap dapat menemukan/menghapus penanda yang sama.
 */
@Injectable()
export class MailCacheService {
  private readonly baseDir = path.join(process.cwd(), 'storage', 'app', 'mail_cache');
  private readonly inProcessLocks = new Map<string, Promise<unknown>>();

  constructor(private readonly logger: AppLoggerService) {}

  /** storage/app/mail_cache/<relativeDir>/<fileName> */
  markerPath(relativeDir: string, fileName: string): string {
    return path.join(this.baseDir, relativeDir, fileName);
  }

  /** `date('Ymd')` versi PHP. */
  static today(date: Date = new Date()): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  }

  /**
   * Jalankan `action` hanya bila penanda belum ada.
   * Penanda ditulis SETELAH action sukses (sama seperti versi PHP).
   */
  async guard<T>(
    relativeDir: string,
    fileName: string,
    action: () => Promise<T>,
  ): Promise<MailGuardResult<T>> {
    const markerPath = this.markerPath(relativeDir, fileName);
    const lockPath = `${markerPath}.lock`;

    fs.mkdirSync(path.dirname(markerPath), { recursive: true });

    // Serialisasi antar-request dalam satu proses.
    const previous = this.inProcessLocks.get(markerPath) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => (release = resolve));
    this.inProcessLocks.set(
      markerPath,
      previous.then(() => current),
    );
    await previous;

    // Kunci antar-proses (mirip flock LOCK_EX).
    try {
      await acquireFileLock(lockPath, 15000, (message) =>
        this.logger.channel('sendmail').warn(message, { marker: markerPath }),
      );
    } catch (err: any) {
      release();
      if (this.inProcessLocks.get(markerPath) === current) {
        this.inProcessLocks.delete(markerPath);
      }
      this.logger
        .channel('sendmail')
        .error(`Gagal mengunci penanda email: ${err?.message ?? err}`, { marker: markerPath });
      throw err;
    }

    try {
      if (fs.existsSync(markerPath)) {
        return { sent: false, alreadySent: true };
      }

      const result = await action();

      try {
        fs.writeFileSync(markerPath, 'sent');
      } catch (err: any) {
        // Email SUDAH terkirim namun penanda gagal ditulis -> berpotensi dobel.
        this.logger
          .channel('sendmail')
          .error(
            `Email terkirim tetapi penanda cache gagal ditulis (risiko kirim ulang): ${err?.message ?? err}`,
            { marker: markerPath },
          );
      }

      return { sent: true, alreadySent: false, result };
    } finally {
      releaseFileLock(lockPath);
      release();
      if (this.inProcessLocks.get(markerPath) === current) {
        this.inProcessLocks.delete(markerPath);
      }
    }
  }

  /** Cek penanda tanpa mengunci - dipakai CheckFeedback / AutoFeedback. */
  exists(relativeDir: string, fileName: string): boolean {
    return fs.existsSync(this.markerPath(relativeDir, fileName));
  }

  ensureDirectory(relativeDir: string): void {
    fs.mkdirSync(path.join(this.baseDir, relativeDir), { recursive: true });
  }

  /**
   * Padanan `$deleteCacheFile()` pada ApprListControllers::sendData(),
   * menghapus penanda .txt beserta .lock supaya email dapat dikirim ulang.
   */
  forget(relativeDir: string, pattern: string): { txt: string; lock: string; removed: boolean } {
    const txt = this.markerPath(relativeDir, `${pattern}.txt`);
    const lock = `${txt}.lock`;
    let removed = false;

    if (fs.existsSync(txt)) {
      fs.unlinkSync(txt);
      removed = true;
    }
    if (fs.existsSync(lock)) {
      try {
        fs.unlinkSync(lock);
      } catch (err: any) {
        // lock mungkin sedang dipakai proses lain
        this.logger
          .channel('resend_apprlist')
          .warn(`Lock file tidak dapat dihapus: ${err?.message ?? err}`, { lock });
      }
    }

    return { txt, lock, removed };
  }
}

async function acquireFileLock(
  lockPath: string,
  timeoutMs = 15000,
  onEvent: (message: string) => void = () => undefined,
): Promise<void> {
  const started = Date.now();

  for (;;) {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.closeSync(fd);
      return;
    } catch (err: any) {
      if (err?.code !== 'EEXIST') throw err;

      // Bersihkan lock yatim (proses sebelumnya mati sebelum sempat melepas).
      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > 60000) {
          fs.unlinkSync(lockPath);
          onEvent(`Lock yatim dibersihkan (umur > 60 detik): ${lockPath}`);
          continue;
        }
      } catch {
        continue;
      }

      if (Date.now() - started > timeoutMs) {
        throw new Error(`Failed to acquire lock setelah ${timeoutMs}ms: ${lockPath}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

function releaseFileLock(lockPath: string): void {
  try {
    fs.unlinkSync(lockPath);
  } catch {
    /* diabaikan */
  }
}
