import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AppLoggerService } from '../logger/app-logger.service';

export interface SmtpConfiguration {
  entity_cd?: string;
  host?: string;
  port?: number | string;
  encryption?: string;
  username?: string;
  password?: string;
  from_address?: string;
  from_name?: string;
  is_fallback?: boolean;
}

/**
 * Padanan app/Services/SmtpConfigService.php.
 *
 * Membaca tabel `mgr.smtp_configuration`:
 *   - getConfigByEntity($entityCd) : konfigurasi milik entity tersebut
 *   - getSmtpConfig()              : fallback ke entity '01'
 *   - bila keduanya tidak ada      : pakai nilai .env
 */
@Injectable()
export class SmtpConfigService {
  private readonly cache = new Map<string, { value: SmtpConfiguration | null; expiredAt: number }>();
  private readonly ttlMs = 60000;

  constructor(
    private readonly db: DatabaseService,
    private readonly logger: AppLoggerService,
  ) {}

  /** Ambil konfigurasi SMTP default (entity_cd = '01'). */
  async getSmtpConfig(): Promise<SmtpConfiguration | null> {
    const config = await this.lookup('01');
    if (config) return { ...config, is_fallback: true };
    return null;
  }

  /** Ambil konfigurasi berdasarkan entity_cd, fallback ke entity '01'. */
  async getConfigByEntity(entityCd?: string): Promise<SmtpConfiguration | null> {
    const code = (entityCd ?? '').trim();
    if (code !== '') {
      const config = await this.lookup(code);
      if (config) return { ...config, is_fallback: false };
    }
    return this.getSmtpConfig();
  }

  private async lookup(entityCd: string): Promise<SmtpConfiguration | null> {
    const cached = this.cache.get(entityCd);
    if (cached && cached.expiredAt > Date.now()) return cached.value;

    let value: SmtpConfiguration | null = null;
    try {
      value = await this.db.first<SmtpConfiguration>(
        'SELECT TOP 1 * FROM mgr.smtp_configuration WHERE entity_cd = ?',
        [entityCd],
      );
    } catch (err: any) {
      // Tabel bisa saja belum ada pada environment tertentu -> pakai .env.
      value = null;
      this.logger
        .channel('sendmail')
        .warn(
          `Gagal membaca mgr.smtp_configuration entity ${entityCd}, memakai konfigurasi .env: ${err?.message ?? err}`,
          { entity_cd: entityCd },
        );
    }

    this.cache.set(entityCd, { value, expiredAt: Date.now() + this.ttlMs });
    return value;
  }
}
