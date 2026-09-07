import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';
import { blade } from '../helpers/blade.helper';

export interface RenderOptions {
  /** Base URL untuk render ini (biasanya origin request). Default: APP_URL. */
  baseUrl?: string;
}

/**
 * Padanan `view('email.cmentry.send', $data)` milik Laravel.
 *
 * Template blade sudah dikonversi ke EJS dan disimpan di folder `views/`
 * dengan struktur direktori yang sama, contoh:
 *   resources/views/email/cmentry/send.blade.php -> views/email/cmentry/send.ejs
 */
@Injectable()
export class ViewService {
  private readonly viewsDir = path.join(process.cwd(), 'views');
  private readonly cache = new Map<string, ejs.TemplateFunction>();

  constructor(private readonly config: ConfigService) {}

  /** Terima nama view gaya Laravel: `email.after`, `email/remark/passcheckwithremark`. */
  resolve(view: string): string {
    const relative = view.replace(/\./g, '/').replace(/\.blade$/, '');
    return path.join(this.viewsDir, `${relative}.ejs`);
  }

  /**
   * `options.baseUrl` menggantikan APP_URL untuk render ini saja, sehingga
   * `url()`, `route()` dan `config('app.url')` mengikuti alamat yang sedang
   * dipakai pengunjung. Dipakai halaman web; email tetap memakai APP_URL
   * karena penerimanya membuka tautan di luar konteks request.
   */
  render(view: string, data: Record<string, any> = {}, options: RenderOptions = {}): string {
    const file = this.resolve(view);
    if (!fs.existsSync(file)) {
      throw new Error(`View [${view}] not found: ${file}`);
    }

    const compiled = this.compile(file);
    return compiled(lenientLocals({ ...this.globals(options.baseUrl), ...data }));
  }

  private compile(file: string): ejs.TemplateFunction {
    const debug = this.config.get<boolean>('app.debug');
    if (!debug && this.cache.has(file)) {
      return this.cache.get(file)!;
    }

    const source = fs.readFileSync(file, 'utf8');
    const compiled = ejs.compile(source, {
      filename: file,
      views: [this.viewsDir],
      rmWhitespace: false,
    });

    this.cache.set(file, compiled);
    return compiled;
  }

  /** Helper global yang tersedia di setiap template (pengganti fungsi PHP/Blade). */
  private globals(baseUrl?: string): Record<string, any> {
    const configured = (this.config.get<string>('app.url') ?? '').replace(/\/+$/, '');
    const appUrl = (baseUrl ?? '').replace(/\/+$/, '') || configured;

    return {
      ...blade({ appUrl, appName: this.config.get<string>('app.name') }),
      // Alamat yang sedang dipakai pengunjung; tersedia langsung di template.
      baseUrl: appUrl,
    };
  }
}

/**
 * EJS memakai `with(locals)`, sehingga variabel yang tidak dikirim controller
 * akan melempar ReferenceError - berbeda dengan Blade yang mencetak string
 * kosong. Proxy ini membuat variabel tak dikenal bernilai undefined, dan
 * mengizinkan penulisan variabel lokal (`hasAttachment`, `counter`) yang
 * dipakai template hasil konversi.
 */
/** Nama internal EJS yang harus tetap diselesaikan ke scope aslinya. */
const EJS_INTERNALS = new Set([
  '__output',
  '__append',
  '__line',
  '__lines',
  '__filename',
  '__stack',
  'escapeFn',
  'include',
  'rethrow',
  'locals',
]);

function lenientLocals(data: Record<string, any>): Record<string, any> {
  const store: Record<string, any> = { ...data };

  return new Proxy(store, {
    has: (target, property) => {
      if (typeof property !== 'string') return false;
      // biarkan nama internal EJS diselesaikan ke scope aslinya
      if (EJS_INTERNALS.has(property)) return false;
      // data & helper template
      if (property in target) return true;
      // biarkan global JS (Number, Math, JSON, Date, ...) tetap dapat dipakai
      if (property in globalThis) return false;
      // sisanya bernilai undefined - meniru perilaku Blade
      return true;
    },
    get: (target, property) => {
      if (property === Symbol.unscopables) return undefined;
      return target[property as string];
    },
    set: (target, property, value) => {
      target[property as string] = value;
      return true;
    },
  });
}
