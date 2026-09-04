import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { CbRumService } from './cb-rum.service';

@Controller('api')
export class CbRumController {
  constructor(private readonly service: CbRumService) {}

  /** POST /api/cbrum - kirim email approval. */
  @Post('cbrum')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/cbrum/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('cbrum/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/cbrum/getaccess - eksekusi keputusan approval. */
  @Post('cbrum/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
