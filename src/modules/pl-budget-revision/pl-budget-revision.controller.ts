import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { PlBudgetRevisionService } from './pl-budget-revision.service';

@Controller('api')
export class PlBudgetRevisionController {
  constructor(private readonly service: PlBudgetRevisionService) {}

  /** POST /api/budgetrevision - kirim email approval. */
  @Post('budgetrevision')
  send(@Body() body: Record<string, any>) {
    return this.service.send(body);
  }

  /** GET /api/budgetrevision/{status}/{encrypt} - halaman konfirmasi dari email. */
  @Get('budgetrevision/:status/:encrypt')
  @Header('Content-Type', 'text/html; charset=utf-8')
  processData(@Param('status') status: string, @Param('encrypt') encrypt: string) {
    return this.service.processData(status, encrypt);
  }

  /** POST /api/budgetrevision/getaccess - eksekusi keputusan approval. */
  @Post('budgetrevision/getaccess')
  @Header('Content-Type', 'text/html; charset=utf-8')
  update(@Body() body: Record<string, any>) {
    return this.service.update(body);
  }
}
