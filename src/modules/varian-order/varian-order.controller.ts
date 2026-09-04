import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { VarianOrderService } from './varian-order.service';

@Controller('api')
export class VarianOrderController {
  constructor(private readonly service: VarianOrderService) {}

  /** POST /api/varianorder - kirim email approval. */
  @Post('varianorder')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/varianorder/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('varianorder/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/varianorder/getaccess - eksekusi keputusan approval. */
  @Post('varianorder/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
