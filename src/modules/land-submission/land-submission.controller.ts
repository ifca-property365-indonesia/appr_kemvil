import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { LandSubmissionService } from './land-submission.service';

@Controller('api')
export class LandSubmissionController {
  constructor(private readonly service: LandSubmissionService) {}

  /** POST /api/landsubmission - kirim email approval. */
  @Post('landsubmission')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** POST /api/landsubmission/update - eksekusi keputusan approval. */
  @Post('landsubmission/update')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }

  /** GET /api/landsubmission/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('landsubmission/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }
}
