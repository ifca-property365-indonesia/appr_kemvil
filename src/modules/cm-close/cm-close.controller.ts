import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { CmCloseService } from './cm-close.service';

@Controller('api')
export class CmCloseController {
  constructor(private readonly service: CmCloseService) {}

  /** POST /api/cmclose - kirim email approval. */
  @Post('cmclose')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/cmclose/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('cmclose/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/cmclose/getaccess - eksekusi keputusan approval. */
  @Post('cmclose/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
