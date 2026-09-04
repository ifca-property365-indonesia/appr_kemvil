/**
 * Padanan dari config/app.php, config/database.php, config/mail.php dan config/logging.php
 * pada project Laravel `approval_befa`.
 */

const str = (value: string | undefined, fallback = ''): string => {
  if (value === undefined || value === null) return fallback;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'null') return fallback;
  // buang tanda kutip yang ikut terbaca dari file .env (contoh: MAIL_FROM_NAME='IFCA SOFTWARE')
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(str(value, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (value: string | undefined, fallback: boolean): boolean => {
  const raw = str(value, '').toLowerCase();
  if (raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw);
};

export interface AppConfig {
  app: {
    name: string;
    env: string;
    key: string;
    debug: boolean;
    url: string;
    port: number;
    timezone: string;
  };
  database: {
    befa: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
      encrypt: boolean;
      trustServerCertificate: boolean;
      poolMax: number;
      requestTimeout: number;
    };
  };
  mail: {
    mailer: string;
    host: string;
    port: number;
    username: string;
    password: string;
    encryption: string;
    from: { address: string; name: string };
    bccFeedback: string[];
  };
  log: {
    channel: string;
    level: string;
    /** Tulis jejak akses HTTP ke channel `request`. */
    http: boolean;
    /** Tangkap return code stored procedure untuk log audit. */
    procReturnCode: boolean;
  };
  token: {
    mode: 'db' | 'inline';
    length: number;
    table: string;
    autoMigrate: boolean;
    ttlDays: number;
  };
  ftp: {
    host: string;
    port: number;
    username: string;
    password: string;
    baseDir: string;
  };
}

export default (): AppConfig => ({
  app: {
    name: str(process.env.APP_NAME, 'Laravel'),
    env: str(process.env.APP_ENV, 'production'),
    key: str(process.env.APP_KEY),
    debug: bool(process.env.APP_DEBUG, false),
    // APP_URL dipakai untuk membangun link Approve/Revise/Cancel di dalam email
    url: str(process.env.APP_URL, 'http://localhost:3000').replace(/\/+$/, ''),
    port: num(process.env.APP_PORT, 3000),
    timezone: str(process.env.APP_TIMEZONE, 'Asia/Jakarta'),
  },
  database: {
    befa: {
      host: str(process.env.DB_HOST2, '127.0.0.1'),
      port: num(process.env.DB_PORT2, 1433),
      database: str(process.env.DB_DATABASE2, 'BEFA'),
      user: str(process.env.DB_USERNAME2, 'mgr'),
      password: str(process.env.DB_PASSWORD2),
      encrypt: bool(process.env.DB_ENCRYPT2, false),
      trustServerCertificate: bool(process.env.DB_TRUST_SERVER_CERTIFICATE2, true),
      poolMax: num(process.env.DB_POOL_MAX, 20),
      requestTimeout: num(process.env.DB_REQUEST_TIMEOUT, 120000),
    },
  },
  mail: {
    mailer: str(process.env.MAIL_MAILER, 'smtp'),
    host: str(process.env.MAIL_HOST, 'localhost'),
    port: num(process.env.MAIL_PORT, 587),
    username: str(process.env.MAIL_USERNAME),
    password: str(process.env.MAIL_PASSWORD),
    encryption: str(process.env.MAIL_ENCRYPTION, 'tls'),
    from: {
      address: str(process.env.MAIL_FROM_ADDRESS, 'no-reply@ifca.co.id'),
      name: str(process.env.MAIL_FROM_NAME, 'IFCA SOFTWARE'),
    },
    bccFeedback: str(process.env.MAIL_BCC_FEEDBACK)
      .split(';')
      .map((item) => item.trim())
      .filter((item) => item !== ''),
  },
  log: {
    channel: str(process.env.LOG_CHANNEL, 'daily'),
    level: str(process.env.LOG_LEVEL, 'debug'),
    http: bool(process.env.LOG_HTTP, true),
    procReturnCode: bool(process.env.DB_PROC_RETURN_CODE, true),
  },
  token: {
    mode: (str(process.env.URL_TOKEN_MODE, 'db') === 'inline' ? 'inline' : 'db') as 'db' | 'inline',
    length: num(process.env.URL_TOKEN_LENGTH, 10),
    table: str(process.env.URL_TOKEN_TABLE, 'mgr.approval_url_token'),
    autoMigrate: bool(process.env.URL_TOKEN_AUTO_MIGRATE, true),
    ttlDays: num(process.env.URL_TOKEN_TTL_DAYS, 0),
  },
  ftp: {
    host: str(process.env.FTP_HOST, 'uat.ifca.co.id'),
    port: num(process.env.FTP_PORT, 2111),
    username: str(process.env.FTP_USERNAME, 'befa'),
    password: str(process.env.FTP_PASSWORD, 'befa'),
    baseDir: str(process.env.FTP_BASE_DIR, 'ifca-att'),
  },
});
