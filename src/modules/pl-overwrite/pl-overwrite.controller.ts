import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { PlOverwriteService } from './pl-overwrite.service';

@Controller('api')
export class PlOverwriteController {
  constructor(private readonly service: PlOverwriteService) {}

  /** POST /api/ploverwrite - kirim email approval. */
  @Post('ploverwrite')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/ploverwrite/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('ploverwrite/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/ploverwrite/getaccess - eksekusi keputusan approval. */
  @Post('ploverwrite/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
