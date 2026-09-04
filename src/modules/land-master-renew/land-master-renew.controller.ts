import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandMasterRenewService } from './land-master-renew.service';

@Controller('api')
export class LandMasterRenewController {
  constructor(private readonly service: LandMasterRenewService) {}

  /** POST /api/landmasterrenew - kirim email approval. */
  @Post('landmasterrenew')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landmasterrenew/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landmasterrenew/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landmasterrenew/getaccess - eksekusi keputusan approval. */
  @Post('landmasterrenew/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
