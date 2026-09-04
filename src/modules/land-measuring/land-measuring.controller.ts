import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandMeasuringService } from './land-measuring.service';

@Controller('api')
export class LandMeasuringController {
  constructor(private readonly service: LandMeasuringService) {}

  /** POST /api/landmeasuring - kirim email approval. */
  @Post('landmeasuring')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landmeasuring/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landmeasuring/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landmeasuring/getaccess - eksekusi keputusan approval. */
  @Post('landmeasuring/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
