import { Body, Controller, Get, Header, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApprListService } from './appr-list.service';

/**
 * Migrasi dari app/Http/Controllers/ApprListControllers.php
 * Route lama (routes/web.php):
 *   GET  /appr-list
 *   GET  /apprlist/data      (name: apprlist.getData)
 *   POST /apprlist/sendData  (name: apprlist.sendData)
 */
@Controller()
export class ApprListController {
  constructor(private readonly service: ApprListService) {}

  @Get('appr-list')
  @Header('Content-Type', 'text/html; charset=utf-8')
  index() {
    return this.service.index();
  }

  @Get('apprlist/data')
  getData(@Query() query: Record<string, any>) {
    return this.service.getData(query);
  }

  @Post('apprlist/sendData')
  async sendData(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const result = await this.service.sendData(body);
    res.status(result.status);
    return { message: result.message };
  }
}
