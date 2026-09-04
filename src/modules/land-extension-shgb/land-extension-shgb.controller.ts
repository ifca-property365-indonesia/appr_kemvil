import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandExtensionShgbService } from './land-extension-shgb.service';

@Controller('api')
export class LandExtensionShgbController {
  constructor(private readonly service: LandExtensionShgbService) {}

  /** POST /api/landextensionshgb - kirim email approval. */
  @Post('landextensionshgb')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landextensionshgb/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landextensionshgb/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landextensionshgb/getaccess - eksekusi keputusan approval. */
  @Post('landextensionshgb/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
