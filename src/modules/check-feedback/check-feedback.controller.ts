import { Controller, Get } from '@nestjs/common';
import { CheckFeedbackService } from './check-feedback.service';

/** Migrasi dari app/Http/Controllers/CheckFeedbackController.php (GET /api/checkfeedback). */
@Controller('api')
export class CheckFeedbackController {
  constructor(private readonly service: CheckFeedbackService) {}

  @Get('checkfeedback')
  index() {
    return this.service.index();
  }
}
