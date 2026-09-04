import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { PoOrderService } from './po-order.service';

@Controller('api')
export class PoOrderController {
  constructor(private readonly service: PoOrderService) {}

  /** POST /api/poorder - kirim email approval. */
  @Post('poorder')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/poorder/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('poorder/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/poorder/getaccess - eksekusi keputusan approval. */
  @Post('poorder/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
