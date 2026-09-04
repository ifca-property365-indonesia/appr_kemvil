import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandMergeShgbService } from './land-merge-shgb.service';

@Controller('api')
export class LandMergeShgbController {
  constructor(private readonly service: LandMergeShgbService) {}

  /** POST /api/landmergeshgb - kirim email approval. */
  @Post('landmergeshgb')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landmergeshgb/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landmergeshgb/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landmergeshgb/getaccess - eksekusi keputusan approval. */
  @Post('landmergeshgb/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
