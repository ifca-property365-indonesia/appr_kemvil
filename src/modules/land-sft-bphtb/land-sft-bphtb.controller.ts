import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandSftBphtbService } from './land-sft-bphtb.service';

@Controller('api')
export class LandSftBphtbController {
  constructor(private readonly service: LandSftBphtbService) {}

  /** POST /api/landsftbphtb - kirim email approval. */
  @Post('landsftbphtb')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landsftbphtb/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landsftbphtb/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landsftbphtb/getaccess - eksekusi keputusan approval. */
  @Post('landsftbphtb/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
