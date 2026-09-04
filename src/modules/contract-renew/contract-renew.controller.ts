import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { ContractRenewService } from './contract-renew.service';

@Controller('api')
export class ContractRenewController {
  constructor(private readonly service: ContractRenewService) {}

  /** POST /api/contractrenew - kirim email approval. */
  @Post('contractrenew')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/contractrenew/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('contractrenew/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/contractrenew/getaccess - eksekusi keputusan approval. */
  @Post('contractrenew/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
