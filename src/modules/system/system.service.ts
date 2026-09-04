import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../common/database/database.service';
import { AppLoggerService } from '../../common/logger/app-logger.service';
import { ViewService } from '../../common/view/view.service';

/**
 * Gabungan controller kecil pada project Laravel:
 *   - ConnectController            : GET /api/connect, GET /api/info
 *   - EnvController                : GET /api/env
 *   - DatabaseConnectionController : cek koneksi (JSON)
 *   - EncryptController            : GET /api/encrypt (kosong pada versi lama)
 *   - SelController                : GET /api/select
 */
@Injectable()
export class SystemService {
  constructor(
    private readonly db: DatabaseService,
    private readonly view: ViewService,
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
  ) {}

  /** Padanan ConnectController::index(). */
  async connect(): Promise<string> {
    try {
      await this.db.ping();
      return `✅ Berhasil konek ke database: ${this.db.getDatabaseName()}`;
    } catch (err: any) {
      this.logger.channel('daily').error(`Cek koneksi database gagal: ${err?.message ?? err}`);
      return `❌ Gagal konek ke database. Error: ${err?.message ?? err}`;
    }
  }

  /** Padanan EnvController::index(). */
  async env(): Promise<string> {
    try {
      await this.db.ping();
      return 'Connected successfully to database.';
    } catch (err: any) {
      this.logger.channel('daily').error(`Cek koneksi database gagal: ${err?.message ?? err}`);
      return `Could not connect to the database. Please check your configuration. Error: ${err?.message ?? err}`;
    }
  }

  /**
   * Padanan ConnectController::info() yang memanggil `phpinfo()`.
   * Karena tidak ada padanan langsung di Node, yang ditampilkan adalah info
   * runtime dan konfigurasi non-rahasia.
   */
  info(): Record<string, any> {
    return {
      runtime: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime_seconds: Math.round(process.uptime()),
        memory: process.memoryUsage(),
      },
      app: {
        name: this.config.get('app.name'),
        env: this.config.get('app.env'),
        url: this.config.get('app.url'),
        timezone: this.config.get('app.timezone'),
      },
      database: {
        host: this.config.get('database.befa.host'),
        port: this.config.get('database.befa.port'),
        database: this.config.get('database.befa.database'),
      },
      mail: {
        host: this.config.get('mail.host'),
        port: this.config.get('mail.port'),
        from: this.config.get('mail.from'),
      },
      token: this.config.get('token'),
    };
  }

  /** Padanan DatabaseConnectionController::checkConnection(). */
  async checkConnection(): Promise<{ status: string; message: string; code: number }> {
    try {
      await this.db.ping();
      return { status: 'success', message: 'Connected to BEFA database', code: 200 };
    } catch (err: any) {
      this.logger.channel('daily').error(`Cek koneksi database gagal: ${err?.message ?? err}`);
      return { status: 'error', message: err?.message ?? String(err), code: 500 };
    }
  }

  /**
   * Padanan SelController::index() - contoh pengecekan status dokumen.
   * Versi Laravel memakai nilai hardcode dan memuat bug (`$data` tidak
   * terdefinisi); di sini parameternya dibuat dapat dikirim lewat query.
   */
  async select(params: Record<string, any>): Promise<string> {
    const where = {
      doc_no: params.doc_no ?? 'PK24030091',
      entity_cd: params.entity_cd ?? '01',
      level_no: Number(params.level_no ?? 1),
      type: params.type ?? 'Q',
      module: params.module ?? 'PO',
    };
    const text = params.text ?? 'Purchase Requisition';

    const processed = await this.db.exists('mgr.cb_cash_request_appr', where, {
      status: ['A', 'R', 'C'],
    });

    if (processed) {
      return this.view.render('email.after', {
        Pesan: `You Have Already Made a Request to ${text} No. ${where.doc_no}`,
        St: 'OK',
        notif: 'Restricted !',
        image: 'double_approve.png',
      });
    }

    const pending = await this.db.exists('mgr.cb_cash_request_appr', { ...where, status: 'P' });
    if (!pending) {
      return this.view.render('email.after', {
        Pesan: `There is no ${text} with No. ${where.doc_no}`,
        St: 'OK',
        notif: 'Restricted !',
        image: 'double_approve.png',
      });
    }

    return 'OKAY';
  }
}
