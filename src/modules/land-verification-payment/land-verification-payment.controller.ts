import { Body, Controller, Get, Header, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { LandVerificationPaymentService } from './land-verification-payment.service';

@Controller('api')
export class LandVerificationPaymentController {
  constructor(private readonly service: LandVerificationPaymentService) {}

  /** POST /api/landverificationpayment - kirim email approval. */
  @Post('landverificationpayment')
  async index(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.index(body);
    res.status(callback.Status);
    return callback;
  }

  /** GET /api/landverificationpayment/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landverificationpayment/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/landverificationpayment/getaccess - eksekusi keputusan approval. */
  @Post('landverificationpayment/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getaccess(@Body() body: Record<string, any>) {
    return this.service.getaccess(body);
  }
}
