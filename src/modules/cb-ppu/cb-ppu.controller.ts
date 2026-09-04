import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { CbPpuService } from './cb-ppu.service';

@Controller('api')
export class CbPpuController {
  constructor(private readonly service: CbPpuService) {}

  /** POST /api/cbppu - kirim email approval. */
  @Post('cbppu')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/cbppu/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('cbppu/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/cbppu/getaccess - eksekusi keputusan approval. */
  @Post('cbppu/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
