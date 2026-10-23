import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';
import { AppLoggerService } from '../logger/app-logger.service';

export type Row = Record<string, any>;

export interface ProcedureResult {
  /** true bila batch selesai tanpa exception. */
  ok: boolean;
  /** Nilai `RETURN` stored procedure, null bila penangkapan dimatikan. */
  returnCode: number | null;
  rowsAffected: number;
  durationMs: number;
}

/**
 * Padanan `DB::connection('BEFA')` pada Laravel.
 *
 * Menyediakan:
 *  - query()      : SELECT dengan parameter berurutan (?, ?, ?)
 *  - first()      : ambil satu baris
 *  - value()      : ambil satu kolom dari baris pertama
 *  - exists()     : cek keberadaan baris dari kondisi where sederhana
 *  - table()      : builder where sederhana (pengganti ->table()->where()->get())
 *  - execProcedure(): `SET NOCOUNT ON; EXEC <proc> ?, ?, ...`
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: sql.ConnectionPool | null = null;
  private connecting: Promise<sql.ConnectionPool> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
  ) {}

  private get options(): sql.config {
    const cfg = this.config.get('database.befa');
    return {
      server: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      requestTimeout: cfg.requestTimeout,
      connectionTimeout: 30000,
      options: {
        encrypt: cfg.encrypt,
        trustServerCertificate: cfg.trustServerCertificate,
        enableArithAbort: true,
      },
      pool: { max: cfg.poolMax, min: 0, idleTimeoutMillis: 30000 },
    };
  }

  async getPool(): Promise<sql.ConnectionPool> {
    if (this.pool?.connected) return this.pool;
    if (this.connecting) return this.connecting;

    this.connecting = new sql.ConnectionPool(this.options)
      .connect()
      .then((pool) => {
        this.pool = pool;
        this.connecting = null;
        pool.on('error', (err) => this.logger.channel('daily').error(`MSSQL pool error: ${err.message}`));
        return pool;
      })
      .catch((err) => {
        this.connecting = null;
        throw err;
      });

    return this.connecting;
  }

  getDatabaseName(): string {
    return this.config.get<string>('database.befa.database');
  }

  /** Test koneksi - padanan `DB::connection('BEFA')->getPdo()`. */
  async ping(): Promise<void> {
    const pool = await this.getPool();
    await pool.request().query('SELECT 1 AS ok');
  }

  /**
   * Jalankan SQL dengan placeholder `?` (berurutan) supaya penulisan query
   * tetap mirip dengan versi PDO di Laravel.
   */
  async query<T extends Row = Row>(sqlText: string, params: any[] = []): Promise<T[]> {
    const pool = await this.getPool();
    const request = pool.request();

    let index = 0;
    const compiled = sqlText.replace(/\?/g, () => {
      const name = `p${index}`;
      request.input(name, normalize(params[index]));
      index += 1;
      return `@${name}`;
    });

    const result = await request.query<T>(compiled);
    return (result.recordset ?? []) as T[];
  }

  async first<T extends Row = Row>(sqlText: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sqlText, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async value<T = any>(sqlText: string, params: any[] = []): Promise<T | null> {
    const row = await this.first(sqlText, params);
    if (!row) return null;
    const keys = Object.keys(row);
    return keys.length > 0 ? (row[keys[0]] as T) : null;
  }

  /**
   * Padanan `->table($table)->where($assoc)->get()`.
   * `where` bernilai array akan diterjemahkan menjadi `IN (...)`.
   */
  async selectWhere<T extends Row = Row>(
    table: string,
    where: Record<string, any>,
    options: { columns?: string; orderBy?: string; whereIn?: Record<string, any[]> } = {},
  ): Promise<T[]> {
    const { clause, params } = buildWhere(where, options.whereIn);
    const columns = options.columns ?? '*';
    const orderBy = options.orderBy ? ` ORDER BY ${options.orderBy}` : '';
    return this.query<T>(`SELECT ${columns} FROM ${table}${clause}${orderBy}`, params);
  }

  /** Padanan `->where(...)->exists()`. */
  async exists(
    table: string,
    where: Record<string, any>,
    whereIn?: Record<string, any[]>,
  ): Promise<boolean> {
    const { clause, params } = buildWhere(where, whereIn);
    const rows = await this.query(`SELECT TOP 1 1 AS ok FROM ${table}${clause}`, params);
    return rows.length > 0;
  }

  /**
   * Padanan:
   *   $sth = $pdo->prepare("SET NOCOUNT ON; EXEC <proc> ?, ?, ...");
   *   $sth->execute([...]);
   *
   * Mengembalikan `true` bila eksekusi sukses (mirip nilai balik PDO::execute()).
   */
  async execProcedure(procedure: string, params: any[] = []): Promise<boolean> {
    const result = await this.execProcedureDetailed(procedure, params);
    return result.ok;
  }

  /**
   * Versi `execProcedure()` yang juga melaporkan return code, jumlah baris
   * terpengaruh dan durasi eksekusi supaya dapat ditulis ke log audit.
   *
   * Return code hanya DICATAT, tidak dipakai untuk menentukan sukses/gagal:
   * konvensi nilai balik tiap stored procedure berbeda-beda sehingga menilainya
   * sebagai kegagalan berisiko mengubah hasil approval yang selama ini benar.
   * Set `DB_PROC_RETURN_CODE=false` bila penangkapan return code perlu dimatikan.
   */
  async execProcedureDetailed(procedure: string, params: any[] = []): Promise<ProcedureResult> {
    const capture = this.config.get<boolean>('log.procReturnCode') ?? true;
    const args = params.map((_, index) => `@p${index}`).join(', ');
    const call = args ? `${procedure} ${args}` : procedure;

    const statement = capture
      ? `SET NOCOUNT ON; DECLARE @__rc INT; EXEC @__rc = ${call}; SELECT @__rc AS __rc;`
      : `SET NOCOUNT ON; EXEC ${call};`;

    this.logger.channel('daily').info('Executing Procedure', { proc: procedure, params });
    this.logger.transaction('EXEC_SP', 'MULAI', procedure, { proc: procedure, params });

    const started = Date.now();
    try {
      // Koneksi dibuka di dalam try supaya kegagalan koneksi ikut tercatat sebagai GAGAL.
      const pool = await this.getPool();
      const request = pool.request();
      params.forEach((value, index) => request.input(`p${index}`, normalize(value)));

      const result = await request.query(statement);
      const durationMs = Date.now() - started;
      const returnCode = capture ? extractReturnCode(result) : null;
      const rowsAffected = Array.isArray(result.rowsAffected)
        ? result.rowsAffected.reduce((total, value) => total + value, 0)
        : 0;

      const meta = { proc: procedure, returnCode, rowsAffected, durationMs };
      if (returnCode !== null && returnCode !== 0) {
        this.logger
          .channel('daily')
          .warn(`Procedure ${procedure} selesai dengan return code ${returnCode}`, {
            ...meta,
            params,
          });
      } else {
        this.logger.channel('daily').info(`Procedure ${procedure} selesai`, meta);
      }
      // Return code bukan 0 tetap SUKSES (lihat catatan di atas); nilainya ada di meta.
      this.logger.transaction('EXEC_SP', 'SUKSES', procedure, { ...meta, params });

      return { ok: true, returnCode, rowsAffected, durationMs };
    } catch (err: any) {
      const durationMs = Date.now() - started;
      const meta = { proc: procedure, params, durationMs };
      this.logger.channel('daily').error(`Procedure ${procedure} gagal: ${err?.message ?? err}`, meta);
      this.logger.transaction('EXEC_SP', 'GAGAL', `${procedure}: ${err?.message ?? err}`, meta);
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.close().catch(() => undefined);
      this.pool = null;
    }
  }
}

/** Ambil nilai `SELECT @__rc AS __rc` yang selalu menjadi recordset terakhir. */
function extractReturnCode(result: sql.IResult<any>): number | null {
  const sets = (result.recordsets ?? []) as any[];

  for (let i = sets.length - 1; i >= 0; i -= 1) {
    const rows = sets[i];
    if (Array.isArray(rows) && rows.length > 0 && rows[0] && '__rc' in rows[0]) {
      const value = Number(rows[0].__rc);
      return Number.isFinite(value) ? value : null;
    }
  }

  return null;
}

function normalize(value: any): any {
  if (value === undefined) return null;
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  return value;
}

function buildWhere(
  where: Record<string, any>,
  whereIn?: Record<string, any[]>,
): { clause: string; params: any[] } {
  const parts: string[] = [];
  const params: any[] = [];

  Object.entries(where ?? {}).forEach(([column, value]) => {
    if (value === null) {
      parts.push(`${column} IS NULL`);
      return;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        parts.push('1 = 0');
        return;
      }
      parts.push(`${column} IN (${value.map(() => '?').join(', ')})`);
      params.push(...value);
      return;
    }
    parts.push(`${column} = ?`);
    params.push(value);
  });

  Object.entries(whereIn ?? {}).forEach(([column, values]) => {
    if (!values || values.length === 0) {
      parts.push('1 = 0');
      return;
    }
    parts.push(`${column} IN (${values.map(() => '?').join(', ')})`);
    params.push(...values);
  });

  return {
    clause: parts.length > 0 ? ` WHERE ${parts.join(' AND ')}` : '',
    params,
  };
}
