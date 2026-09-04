import { Controller, Get, Query } from '@nestjs/common';
import { OldFeedbackService } from './old-feedback.service';

/** Migrasi dari app/Http/Controllers/OldFeedbackController.php (GET /api/oldfeedback). */
@Controller('api')
export class OldFeedbackController {
  constructor(private readonly service: OldFeedbackService) {}

  @Get('oldfeedback')
  index(@Query('day') day?: string) {
    const parsed = Number(day);
    return this.service.index(Number.isFinite(parsed) && parsed > 0 ? parsed : 16);
  }
}
