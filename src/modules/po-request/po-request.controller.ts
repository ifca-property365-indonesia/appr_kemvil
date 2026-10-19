import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { PoRequestService } from './po-request.service';

@Controller('api')
export class PoRequestController {
  constructor(private readonly service: PoRequestService) {}

  /** POST /api/maildata - dipanggil SP x_send_mail_approval_po_request. */
  @Post('maildata')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/porequest/{A|M|R}/{token} - halaman konfirmasi dari link email. */
  @Get('porequest/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  confirm(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.confirm(status, encrypt);
  }

  /** POST /api/porequest/getaccess - eksekusi keputusan approval. */
  @Post('porequest/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  execute(@Body() body: Record<string, any>) {
    return this.service.execute(body);
  }
}
