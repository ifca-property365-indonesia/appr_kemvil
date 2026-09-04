import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { MailDataService } from './mail-data.service';

/** Migrasi dari app/Http/Controllers/MailDataController.php */
@Controller('api')
export class MailDataController {
  constructor(private readonly service: MailDataService) {}

  /** POST /api/maildata - dispatch pengiriman email berdasarkan field `module`. */
  @Post('maildata')
  receive(@Body() body: Record<string, any>) {
    return this.service.receive(body);
  }

  /** GET /api/processdata/{module}/{status}/{encrypt} - halaman konfirmasi generic. */
  @Get('processdata/:module/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(
    @Param('module') module: string,
    @Param('status') status: string,
    @Param('encrypt') encrypt: string,
  ) {
    return this.service.processData(module, status, encrypt);
  }

  /** POST /api/getaccess - eksekusi keputusan approval generic. */
  @Post('getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getAccess(@Body() body: Record<string, any>) {
    return this.service.getAccess(body);
  }
}
