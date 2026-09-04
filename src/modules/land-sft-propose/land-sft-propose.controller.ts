import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandSftProposeService } from './land-sft-propose.service';

@Controller('api')
export class LandSftProposeController {
  constructor(private readonly service: LandSftProposeService) {}

  /** POST /api/landsftpropose - kirim email approval. */
  @Post('landsftpropose')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landsftpropose/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landsftpropose/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landsftpropose/getaccess - eksekusi keputusan approval. */
  @Post('landsftpropose/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
