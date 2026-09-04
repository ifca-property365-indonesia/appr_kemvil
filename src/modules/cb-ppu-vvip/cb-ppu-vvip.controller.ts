import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { CbPpuVvipService } from './cb-ppu-vvip.service';

@Controller('api')
export class CbPpuVvipController {
  constructor(private readonly service: CbPpuVvipService) {}

  /** POST /api/cbppuvvip - kirim email approval. */
  @Post('cbppuvvip')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/cbppuvvip/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('cbppuvvip/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/cbppuvvip/getaccess - eksekusi keputusan approval. */
  @Post('cbppuvvip/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
