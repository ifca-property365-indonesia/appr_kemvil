import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandSphService } from './land-sph.service';

@Controller('api')
export class LandSphController {
  constructor(private readonly service: LandSphService) {}

  /** POST /api/landsph - kirim email approval. */
  @Post('landsph')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landsph/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landsph/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landsph/getaccess - eksekusi keputusan approval. */
  @Post('landsph/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
