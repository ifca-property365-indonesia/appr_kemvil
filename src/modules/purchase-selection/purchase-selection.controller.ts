import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { PurchaseSelectionService } from './purchase-selection.service';

@Controller('api')
export class PurchaseSelectionController {
  constructor(private readonly service: PurchaseSelectionService) {}

  /** POST /api/purchase_selection - kirim email approval. */
  @Post('purchase_selection')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/poselection/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('poselection/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/poselection/getaccess - eksekusi keputusan approval. */
  @Post('poselection/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }

  /** POST /api/pos/getaccess - alias yang dipakai template email lama. */
  @Post('pos/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccessAlias(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
