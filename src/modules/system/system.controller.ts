import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ViewService } from '../../common/view/view.service';
import { SystemService } from './system.service';

/**
 * Route utilitas & halaman root.
 *   GET /                      -> halaman welcome (routes/web.php)
 *   GET /check-imap            -> pengecekan ekstensi imap pada versi PHP
 *   GET /api/connect           -> ConnectController::index()
 *   GET /api/info              -> ConnectController::info()
 *   GET /api/env               -> EnvController::index()
 *   GET /api/dbcheck           -> DatabaseConnectionController::checkConnection()
 *   GET /api/select            -> SelController::index()
 *   GET /api/encrypt           -> EncryptController::index() (memang kosong)
 */
@Controller()
export class SystemController {
  constructor(
    private readonly service: SystemService,
    private readonly view: ViewService,
  ) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  welcome() {
    return this.view.render('welcome');
  }

  @Get('check-imap')
  checkImap() {
    // Versi PHP mengecek `function_exists('imap_open')`. Node tidak memakai IMAP
    // pada aplikasi ini, sehingga selalu bernilai false.
    return { imap: false };
  }

  @Get('api/connect')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  connect() {
    return this.service.connect();
  }

  @Get('api/info')
  info() {
    return this.service.info();
  }

  @Get('api/env')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  env() {
    return this.service.env();
  }

  @Get('api/dbcheck')
  async dbcheck(@Res({ passthrough: true }) res: Response) {
    const result = await this.service.checkConnection();
    res.status(result.code);
    return { status: result.status, message: result.message };
  }

  @Get('api/select')
  @Header('Content-Type', 'text/html; charset=utf-8')
  select(@Query() query: Record<string, any>) {
    return this.service.select(query);
  }

  @Get('api/encrypt')
  encrypt() {
    return '';
  }
}
