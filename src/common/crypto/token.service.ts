import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { DatabaseService } from '../database/database.service';
import { AppLoggerService } from '../logger/app-logger.service';

/**
 * Pengganti `Crypt::encrypt()` / `Crypt::decrypt()` milik Laravel.
 *
 * Laravel menghasilkan token base64 sepanjang ~350-500 karakter sehingga URL
 * approval menjadi sangat panjang. Di sini disediakan dua mode:
 *
 *  1. mode `db` (default)  -> payload disimpan di tabel `mgr.approval_url_token`,
 *     URL hanya membawa id acak base62 sepanjang 10 karakter, contoh:
 *         https://host/api/cmentry/A/f3Kq9ZaP2x
 *     Payload yang identik akan memakai id yang sama (idempotent) sehingga
 *     pengiriman ulang email tidak menumpuk baris.
 *
 *  2. mode `inline`        -> payload dipadatkan (deflate) lalu dienkripsi
 *     AES-256-GCM dan di-encode base64url. Tidak butuh tabel, panjang token
 *     sekitar 120-180 karakter (masih jauh lebih pendek dari Laravel).
 *
 * Kedua mode dapat dibaca bersamaan saat decrypt: token sepanjang <= 24 karakter
 * dan hanya berisi karakter base62 akan dicari di tabel, selain itu diperlakukan
 * sebagai token inline.
 */
@Injectable()
export class TokenService implements OnModuleInit {
  private readonly key: Buffer;
  private tableReady = false;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly logger: AppLoggerService,
  ) {
    this.key = deriveKey(this.config.get<string>('app.key') ?? '');
  }

  async onModuleInit(): Promise<void> {
    if (this.mode === 'db' && this.config.get<boolean>('token.autoMigrate')) {
      await this.ensureTable().catch((err) =>
        this.logger
          .channel('daily')
          .error(`Gagal menyiapkan tabel token URL: ${err.message ?? err}`),
      );
    }
  }

  private get mode(): 'db' | 'inline' {
    return this.config.get<'db' | 'inline'>('token.mode') ?? 'db';
  }

  private get table(): string {
    return this.config.get<string>('token.table') ?? 'mgr.approval_url_token';
  }

  /** Membuat tabel penyimpan payload bila belum ada. */
  async ensureTable(): Promise<void> {
    if (this.tableReady) return;

    const [schema, name] = splitTable(this.table);
    await this.db.query(
      `IF NOT EXISTS (
          SELECT 1 FROM sys.tables t
          JOIN sys.schemas s ON s.schema_id = t.schema_id
          WHERE s.name = ? AND t.name = ?
       )
       BEGIN
          CREATE TABLE ${this.table} (
              id            VARCHAR(32)   NOT NULL PRIMARY KEY,
              payload_hash  CHAR(64)      NOT NULL,
              payload       NVARCHAR(MAX) NOT NULL,
              created_at    DATETIME      NOT NULL CONSTRAINT DF_approval_url_token_created DEFAULT (GETDATE())
          );
          CREATE UNIQUE INDEX UX_approval_url_token_hash ON ${this.table} (payload_hash);
       END`,
      [schema, name],
    );

    this.tableReady = true;
  }

  /** Padanan `Crypt::encrypt($array)` - mengembalikan token pendek. */
  async encrypt(payload: Record<string, any>): Promise<string> {
    const json = JSON.stringify(payload ?? {});

    if (this.mode === 'inline') {
      return this.encryptInline(json);
    }

    try {
      return await this.storeToDatabase(json);
    } catch (err: any) {
      // Bila tabel token bermasalah, jangan sampai email gagal terkirim.
      this.logger
        .channel('daily')
        .error(`Token DB tidak tersedia, fallback ke mode inline: ${err.message ?? err}`);
      return this.encryptInline(json);
    }
  }

  /** Padanan `Crypt::decrypt($token)`. */
  async decrypt<T extends Record<string, any> = Record<string, any>>(token: string): Promise<T> {
    const value = (token ?? '').trim();
    if (value === '') {
      throw new Error('The payload is invalid.');
    }

    if (isShortId(value)) {
      const json = await this.readFromDatabase(value);
      if (json !== null) return JSON.parse(json) as T;
      // fallback: mungkin token inline yang kebetulan pendek
    }

    return JSON.parse(this.decryptInline(value)) as T;
  }

  // ------------------------------------------------------------------
  // mode: db
  // ------------------------------------------------------------------

  private async storeToDatabase(json: string): Promise<string> {
    await this.ensureTable();

    const hash = crypto.createHash('sha256').update(json).digest('hex');

    const existing = await this.db.value<string>(
      `SELECT TOP 1 id FROM ${this.table} WHERE payload_hash = ?`,
      [hash],
    );
    if (existing) return existing.trim();

    const length = this.config.get<number>('token.length') ?? 10;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const id = randomId(length + Math.floor(attempt / 2));
      try {
        await this.db.query(
          `INSERT INTO ${this.table} (id, payload_hash, payload) VALUES (?, ?, ?)`,
          [id, hash, json],
        );
        return id;
      } catch (err: any) {
        const message = String(err?.message ?? '');
        // 2627/2601 = duplicate key. Bisa karena id bentrok, bisa karena payload
        // yang sama ditulis proses lain secara bersamaan.
        if (!/2627|2601|duplicate|UNIQUE KEY/i.test(message)) throw err;

        const raced = await this.db.value<string>(
          `SELECT TOP 1 id FROM ${this.table} WHERE payload_hash = ?`,
          [hash],
        );
        if (raced) return raced.trim();
      }
    }

    throw new Error('Tidak dapat membuat id token yang unik.');
  }

  private async readFromDatabase(id: string): Promise<string | null> {
    await this.ensureTable();

    const ttlDays = this.config.get<number>('token.ttlDays') ?? 0;
    const row = await this.db.first<{ payload: string; created_at: Date }>(
      `SELECT payload, created_at FROM ${this.table} WHERE id = ?`,
      [id],
    );
    if (!row) return null;

    if (ttlDays > 0 && row.created_at) {
      const expiry = new Date(row.created_at).getTime() + ttlDays * 86400000;
      if (Date.now() > expiry) {
        throw new Error('The payload is invalid.');
      }
    }

    return row.payload;
  }

  // ------------------------------------------------------------------
  // mode: inline
  // ------------------------------------------------------------------

  private encryptInline(json: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const compressed = zlib.deflateRawSync(Buffer.from(json, 'utf8'), { level: 9 });
    const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
  }

  private decryptInline(token: string): string {
    let raw: Buffer;
    try {
      raw = Buffer.from(token, 'base64url');
    } catch {
      throw new Error('The payload is invalid.');
    }
    if (raw.length < 29) throw new Error('The payload is invalid.');

    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const body = raw.subarray(28);

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(tag);
      const compressed = Buffer.concat([decipher.update(body), decipher.final()]);
      return zlib.inflateRawSync(compressed).toString('utf8');
    } catch {
      throw new Error('The payload is invalid.');
    }
  }
}

function deriveKey(appKey: string): Buffer {
  const raw = appKey.startsWith('base64:') ? appKey.slice(7) : appKey;
  const decoded = Buffer.from(raw, 'base64');
  if (decoded.length === 32) return decoded;
  // APP_KEY tidak 32 byte -> turunkan lewat SHA-256 agar tetap valid.
  return crypto.createHash('sha256').update(appKey || 'approval-befa').digest();
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function randomId(length: number): string {
  const alphabet = ALPHABET;
  const bytes = crypto.randomBytes(length * 2);
  let out = '';
  for (let i = 0; out.length < length && i < bytes.length; i += 1) {
    const index = bytes[i];
    // buang nilai yang membuat distribusi tidak merata
    if (index >= 248) continue;
    out += alphabet[index % alphabet.length];
  }
  while (out.length < length) {
    out += alphabet[crypto.randomInt(alphabet.length)];
  }
  return out;
}

function isShortId(value: string): boolean {
  return value.length <= 24 && /^[A-Za-z0-9]+$/.test(value);
}

function splitTable(table: string): [string, string] {
  const parts = table.split('.');
  if (parts.length >= 2) {
    return [parts[0].replace(/[[\]]/g, ''), parts[1].replace(/[[\]]/g, '')];
  }
  return ['dbo', table.replace(/[[\]]/g, '')];
}
