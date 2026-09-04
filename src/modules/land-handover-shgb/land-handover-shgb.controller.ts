import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandHandoverShgbService } from './land-handover-shgb.service';

@Controller('api')
export class LandHandoverShgbController {
  constructor(private readonly service: LandHandoverShgbService) {}

  /** POST /api/landhandovershgb - kirim email approval. */
  @Post('landhandovershgb')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landhandovershgb/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landhandovershgb/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landhandovershgb/getaccess - eksekusi keputusan approval. */
  @Post('landhandovershgb/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
