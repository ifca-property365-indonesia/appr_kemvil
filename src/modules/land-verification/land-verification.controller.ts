import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandVerificationService } from './land-verification.service';

@Controller('api')
export class LandVerificationController {
  constructor(private readonly service: LandVerificationService) {}

  /** POST /api/landverification - kirim email approval. */
  @Post('landverification')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landverification/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landverification/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landverification/getaccess - eksekusi keputusan approval. */
  @Post('landverification/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }

  /** POST /api/landverification/feedback - email balasan ke pembuat dokumen. */
  @Post('landverification/feedback')
  async feedback(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.feedbackVerification(body);
    res.status(callback.Status);
    return callback;
  }
}
