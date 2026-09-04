import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandMasterService } from './land-master.service';

@Controller('api')
export class LandMasterController {
  constructor(private readonly service: LandMasterService) {}

  /** POST /api/landmaster - kirim email approval. */
  @Post('landmaster')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landmaster/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landmaster/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landmaster/getaccess - eksekusi keputusan approval. */
  @Post('landmaster/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
