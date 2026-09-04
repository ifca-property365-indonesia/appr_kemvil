import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandCancelNopService } from './land-cancel-nop.service';

@Controller('api')
export class LandCancelNopController {
  constructor(private readonly service: LandCancelNopService) {}

  /** POST /api/landcancelnop - kirim email approval. */
  @Post('landcancelnop')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landcancelnop/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landcancelnop/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landcancelnop/getaccess - eksekusi keputusan approval. */
  @Post('landcancelnop/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
