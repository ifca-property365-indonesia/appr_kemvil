import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { StaffActionService } from './staff-action.service';

/** Migrasi dari app/Http/Controllers/StaffActionController.php */
@Controller('api')
export class StaffActionController {
  constructor(private readonly service: StaffActionService) {}

  @Post('staffaction')
  staffaction(@Body() body: Record<string, any>) {
    return this.service.staffaction(body);
  }

  @Post('staffaction_por')
  staffactionPor(@Body() body: Record<string, any>) {
    return this.service.staffactionPor(body);
  }

  @Post('staffaction_pos')
  staffactionPos(@Body() body: Record<string, any>) {
    return this.service.staffactionPos(body);
  }

  @Post('fileexist')
  fileexist(@Body() body: Record<string, any>) {
    return this.service.fileexist(body);
  }

  @Post('feedbackland')
  async feedbackLand(@Body() body: Record<string, any>, @Res({ passthrough: true }) res: Response) {
    const callback = await this.service.feedbackLand(body);
    res.status(callback.Status);
    return callback;
  }

  @Post('feedbacklandrequest')
  async feedbackLandRequest(
    @Body() body: Record<string, any>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const callback = await this.service.feedbackLandRequest(body);
    res.status(callback.Status);
    return callback;
  }
}
