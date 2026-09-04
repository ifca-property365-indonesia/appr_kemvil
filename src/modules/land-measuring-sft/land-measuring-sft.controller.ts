import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandMeasuringSftService } from './land-measuring-sft.service';

@Controller('api')
export class LandMeasuringSftController {
  constructor(private readonly service: LandMeasuringSftService) {}

  /** POST /api/landmeasuringsft - kirim email approval. */
  @Post('landmeasuringsft')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landmeasuringsft/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landmeasuringsft/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landmeasuringsft/getaccess - eksekusi keputusan approval. */
  @Post('landmeasuringsft/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
