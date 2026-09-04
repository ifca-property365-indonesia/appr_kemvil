import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { PoRequestService } from './po-request.service';

@Controller('api')
export class PoRequestController {
  constructor(private readonly service: PoRequestService) {}

  /** POST /api/porequest - kirim email approval. */
  @Post('porequest')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/porequest/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('porequest/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/porequest/getaccess - eksekusi keputusan approval. */
  @Post('porequest/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
