import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { CbFupdService } from './cb-fupd.service';

@Controller('api')
export class CbFupdController {
  constructor(private readonly service: CbFupdService) {}

  /** POST /api/cbfupb - kirim email approval. */
  @Post('cbfupb')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/cbfupb/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('cbfupb/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/cbfupb/getaccess - eksekusi keputusan approval. */
  @Post('cbfupb/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
