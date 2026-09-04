import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { CmProgressService } from './cm-progress.service';

@Controller('api')
export class CmProgressController {
  constructor(private readonly service: CmProgressService) {}

  /** POST /api/cmprogress - kirim email approval. */
  @Post('cmprogress')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/cmprogress/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('cmprogress/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/cmprogress/getaccess - eksekusi keputusan approval. */
  @Post('cmprogress/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
