import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { CmDoneService } from './cm-done.service';

@Controller('api')
export class CmDoneController {
  constructor(private readonly service: CmDoneService) {}

  /** POST /api/cmdone - kirim email approval. */
  @Post('cmdone')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/cmdone/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('cmdone/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/cmdone/getaccess - eksekusi keputusan approval. */
  @Post('cmdone/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
