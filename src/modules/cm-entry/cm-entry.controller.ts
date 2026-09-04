import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { CmEntryService } from './cm-entry.service';

@Controller('api')
export class CmEntryController {
  constructor(private readonly service: CmEntryService) {}

  /** POST /api/cmentry - kirim email approval. */
  @Post('cmentry')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/cmentry/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('cmentry/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/cmentry/getaccess - eksekusi keputusan approval. */
  @Post('cmentry/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
