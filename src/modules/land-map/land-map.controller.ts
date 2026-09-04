import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandMapService } from './land-map.service';

@Controller('api')
export class LandMapController {
  constructor(private readonly service: LandMapService) {}

  /** POST /api/landmap - kirim email approval. */
  @Post('landmap')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landmap/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landmap/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landmap/getaccess - eksekusi keputusan approval. */
  @Post('landmap/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
