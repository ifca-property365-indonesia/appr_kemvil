import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { CmProgresswuService } from './cm-progresswu.service';

@Controller('api')
export class CmProgresswuController {
  constructor(private readonly service: CmProgresswuService) {}

  /** POST /api/cmprogresswu - kirim email approval. */
  @Post('cmprogresswu')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/cmprogresswu/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('cmprogresswu/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/cmprogresswu/getaccess - eksekusi keputusan approval. */
  @Post('cmprogresswu/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
