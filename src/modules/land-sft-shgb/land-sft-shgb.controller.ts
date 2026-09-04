import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandSftShgbService } from './land-sft-shgb.service';

@Controller('api')
export class LandSftShgbController {
  constructor(private readonly service: LandSftShgbService) {}

  /** POST /api/landsftshgb - kirim email approval. */
  @Post('landsftshgb')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landsftshgb/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landsftshgb/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landsftshgb/getaccess - eksekusi keputusan approval. */
  @Post('landsftshgb/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
