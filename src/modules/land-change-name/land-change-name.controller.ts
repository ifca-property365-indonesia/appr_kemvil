import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandChangeNameService } from './land-change-name.service';

@Controller('api')
export class LandChangeNameController {
  constructor(private readonly service: LandChangeNameService) {}

  /** POST /api/landchangename - kirim email approval. */
  @Post('landchangename')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landchangename/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landchangename/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landchangename/getaccess - eksekusi keputusan approval. */
  @Post('landchangename/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
