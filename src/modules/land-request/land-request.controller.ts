import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandRequestService } from './land-request.service';

@Controller('api')
export class LandRequestController {
  constructor(private readonly service: LandRequestService) {}

  /** POST /api/landrequest - kirim email approval. */
  @Post('landrequest')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landrequest/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landrequest/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landrequest/getaccess - eksekusi keputusan approval. */
  @Post('landrequest/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
