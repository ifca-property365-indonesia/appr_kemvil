import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandBoundaryService } from './land-boundary.service';

@Controller('api')
export class LandBoundaryController {
  constructor(private readonly service: LandBoundaryService) {}

  /** POST /api/landboundary - kirim email approval. */
  @Post('landboundary')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landboundary/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landboundary/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landboundary/getaccess - eksekusi keputusan approval. */
  @Post('landboundary/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
