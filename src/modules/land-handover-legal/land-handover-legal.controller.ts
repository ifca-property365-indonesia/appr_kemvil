import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandHandoverLegalService } from './land-handover-legal.service';

@Controller('api')
export class LandHandoverLegalController {
  constructor(private readonly service: LandHandoverLegalService) {}

  /** POST /api/landhandoverlegal - kirim email approval. */
  @Post('landhandoverlegal')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landhandoverlegal/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landhandoverlegal/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landhandoverlegal/getaccess - eksekusi keputusan approval. */
  @Post('landhandoverlegal/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
