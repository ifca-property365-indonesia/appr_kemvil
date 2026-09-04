import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandSplitShgbService } from './land-split-shgb.service';

@Controller('api')
export class LandSplitShgbController {
  constructor(private readonly service: LandSplitShgbService) {}

  /** POST /api/landsplitshgb - kirim email approval. */
  @Post('landsplitshgb')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landsplitshgb/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landsplitshgb/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landsplitshgb/getaccess - eksekusi keputusan approval. */
  @Post('landsplitshgb/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
