import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { PlBudgetLymanService } from './pl-budget-lyman.service';

@Controller('api')
export class PlBudgetLymanController {
  constructor(private readonly service: PlBudgetLymanService) {}

  /** POST /api/budgetlyman - kirim email approval. */
  @Post('budgetlyman')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/budgetlyman/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('budgetlyman/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/budgetlyman/getaccess - eksekusi keputusan approval. */
  @Post('budgetlyman/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
