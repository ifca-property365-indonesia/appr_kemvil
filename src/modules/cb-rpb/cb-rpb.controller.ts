import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { CbRpbService } from './cb-rpb.service';

@Controller('api')
export class CbRpbController {
  constructor(private readonly service: CbRpbService) {}

  /** POST /api/cbrpb - kirim email approval. */
  @Post('cbrpb')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/cbrpb/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('cbrpb/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/cbrpb/getaccess - eksekusi keputusan approval. */
  @Post('cbrpb/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
