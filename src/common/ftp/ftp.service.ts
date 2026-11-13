import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'basic-ftp';
import { Readable } from 'stream';

/** Batas tunggu FTP: SP menunggu balasan API, jadi jangan terlalu lama. */
const FTP_TIMEOUT_MS = 10000;

/**
 * Koneksi FTP bersama (FTP_HOST/PORT/PASSWORD, user = FTP_USERNAME + STATUS_PDF).
 * Satu koneksi per pemanggilan, selalu ditutup setelah selesai.
 */
@Injectable()
export class FtpService {
  constructor(private readonly config: ConfigService) {}

  /** Nama seluruh file (bukan folder) di dalam `dir`. */
  async listFiles(dir: string): Promise<string[]> {
    return this.withClient(async (client) => {
      const entries = await client.list(dir);
      return entries.filter((entry) => entry.isFile).map((entry) => entry.name);
    });
  }

  /** Simpan `content` sebagai `dir/fileName` (menimpa bila sudah ada); folder dibuat bila belum ada. */
  async upload(dir: string, fileName: string, content: Buffer): Promise<string> {
    return this.withClient(async (client) => {
      // ensureDir membuat folder bertingkat bila belum ada lalu pindah ke dalamnya.
      await client.ensureDir(dir);
      await client.uploadFrom(Readable.from(content), fileName);
      return `${dir}/${fileName}`;
    });
  }

  private async withClient<T>(action: (client: Client) => Promise<T>): Promise<T> {
    const ftp = this.config.get('ftp');
    const client = new Client(FTP_TIMEOUT_MS);

    try {
      await client.access({
        host: ftp.host,
        port: ftp.port,
        user: ftp.username,
        password: ftp.password,
      });
      return await action(client);
    } finally {
      client.close();
    }
  }
}
