import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandFphService } from './land-fph.service';

@Controller('api')
export class LandFphController {
  constructor(private readonly service: LandFphService) {}

  /** POST /api/landfph - kirim email approval. */
  @Post('landfph')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landfph/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landfph/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landfph/getaccess - eksekusi keputusan approval. */
  @Post('landfph/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }

  /** POST /api/landfph/feedback - email balasan ke pembuat dokumen. */
  @Post('landfph/feedback')
  async feedback(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.feedbackFph(body);
    res.status(callback.Status);
    return callback;
  }
}
