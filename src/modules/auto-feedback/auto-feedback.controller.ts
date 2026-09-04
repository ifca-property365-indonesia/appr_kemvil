import { Controller, Get } from '@nestjs/common';
import { AutoFeedbackService } from './auto-feedback.service';

/** Migrasi dari app/Http/Controllers/AutoFeedbackController.php (GET /api/autofeedback). */
@Controller('api')
export class AutoFeedbackController {
  constructor(private readonly service: AutoFeedbackService) {}

  @Get('autofeedback')
  index() {
    return this.service.index();
  }
}
