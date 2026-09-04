import { Body, Controller, Post } from '@nestjs/common';
import { StaffFeedbackService } from './staff-feedback.service';

/** Migrasi dari app/Http/Controllers/StaffFeedbackController.php */
@Controller('api')
export class StaffFeedbackController {
  constructor(private readonly service: StaffFeedbackService) {}

  @Post('feedback_po')
  feedbackPo(@Body() body: Record<string, any>) {
    return this.service.feedbackPo(body);
  }

  @Post('feedback_cb_fupd')
  feedbackCbFupd(@Body() body: Record<string, any>) {
    return this.service.feedbackCbFupd(body);
  }

  @Post('feedback_cb')
  feedbackCb(@Body() body: Record<string, any>) {
    return this.service.feedbackCb(body);
  }

  @Post('feedback_cm_progress')
  feedbackCmProgress(@Body() body: Record<string, any>) {
    return this.service.feedbackCmProgress(body);
  }
}
